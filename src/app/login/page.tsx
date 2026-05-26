import { redirect } from 'next/navigation'

import { LoginPage } from '@/components/auth/LoginPage'
import { createClient } from '@/lib/supabase/server'

type LoginPageProps = {
  searchParams: Promise<{
    authError?: string | string[]
    next?: string | string[]
  }>
}

function getSafeNextPath(next: string | string[] | undefined) {
  if (typeof next !== 'string' || !next.startsWith('/')) {
    return '/workspace'
  }

  return next.startsWith('//') ? '/workspace' : next
}

export default async function LoginRoute({ searchParams }: LoginPageProps) {
  const [{ authError, next }, supabase] = await Promise.all([
    searchParams,
    createClient(),
  ])
  const safeNextPath = getSafeNextPath(next)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('plan')
      .eq('id', user.id)
      .maybeSingle()

    redirect(profile?.plan ? safeNextPath : '/onboarding/plan')
  }

  return <LoginPage next={safeNextPath} hasAuthError={Boolean(authError)} />
}
