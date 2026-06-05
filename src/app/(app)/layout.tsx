import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'

import { AppShell } from '@/components/app-shell/AppShell'
import { createClient } from '@/lib/supabase/server'
import { getResolvedAvatarUrl, getUserFullName } from '@/lib/supabase/user-metadata'

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
    getUserFullName(user.user_metadata) ??
    user.email?.split('@')[0] ??
    '사용자'
  const avatarUrl = getResolvedAvatarUrl({
    metadata: user.user_metadata,
    profileAvatarUrl: profile?.avatar_url,
  })

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
