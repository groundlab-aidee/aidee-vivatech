'use client'

import Image from 'next/image'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { useState } from 'react'

import { AppSidebar } from '@/components/app-shell/AppSidebar'
import {
  AppShellHeaderProvider,
  defaultAppShellHeader,
  type AppShellHeaderState,
} from '@/components/app-shell/AppShellHeaderContext'
import {
  defaultProjectChatSidebarState,
  ProjectChatSidebarProvider,
  type ProjectChatSidebarState,
} from '@/components/app-shell/ProjectChatSidebarContext'

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
  const pathname = usePathname()
  const initial = user.displayName.trim().charAt(0).toUpperCase() || 'A'
  const tokenCount = user.tokenCount ?? 28
  const [header, setHeader] = useState<AppShellHeaderState>(
    defaultAppShellHeader
  )
  const [projectChatSidebar, setProjectChatSidebar] =
    useState<ProjectChatSidebarState>(defaultProjectChatSidebarState)
  const isProjectChat = pathname.startsWith('/workspace/project/')

  return (
    <AppShellHeaderProvider value={{ header, setHeader }}>
      <ProjectChatSidebarProvider
        value={{
          setSidebarState: setProjectChatSidebar,
          sidebarState: projectChatSidebar,
        }}
      >
        <main className="h-[100svh] overflow-hidden bg-neutral-900 text-neutral-900">
          <div className="flex h-full overflow-hidden bg-neutral-900 lg:rounded-[20px]">
            <AppSidebar />

            <section className="flex h-full min-w-0 flex-1 overflow-hidden p-2 lg:py-[clamp(12px,1.25vw,24px)] lg:pr-[clamp(12px,1.25vw,24px)]">
              <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-[20px] border border-gray-200 bg-white shadow-[0px_24px_60px_0px_rgba(0,0,0,0.10)]">
                {!isProjectChat ? (
                  <header className="flex h-16 shrink-0 items-center justify-between overflow-hidden rounded-t-[20px] border-b border-gray-200 bg-white px-5 py-3 shadow-[0px_12px_40px_-12px_rgba(0,0,0,0.06)] sm:px-8 lg:px-10">
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
                    <div className="hidden min-w-0 flex-1 lg:block">
                      <h1 className="truncate font-['Inter'] text-2xl font-semibold leading-10 text-neutral-900">
                        {header.title}
                      </h1>
                    </div>

                    <div className="ml-auto flex shrink-0 items-center justify-end gap-6">
                      {header.actions ? (
                        <div className="flex items-center gap-2">
                          {header.actions}
                        </div>
                      ) : null}
                      <div className="flex shrink-0 items-center justify-end gap-1">
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

                        <button
                          type="button"
                          aria-label="언어 선택"
                          className="flex h-[clamp(32px,2.083vw,40px)] w-[clamp(76px,5vw,96px)] items-center justify-center gap-2 rounded-xl text-[clamp(14px,0.938vw,18px)] font-semibold leading-6 text-blue-600 transition hover:bg-blue-50"
                        >
                          <span>KOR</span>
                          <Image
                            src="/assets/icons/account/dropdown.svg"
                            alt=""
                            width={12}
                            height={6}
                            unoptimized
                            className="h-1.5 w-3 object-contain"
                          />
                        </button>

                        <div className="flex h-[clamp(32px,2.083vw,40px)] w-[clamp(76px,5vw,96px)] items-center justify-center rounded-xl bg-blue-600 px-[clamp(16px,1.25vw,24px)] text-[clamp(14px,0.938vw,18px)] font-semibold leading-6 text-white">
                          {user.planLabel}
                        </div>
                      </div>
                    </div>
                  </header>
                ) : null}

                <div
                  className={`app-content-scrollbar min-h-0 flex-1 overscroll-contain ${
                    isProjectChat ? 'overflow-hidden' : 'overflow-y-auto'
                  }`}
                >
                  {children}
                </div>
              </div>
            </section>
          </div>
        </main>
      </ProjectChatSidebarProvider>
    </AppShellHeaderProvider>
  )
}
