import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'

import { AppShell } from '@/components/app-shell/AppShell'
import { createClient } from '@/lib/supabase/server'

const planLabels: Record<string, string> = {
  free: 'Free',
  basic: 'Basic',
  pro: 'Pro',
  business: 'Business',
}

function formatPlan(plan: string | null | undefined) {
  if (!plan) {
    return 'Free'
  }

  return planLabels[plan] ?? plan
}

export default async function AppLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?next=/workspace')
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('plan, full_name, avatar_url')
    .eq('id', user.id)
    .maybeSingle()

  if (!profileError && !profile?.plan) {
    redirect('/onboarding/plan')
  }

  const displayName =
    profile?.full_name ??
    user.user_metadata.full_name ??
    user.user_metadata.name ??
    user.email?.split('@')[0] ??
    '사용자'
  const avatarUrl = profile?.avatar_url ?? user.user_metadata.avatar_url ?? null

  return (
    <AppShell
      user={{
        avatarUrl,
        displayName,
        planLabel: formatPlan(profile?.plan),
      }}
    >
      {children}
    </AppShell>
  )
}
