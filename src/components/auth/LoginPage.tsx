import Image from 'next/image'
import { SocialLoginButton } from '@/components/auth/SocialLoginButton'
import type { AppLanguage } from '@/components/i18n/AppLanguageContext'

type LoginPageProps = {
  next?: string
  hasAuthError?: boolean
  language?: AppLanguage
}

const loginCopy = {
  ENG: {
    authError: 'We could not complete the login callback.',
    betaNotice:
      'Only Google login is available during beta testing. Naver and Kakao login will be supported in future updates.',
    start: 'Get started',
    subtitle: 'Multi AI-Agent AX Platform for Product Development',
  },
  KOR: {
    authError: '로그인 콜백을 처리하지 못했습니다.',
    betaNotice:
      '현재 베타 테스트에서는 안정적인 인증 테스트를 위해 Google 로그인만 활성화되어 있습니다. 네이버 및 카카오 로그인은 향후 업데이트를 통해 순차적으로 지원 예정입니다.',
    start: '시작하기',
    subtitle: '제품 디자인 전문 AI 멀티 에이전트 플랫폼',
  },
} as const

export function LoginPage({
  next = '/workspace',
  hasAuthError = false,
  language = 'KOR',
}: LoginPageProps) {
  const copy = loginCopy[language]

  return (
    <main className="h-[100svh] bg-[#F8F9FA] px-4 text-zinc-950">
      <div className="mx-auto flex h-full max-w-[1440px] items-center justify-center">
        <section className="w-full max-w-sm">
          <div className="flex flex-col items-center gap-[27px]">
            <div className="flex flex-col items-center gap-[18px]">
              <Image
                src="/assets/logos/aidee-logo-blue.svg"
                alt="Aidee"
                width={115}
                height={40}
                priority
                className="h-10 w-auto"
                style={{ width: 'auto' }}
              />

              <p className="text-center font-['Pretendard'] text-[14px] font-medium text-neutral-500">
                {copy.subtitle}
              </p>
            </div>

            <div className="mt-[10px]">
              <span className="font-['Pretendard'] text-[14px] font-medium text-neutral-500">
                {copy.start}
              </span>
            </div>

            <div className="flex w-full flex-col gap-[13px]">
              <SocialLoginButton
                provider="google"
                next={next}
                language={language}
              />

              <SocialLoginButton
                provider="naver"
                disabled
                language={language}
              />

              <SocialLoginButton
                provider="kakao"
                disabled
                language={language}
              />
            </div>

            {hasAuthError && (
              <p className="w-full rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-center text-sm font-medium text-red-700">
                {copy.authError}
              </p>
            )}

            <p className="text-center text-sm font-medium font-['Pretendard'] leading-6 text-neutral-500">
              {copy.betaNotice}
            </p>
          </div>
        </section>
      </div>
    </main>
  )
}
