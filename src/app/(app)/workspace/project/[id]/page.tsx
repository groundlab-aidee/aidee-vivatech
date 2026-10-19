import { notFound } from 'next/navigation'

import { ProjectChatContainer } from '@/components/project/ProjectChatContainer'
import type { ChatMessageRecord } from '@/lib/chat/persistence'
import { getProjectForUser, getProjectMessages } from '@/lib/chat/persistence'
import { DEFAULT_STAGE_KEY } from '@/lib/chat/stages'
import { createClient } from '@/lib/supabase/server'
import { getResolvedAvatarUrl } from '@/lib/supabase/user-metadata'
import { STEP5_FORMS, STEP5_SHAPES } from '@/components/project/Step5CombinationGrid'

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
  const requirements = project.requirements && typeof project.requirements === 'object'
    ? project.requirements as Record<string, unknown>
    : {}
  const savedCombination = requirements.step5Combination && typeof requirements.step5Combination === 'object'
    ? requirements.step5Combination as Record<string, unknown>
    : {}
  const initialStep5Combination = STEP5_SHAPES.includes(savedCombination.shape as typeof STEP5_SHAPES[number]) && STEP5_FORMS.includes(savedCombination.form as typeof STEP5_FORMS[number])
    ? { shape: savedCombination.shape as string, form: savedCombination.form as string }
    : null
  const initialStep5CombinationHistory = Array.isArray(requirements.step5CombinationHistory)
    ? requirements.step5CombinationHistory.filter((entry): entry is { shape: string; form: string } => {
        if (!entry || typeof entry !== 'object') return false
        const combination = entry as { shape?: string; form?: string }
        return STEP5_SHAPES.includes(combination.shape as typeof STEP5_SHAPES[number]) && STEP5_FORMS.includes(combination.form as typeof STEP5_FORMS[number])
      })
    : []
  const { data: profile } = await supabase
    .from('profiles')
    .select('plan, avatar_url')
    .eq('id', user.id)
    .maybeSingle()

  return (
    <ProjectChatContainer
      initialMessages={messages}
      initialStep5Combination={initialStep5Combination}
      initialStep5CombinationHistory={initialStep5CombinationHistory}
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
    />
  )
}
