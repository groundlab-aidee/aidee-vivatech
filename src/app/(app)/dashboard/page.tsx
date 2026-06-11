import { DashboardContent } from '@/components/dashboard/DashboardContent'
import type { DashboardProject } from '@/components/dashboard/ProjectsCard'
import { getMessageStage } from '@/lib/chat/persistence'
import {
  DEFAULT_STAGE_KEY,
  type StageKey,
} from '@/lib/chat/stages'
import { createClient } from '@/lib/supabase/server'

type ProjectRow = {
  created_at: string
  id: string
  is_favorite?: boolean | null
  requirements: unknown
  title: string | null
}

function getStringFromPath(value: unknown, path: string[]) {
  let current = value

  for (const key of path) {
    if (!current || typeof current !== 'object') {
      return undefined
    }

    current = (current as Record<string, unknown>)[key]
  }

  return typeof current === 'string' ? current : undefined
}

function mapProject(
  row: ProjectRow,
  stageKey: StageKey = DEFAULT_STAGE_KEY
): DashboardProject {
  return {
    createdAt: row.created_at,
    id: row.id,
    isFavorite: row.is_favorite === true,
    stageKey,
    title:
      row.title ||
      getStringFromPath(row.requirements, ['generated', 'title']) ||
      '새 프로젝트',
  }
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const projectsQuery = user
    ? await supabase
        .from('projects')
        .select('id, title, created_at, requirements, is_favorite')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
    : { data: [], error: null }
  const { data, error } =
    user &&
    (projectsQuery.error?.code === 'PGRST204' ||
      (projectsQuery.error?.code === '42703' &&
        /is_favorite/i.test(projectsQuery.error.message)))
      ? await supabase
          .from('projects')
          .select('id, title, created_at, requirements')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
      : projectsQuery

  if (error) {
    console.warn('Failed to load dashboard projects.', {
      code: error.code,
      hint: error.hint,
      message: error.message,
    })
  }

  const projectRows = (data ?? []) as ProjectRow[]
  const projectIds = projectRows.map((project) => project.id)
  const messagesResult =
    user && projectIds.length > 0
      ? await supabase
          .from('messages')
          .select('project_id, content, seq_order, created_at')
          .eq('role', 'assistant')
          .in('project_id', projectIds)
          .order('seq_order', { ascending: false })
          .order('created_at', { ascending: false })
      : { data: [], error: null }

  if (messagesResult.error) {
    console.warn('Failed to load dashboard project stages.', {
      code: messagesResult.error.code,
      hint: messagesResult.error.hint,
      message: messagesResult.error.message,
    })
  }

  const stageByProjectId = new Map<string, StageKey>()

  for (const message of messagesResult.data ?? []) {
    if (!stageByProjectId.has(message.project_id)) {
      stageByProjectId.set(message.project_id, getMessageStage(message.content))
    }
  }

  const dashboardProjects = projectRows.map((project) =>
    mapProject(project, stageByProjectId.get(project.id))
  )

  return <DashboardContent projects={dashboardProjects} />
}
