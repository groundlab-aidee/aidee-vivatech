import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { LoginPage } from '@/components/auth/LoginPage'
import type { AppLanguage } from '@/components/i18n/AppLanguageContext'
import { createClient } from '@/lib/supabase/server'

type LoginPageProps = {
  searchParams: Promise<{
    authError?: string | string[]
    lang?: string | string[]
    next?: string | string[]
  }>
}

function resolveLoginLanguage(
  lang: string | string[] | undefined,
  acceptLanguage: string | null
): AppLanguage {
  const explicitLanguage = typeof lang === 'string' ? lang.toLowerCase() : null

  if (explicitLanguage === 'en' || explicitLanguage === 'eng') {
    return 'ENG'
  }

  if (explicitLanguage === 'ko' || explicitLanguage === 'kor') {
    return 'KOR'
  }

  const preferredLanguage = acceptLanguage
    ?.split(',')[0]
    ?.trim()
    .toLowerCase()

  return preferredLanguage?.startsWith('en') ? 'ENG' : 'KOR'
}

function getSafeNextPath(next: string | string[] | undefined) {
  if (typeof next !== 'string' || !next.startsWith('/')) {
    return '/workspace'
  }

  return next.startsWith('//') ? '/workspace' : next
}

export default async function LoginRoute({ searchParams }: LoginPageProps) {
  const [{ authError, lang, next }, requestHeaders, supabase] = await Promise.all([
    searchParams,
    headers(),
    createClient(),
  ])
  const safeNextPath = getSafeNextPath(next)
  const language = resolveLoginLanguage(
    lang,
    requestHeaders.get('accept-language')
  )
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

  return (
    <LoginPage
      next={safeNextPath}
      hasAuthError={Boolean(authError)}
      language={language}
    />
  )
}
