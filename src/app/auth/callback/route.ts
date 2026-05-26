import { type NextRequest, NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'

function getSafeNextPath(next: string | null) {
  if (!next || !next.startsWith('/')) {
    return '/workspace'
  }

  return next.startsWith('//') ? '/workspace' : next
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const safeNextPath = getSafeNextPath(requestUrl.searchParams.get('next'))

  if (!code) {
    return NextResponse.redirect(
      new URL('/login?authError=missing_code', requestUrl.origin)
    )
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(
      new URL('/login?authError=oauth_callback_failed', requestUrl.origin)
    )
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.redirect(
      new URL('/login?authError=user_fetch_failed', requestUrl.origin)
    )
  }

  const { error: profileError } = await supabase.from('profiles').upsert(
    {
      id: user.id,
      email: user.email ?? null,
      full_name: user.user_metadata.full_name ?? user.user_metadata.name ?? null,
      avatar_url: user.user_metadata.avatar_url ?? null,
      provider: user.app_metadata.provider ?? 'google',
    },
    {
      onConflict: 'id',
    }
  )

  if (profileError) {
    console.error('Failed to prepare OAuth profile.', {
      code: profileError.code,
      message: profileError.message,
      details: profileError.details,
      hint: profileError.hint,
    })

    return NextResponse.redirect(
      new URL('/login?authError=profile_sync_failed', requestUrl.origin)
    )
  }

  const { data: profile, error: planError } = await supabase
    .from('profiles')
    .select('plan')
    .eq('id', user.id)
    .maybeSingle()

  if (planError) {
    console.error('Failed to inspect OAuth profile plan.', {
      code: planError.code,
      message: planError.message,
      details: planError.details,
      hint: planError.hint,
    })
  }

  return NextResponse.redirect(
    new URL(profile?.plan ? safeNextPath : '/onboarding/plan', requestUrl.origin)
  )
}
