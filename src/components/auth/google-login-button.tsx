'use client'

import { useState, useTransition } from 'react'

import { createClient } from '@/lib/supabase/client'

type GoogleLoginButtonProps = {
  nextPath?: string
}

export function GoogleLoginButton({
  nextPath = '/dashboard',
}: GoogleLoginButtonProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function signIn() {
    startTransition(async () => {
      setErrorMessage(null)

      const redirectTo = new URL('/auth/callback', window.location.origin)
      redirectTo.searchParams.set('next', nextPath)

      const { error } = await createClient().auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectTo.toString(),
          queryParams: {
            prompt: 'select_account',
          },
        },
      })

      if (error) {
        setErrorMessage('Google 로그인 시작에 실패했습니다.')
      }
    })
  }

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={signIn}
        disabled={isPending}
        className="flex h-14 w-full items-center justify-center gap-3 rounded-lg border border-zinc-300 bg-white px-5 text-base font-semibold text-zinc-950 shadow-sm transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className="flex size-6 items-center justify-center rounded-full border border-zinc-200 text-sm font-bold text-zinc-700">
          G
        </span>
        {isPending ? 'Google로 이동 중...' : 'Google로 계속하기'}
      </button>

      {errorMessage ? (
        <p className="mt-2 text-sm text-red-600">{errorMessage}</p>
      ) : null}
    </div>
  )
}
