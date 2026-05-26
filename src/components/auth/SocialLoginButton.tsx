'use client'

import Image from 'next/image'

import { createClient } from '@/lib/supabase/client'

type Provider = 'google' | 'naver' | 'kakao'

type SocialLoginButtonProps = {
  provider: Provider
  next?: string
  disabled?: boolean
}

const providerConfig = {
  google: {
    label: 'Google로 계속하기',
    icon: '/assets/icons/google-icon.svg',
  },
  naver: {
    label: '네이버로 계속하기',
    icon: '/assets/icons/naver-icon.svg',
  },
  kakao: {
    label: '카카오로 계속하기',
    icon: '/assets/icons/kakao-icon.svg',
  },
} as const

export function SocialLoginButton({
  provider,
  next = '/workspace',
  disabled = false,
}: SocialLoginButtonProps) {
  const config = providerConfig[provider]

  const handleClick = async () => {
    if (disabled || provider !== 'google') return

    const supabase = createClient()
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin

    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent(next)}`,
        queryParams: {
          prompt: 'select_account',
        },
      },
    })
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className="relative flex h-15 w-full items-center justify-center rounded-full border border-zinc-200 bg-white text-sm font-semibold text-zinc-900 shadow-sm transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <div className="flex items-center justify-center gap-3">
        <Image
          src={config.icon}
          alt=""
          width={24}
          height={24}
          className="h-6 w-6"
        />

        <span>{config.label}</span>
      </div>
    </button>
  )
}
