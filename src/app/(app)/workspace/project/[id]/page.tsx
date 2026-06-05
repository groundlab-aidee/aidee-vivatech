import { notFound } from 'next/navigation'

import { ProjectChatContainer } from '@/components/project/ProjectChatContainer'
import type { ChatMessageRecord } from '@/lib/chat/persistence'
import { getProjectForUser, getProjectMessages } from '@/lib/chat/persistence'
import { DEFAULT_STAGE_KEY } from '@/lib/chat/stages'
import { createClient } from '@/lib/supabase/server'
import { getResolvedAvatarUrl } from '@/lib/supabase/user-metadata'

type ProjectPageProps = {
  params: Promise<{
    id: string
  }>
  searchParams?: Promise<{
    isNew?: string
  }>
}

function getInitialStageFromMessages(messages: ChatMessageRecord[]) {
  return [...messages].reverse().find((message) => message.role === 'assistant')
    ?.stageKey ?? DEFAULT_STAGE_KEY
}

const planLabels: Record<string, string> = {
  basic: 'Basic',
  business: 'Business',
  free: 'Free',
  pro: 'Pro',
}

function formatPlan(plan: string | null | undefined) {
  if (!plan) {
    return 'Free'
  }

  return planLabels[plan] ?? plan
}

export default async function WorkspaceProjectPage({
  params,
  searchParams,
}: ProjectPageProps) {
  const { id } = await params
  const resolvedSearchParams = searchParams ? await searchParams : {}
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    notFound()
  }

  const project = await getProjectForUser({
    projectId: id,
    supabase,
    userId: user.id,
  })

  if (!project) {
    notFound()
  }

  const messages = await getProjectMessages({
    projectId: project.id,
    supabase,
  })
  const { data: profile } = await supabase
    .from('profiles')
    .select('plan, avatar_url')
    .eq('id', user.id)
    .maybeSingle()

  return (
    <ProjectChatContainer
      initialMessages={messages}
      initialStageKey={getInitialStageFromMessages(messages)}
      isNewProject={resolvedSearchParams.isNew === 'true'}
      projectId={project.id}
      projectTitle={project.title || '새 프로젝트'}
      initialIsFavorite={project.is_favorite === true}
      userAvatarUrl={getResolvedAvatarUrl({
        metadata: user.user_metadata,
        profileAvatarUrl: profile?.avatar_url,
      })}
      userPlanLabel={formatPlan(profile?.plan)}
      userTokenCount={28}
    />
  )
}
