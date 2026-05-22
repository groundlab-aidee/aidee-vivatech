import { type NextRequest, NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'

function getSafeNextPath(value: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) {
    return '/dashboard'
  }

  return value
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const nextPath = getSafeNextPath(requestUrl.searchParams.get('next'))

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

  return NextResponse.redirect(new URL(nextPath, requestUrl.origin))
}
