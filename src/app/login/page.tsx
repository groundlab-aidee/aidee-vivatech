import { redirect } from 'next/navigation'

import { GoogleLoginButton } from '@/components/auth/google-login-button'
import { createClient } from '@/lib/supabase/server'

function getSafeNextPath(value: string | string[] | undefined) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) {
    return '/dashboard'
  }

  return value
}

type LoginPageProps = {
  searchParams: Promise<{
    authError?: string | string[]
    next?: string | string[]
  }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const [{ authError, next }, supabase] = await Promise.all([
    searchParams,
    createClient(),
  ])
  const safeNextPath = getSafeNextPath(next)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect(safeNextPath)
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-100 px-6 text-zinc-950">
      <section className="w-full max-w-md">
        <div className="mb-8 space-y-3">
          <p className="text-sm font-medium text-zinc-500">Aidee</p>
          <h1 className="text-3xl font-semibold">제품 디자인 작업을 시작하세요.</h1>
          <p className="text-sm leading-6 text-zinc-600">
            새 Aidee workspace의 인증 기준선을 먼저 연결합니다.
          </p>
        </div>

        <GoogleLoginButton nextPath={safeNextPath} />

        {authError ? (
          <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            로그인 콜백을 처리하지 못했습니다. Supabase와 Google OAuth 설정을
            확인하세요.
          </p>
        ) : null}
      </section>
    </main>
  )
}
