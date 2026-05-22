import { redirect } from 'next/navigation'

import { LoginPage } from '@/components/auth/LoginPage'
import { createClient } from '@/lib/supabase/server'

type LoginPageProps = {
  searchParams: Promise<{
    authError?: string | string[]
  }>
}

export default async function LoginRoute({ searchParams }: LoginPageProps) {
  const [{ authError }, supabase] = await Promise.all([
    searchParams,
    createClient(),
  ])
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect('/workspace')
  }

  return <LoginPage hasAuthError={Boolean(authError)} />
}
