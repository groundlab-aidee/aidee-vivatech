import { WorkspaceHome } from '@/components/workspace/WorkspaceHome'
import type { WorkspaceProject } from '@/components/workspace/WorkspaceHome'
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

function mapProject(row: ProjectRow): WorkspaceProject {
  const title =
    row.title ||
    getStringFromPath(row.requirements, ['generated', 'title']) ||
    '새 프로젝트'

  return {
    createdAt: row.created_at,
    id: row.id,
    isFavorite: row.is_favorite === true,
    recommendedStage: getStringFromPath(row.requirements, [
      'generated',
      'recommendedStage',
    ]),
    summary: getStringFromPath(row.requirements, ['generated', 'summary']),
    title,
  }
}

export default async function WorkspacePage() {
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
        .limit(12)
    : { data: [], error: null }
  const { data: projects, error } =
    user &&
    (projectsQuery.error?.code === 'PGRST204' ||
      (projectsQuery.error?.code === '42703' &&
        /is_favorite/i.test(projectsQuery.error.message)))
      ? await supabase
          .from('projects')
          .select('id, title, created_at, requirements')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(12)
      : projectsQuery

  if (error) {
    console.warn('Failed to load workspace projects.', {
      code: error.code,
      hint: error.hint,
      message: error.message,
    })
  }

  return <WorkspaceHome projects={(projects ?? []).map(mapProject)} />
}
