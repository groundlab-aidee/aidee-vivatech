import Image from 'next/image'
import { SocialLoginButton } from '@/components/auth/SocialLoginButton'

type LoginPageProps = {
  next?: string
  hasAuthError?: boolean
}

export function LoginPage({
  next = '/dashboard',
  hasAuthError = false,
}: LoginPageProps) {
  return (
    <main className="h-[100svh] bg-[#F8F9FA] px-4 text-zinc-950">
      <div className="mx-auto flex h-full max-w-[1440px] items-center justify-center">
        <section className="w-full max-w-[430px]">
          <div className="flex flex-col items-center gap-[27px]">

            {/* logo + subtitle */}
            <div className="flex flex-col items-center gap-[18px]">
              <Image
                src="/assets/logos/aidee-logo-blue.svg"
                alt="Aidee"
                width={172}
                height={60}
                priority
                className="h-[60px] w-auto"
              />

              <p className="text-center font-['Pretendard'] text-[14px] font-medium text-neutral-500">
                제품 디자인 전문 AI 멀티 에이전트 플랫폼
              </p>
            </div>

            {/* 시작하기 */}
            <div className="mt-[10px]">
              <span className="font-['Pretendard'] text-[14px] font-medium text-neutral-500">
                시작하기
              </span>
            </div>

            {/* buttons */}
            <div className="flex w-full flex-col gap-[13px]">
              <SocialLoginButton
                provider="google"
                next={next}
              />

              <SocialLoginButton
                provider="naver"
                disabled
              />

              <SocialLoginButton
                provider="kakao"
                disabled
              />
            </div>

            {hasAuthError && (
              <p className="w-full rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-center text-sm font-medium text-red-700">
                로그인 콜백을 처리하지 못했습니다.
              </p>
            )}

            <p className="text-center text-sm font-medium font-['Pretendard'] leading-6 text-neutral-500">
              현재 베타 테스트에서는 안정적인 인증 테스트를 위해
              Google 로그인만 활성화되어 있습니다.
              네이버 및 카카오 로그인은 향후 업데이트를 통해
              순차적으로 지원 예정입니다.
            </p>

          </div>
        </section>
      </div>
    </main>
  )
}