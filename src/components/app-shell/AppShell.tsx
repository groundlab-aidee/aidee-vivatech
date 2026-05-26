import Image from 'next/image'
import type { ReactNode } from 'react'

import { AppSidebar } from '@/components/app-shell/AppSidebar'

type AppShellProps = {
  children: ReactNode
  user: {
    avatarUrl?: string | null
    displayName: string
    planLabel: string
    tokenCount?: number
  }
}

export function AppShell({ children, user }: AppShellProps) {
  const initial = user.displayName.trim().charAt(0).toUpperCase() || 'A'
  const tokenCount = user.tokenCount ?? 28

  return (
    <main className="min-h-[100svh] overflow-hidden bg-neutral-900 text-neutral-900">
      <div className="flex min-h-[100svh] bg-neutral-900 lg:rounded-[20px]">
        <AppSidebar />

        <section className="flex min-h-[100svh] flex-1 overflow-hidden p-2 lg:py-[clamp(12px,1.25vw,24px)] lg:pr-[clamp(12px,1.25vw,24px)]">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[20px] border border-gray-200 bg-white shadow-[0px_24px_60px_0px_rgba(0,0,0,0.10)]">
            <header className="flex h-[clamp(52px,3.75vw,72px)] shrink-0 items-center justify-between border-b border-gray-200 bg-white px-5 py-2 shadow-[0px_12px_40px_-12px_rgba(0,0,0,0.06)] sm:px-8 lg:px-[clamp(24px,2.083vw,40px)]">
              <div className="flex items-center gap-3 lg:hidden">
                <Image
                  src="/assets/logos/aidee-logo-blue.svg"
                  alt="Aidee"
                  width={112}
                  height={40}
                  priority
                  unoptimized
                  className="h-10 w-28 object-contain"
                  style={{ width: '112px', height: '40px' }}
                />
              </div>
              <div className="hidden w-[clamp(240px,20vw,384px)] lg:block" />

              <div className="ml-auto flex items-center justify-start gap-[clamp(14px,1.25vw,24px)]">
                <div className="flex w-[clamp(176px,11.667vw,224px)] items-center justify-start gap-1">
                  <div className="relative h-[clamp(32px,2.083vw,40px)] w-[clamp(32px,2.083vw,40px)] shrink-0 overflow-hidden rounded-3xl bg-green-200">
                    {user.avatarUrl ? (
                      <Image
                        src={user.avatarUrl}
                        alt=""
                        width={40}
                        height={40}
                        className="h-full w-full object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-sm font-bold text-green-900">
                        {initial}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-center gap-2 rounded-xl px-2.5 py-2">
                    <Image
                      src="/assets/icons/account/token.svg"
                      alt=""
                      width={24}
                      height={24}
                      unoptimized
                      className="h-6 w-6"
                    />
                    <span className="text-[clamp(14px,0.938vw,18px)] font-semibold leading-6 text-blue-600">
                      {tokenCount}
                    </span>
                  </div>

                  <div className="flex h-[clamp(32px,2.083vw,40px)] w-[clamp(76px,5vw,96px)] items-center justify-center rounded-xl bg-blue-600 px-[clamp(16px,1.25vw,24px)] text-[clamp(14px,0.938vw,18px)] font-semibold leading-6 text-white">
                    {user.planLabel}
                  </div>
                </div>
              </div>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
          </div>
        </section>
      </div>
    </main>
  )
}
