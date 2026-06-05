import { notFound } from 'next/navigation'

import { ProjectChatContainer } from '@/components/project/ProjectChatContainer'
import type { ChatMessageRecord } from '@/lib/chat/persistence'
import { getProjectForUser, getProjectMessages } from '@/lib/chat/persistence'
import { DEFAULT_STAGE_KEY } from '@/lib/chat/stages'
import { createClient } from '@/lib/supabase/server'

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

  return (
    <ProjectChatContainer
      initialMessages={messages}
      initialStageKey={getInitialStageFromMessages(messages)}
      isNewProject={resolvedSearchParams.isNew === 'true'}
      projectId={project.id}
      projectTitle={project.title || '새 프로젝트'}
      userAvatarUrl={
        typeof user.user_metadata.avatar_url === 'string'
          ? user.user_metadata.avatar_url
          : null
      }
    />
  )
}
