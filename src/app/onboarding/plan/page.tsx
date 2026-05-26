import { redirect } from 'next/navigation'

import {
  PlanSelector,
  type PlanId,
  type PlanSelectionResult,
} from '@/components/onboarding/PlanSelector'
import { createClient } from '@/lib/supabase/server'

const planIds = new Set<PlanId>(['free', 'basic', 'pro', 'business'])

export default async function OnboardingPlanPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('plan')
    .eq('id', user.id)
    .maybeSingle()

  if (error) {
    logProfileError('Failed to load onboarding profile plan.', error)
    throw new Error('프로필 플랜 정보를 불러오지 못했습니다.')
  }

  if (profile?.plan) {
    redirect('/workspace')
  }

  async function selectPlanAction(
    plan: PlanId
  ): Promise<PlanSelectionResult | void> {
    'use server'

    if (!planIds.has(plan)) {
      return { error: '선택할 수 없는 플랜입니다.' }
    }

    const actionSupabase = await createClient()
    const {
      data: { user: actionUser },
    } = await actionSupabase.auth.getUser()

    if (!actionUser) {
      redirect('/login')
    }

    const { data: currentProfile, error: profileError } = await actionSupabase
      .from('profiles')
      .select('plan')
      .eq('id', actionUser.id)
      .maybeSingle()

    if (profileError) {
      logProfileError('Failed to inspect onboarding profile plan.', profileError)
      return { error: '현재 플랜 상태를 확인하지 못했습니다.' }
    }

    if (currentProfile?.plan) {
      redirect('/workspace')
    }

    const { data: updatedProfile, error: updateError } = await actionSupabase
      .from('profiles')
      .update({
        plan,
        plan_selected_at: new Date().toISOString(),
      })
      .eq('id', actionUser.id)
      .select('id')
      .maybeSingle()

    if (updateError || !updatedProfile) {
      logProfileError('Failed to save onboarding profile plan.', updateError)
      return { error: '플랜을 저장하지 못했습니다. 다시 시도해 주세요.' }
    }

    redirect('/workspace')
  }

  return (
    <main className="min-h-[100svh] bg-zinc-100 px-4 py-12 text-zinc-950 sm:px-6 lg:py-[213px]">
      <section className="mx-auto flex w-full max-w-[1440px] flex-col">
        <PlanSelector selectPlanAction={selectPlanAction} />
      </section>
    </main>
  )
}

function logProfileError(message: string, error: ProfileQueryError | null) {
  console.error(message, {
    code: error?.code,
    message: error?.message,
    details: error?.details,
    hint: error?.hint,
  })
}

type ProfileQueryError = {
  code?: string
  message?: string
  details?: string
  hint?: string
}
