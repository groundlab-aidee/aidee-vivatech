'use client'

import Image from 'next/image'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'

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
import {
  AppLanguageProvider,
  useAppLanguage,
  type AppLanguage,
} from '@/components/i18n/AppLanguageContext'

type AppShellProps = {
  children: ReactNode
  user: {
    avatarUrl?: string | null
    displayName: string
    planLabel: string
    tokenCount?: number
  }
}

const languages: Array<{ label: string; value: AppLanguage }> = [
  { label: 'English', value: 'ENG' },
  { label: '한국어', value: 'KOR' },
]

function LanguageDropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const { language, setLanguage } = useAppLanguage()
  const [menuPosition, setMenuPosition] = useState({ left: 0, top: 0 })
  const containerRef = useRef<HTMLDivElement | null>(null)
  const buttonRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (!isOpen) {
      return
    }

    function updateMenuPosition() {
      const button = buttonRef.current

      if (!button) {
        return
      }

      const rect = button.getBoundingClientRect()
      setMenuPosition({
        left: Math.max(12, rect.right - 176),
        top: rect.bottom + 8,
      })
    }

    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false)
        buttonRef.current?.focus()
      }
    }

    updateMenuPosition()
    window.addEventListener('resize', updateMenuPosition)
    window.addEventListener('scroll', updateMenuPosition, true)
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('resize', updateMenuPosition)
      window.removeEventListener('scroll', updateMenuPosition, true)
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-label={language === 'ENG' ? 'Select language' : '언어 선택'}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
        className="flex h-[clamp(32px,2.083vw,40px)] w-[clamp(76px,5vw,96px)] items-center justify-center gap-2 rounded-xl text-[clamp(14px,0.938vw,18px)] font-semibold leading-6 text-blue-600 transition hover:bg-blue-50"
      >
        <span>{language}</span>
        <Image
          src="/assets/icons/account/dropdown.svg"
          alt=""
          width={14}
          height={8}
          unoptimized
          className={`h-2 w-3.5 object-contain transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen ? (
        <div
          role="menu"
          aria-label={language === 'ENG' ? 'Select language' : '언어 선택'}
          className="fixed z-50 flex w-44 flex-col overflow-hidden rounded-[20px] bg-white shadow-[0px_3px_4px_0px_rgba(0,0,0,0.10)] outline outline-[3px] outline-offset-[-3px] outline-gray-100"
          style={menuPosition}
        >
          {languages.map((item) => (
            <button
              key={item.value}
              type="button"
              role="menuitemradio"
              aria-checked={language === item.value}
              onClick={() => {
                setLanguage(item.value)
                setIsOpen(false)
              }}
              className="flex h-12 w-full items-center rounded-[20px] px-5 py-3 text-left font-['Inter'] text-sm font-semibold leading-6 text-zinc-500 transition hover:bg-gray-200 hover:text-blue-600 focus-visible:bg-gray-200 focus-visible:text-blue-600 focus-visible:outline-none"
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export function AppShell({ children, user }: AppShellProps) {
  const pathname = usePathname()
  const initial = user.displayName.trim().charAt(0).toUpperCase() || 'A'
  const tokenCount = user.tokenCount ?? 400
  const [header, setHeader] = useState<AppShellHeaderState>(
    defaultAppShellHeader
  )
  const [projectChatSidebar, setProjectChatSidebar] =
    useState<ProjectChatSidebarState>(defaultProjectChatSidebarState)
  const isProjectChat = pathname.startsWith('/workspace/project/')
  const isDashboard = pathname.startsWith('/dashboard')

  return (
    <AppLanguageProvider>
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
                        width={115}
                        height={40}
                        priority
                        unoptimized
                        className="h-10 w-auto object-contain"
                        style={{ width: 'auto' }}
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
                        <div className="relative h-[clamp(32px,2.083vw,40px)] w-[clamp(32px,2.083vw,40px)] shrink-0 overflow-hidden rounded-full bg-green-200">
                          {user.avatarUrl ? (
                            <Image
                              src={user.avatarUrl}
                              alt=""
                              width={40}
                              height={40}
                              className="h-full w-full object-cover"
                              referrerPolicy="no-referrer"
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

                        <LanguageDropdown />

                        <div className="flex h-[clamp(32px,2.083vw,40px)] w-[clamp(76px,5vw,96px)] items-center justify-center rounded-xl bg-blue-600 px-[clamp(16px,1.25vw,24px)] text-[clamp(14px,0.938vw,18px)] font-semibold leading-6 text-white">
                          {user.planLabel}
                        </div>
                      </div>
                    </div>
                  </header>
                ) : null}

                <div
                  className={`app-content-scrollbar min-h-0 flex-1 overscroll-contain ${
                    isProjectChat || isDashboard
                      ? 'overflow-hidden'
                      : 'overflow-y-auto'
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
    </AppLanguageProvider>
  )
}
