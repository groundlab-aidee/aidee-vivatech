'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { useProjectChatSidebar } from '@/components/app-shell/ProjectChatSidebarContext'
import type { ExpertKey } from '@/lib/chat/experts'
import type { StageKey } from '@/lib/chat/stages'

const navItems = [
  {
    href: '/workspace',
    label: '내 작업실',
    icon: '/assets/icons/navigation/workspace.svg',
  },
  { href: '/chat', label: '채팅', icon: '/assets/icons/navigation/chat.svg' },
  {
    href: '/dashboard',
    label: '대시보드',
    icon: '/assets/icons/navigation/dashboard.svg',
  },
  {
    href: '/settings',
    label: '설정',
    icon: '/assets/icons/navigation/settings.svg',
  },
] as const

const expertItems: Array<{
  icon: string
  key: Exclude<ExpertKey, 'aidee'>
  label: string
}> = [
  {
    icon: '/assets/icons/chat/strategist.svg',
    key: 'planner',
    label: '기획전략가',
  },
  {
    icon: '/assets/icons/chat/designer.svg',
    key: 'style_designer',
    label: '스타일디자이너',
  },
  {
    icon: '/assets/icons/chat/engineer.svg',
    key: 'engineer',
    label: '엔지니어',
  },
  {
    icon: '/assets/icons/chat/marketer.svg',
    key: 'marketer',
    label: '마케터',
  },
]

const processSteps: Array<{
  index: number
  label: string
  stageKeys: StageKey[]
}> = [
  {
    index: 1,
    label: '제품 아이디어 & 개발 조건 정리',
    stageKeys: ['step_0_start', 'step_1_idea'],
  },
  {
    index: 2,
    label: '사용자 명확화',
    stageKeys: ['step_2_persona', 'step_2_research'],
  },
  {
    index: 3,
    label: '디자인 개발 방향성 도출',
    stageKeys: ['step_3_direction'],
  },
  {
    index: 4,
    label: '스타일 컨셉 도출',
    stageKeys: ['step_4_style'],
  },
  {
    index: 5,
    label: '디자인 제안',
    stageKeys: ['step_5_design'],
  },
  {
    index: 6,
    label: '평가 및 RFP 문서 생성',
    stageKeys: ['step_6_rfp'],
  },
  {
    index: 7,
    label: '협력업체 연결',
    stageKeys: ['step_6_company'],
  },
]

function isActivePath(pathname: string, href: string) {
  if (pathname.startsWith('/workspace/project/')) {
    return href === '/chat'
  }

  return pathname === href || pathname.startsWith(`${href}/`)
}

export function AppSidebar() {
  const pathname = usePathname()
  const { sidebarState } = useProjectChatSidebar()

  if (
    pathname.startsWith('/workspace/project/') &&
    sidebarState.showProgress
  ) {
    return (
      <ProjectProgressSidebar
        activeExpert={sidebarState.activeExpert}
        activeExperts={sidebarState.activeExperts}
        activeStageKey={sidebarState.activeStageKey}
        pathname={pathname}
      />
    )
  }

  return (
    <aside className="hidden w-[clamp(220px,31.25svh,320px)] shrink-0 flex-col gap-2 overflow-hidden bg-neutral-900 lg:flex">
      <div className="flex h-[clamp(76px,10.94svh,112px)] w-full items-center justify-between px-[clamp(24px,3.9svh,40px)] pb-[clamp(22px,3.9svh,40px)] pt-[clamp(30px,4.69svh,48px)]">
        <Image
          src="/assets/logos/aidee-logo-blue.svg"
          alt="Aidee"
          width={115}
          height={40}
          priority
          unoptimized
          className="h-[clamp(40px,6.25svh,64px)] w-auto object-contain"
          style={{ width: 'auto' }}
        />
        <div className="h-[clamp(30px,3.9svh,40px)] w-[clamp(30px,3.9svh,40px)]" />
      </div>

      <nav className="border-b border-neutral-800 px-[clamp(12px,1.56svh,16px)] pb-[clamp(28px,4.69svh,64px)] pt-[clamp(10px,1.56svh,16px)]">
        <div className="flex w-full flex-col items-start">
          {navItems.map((item) => {
            const active = isActivePath(pathname, item.href)

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={
                  active
                    ? 'inline-flex h-[clamp(36px,4.69svh,48px)] w-full items-center gap-[clamp(12px,1.95svh,20px)] rounded-lg bg-gradient-to-l from-zinc-800 to-slate-600/50 px-[clamp(14px,1.95svh,20px)] py-2 text-[clamp(13px,1.56svh,16px)] font-semibold leading-6 text-white shadow-[0px_4px_8px_0px_rgba(0,0,0,0.10),inset_0px_1px_0px_0px_rgba(255,255,255,0.05)]'
                    : 'inline-flex h-[clamp(36px,4.69svh,48px)] w-full items-center gap-[clamp(12px,1.95svh,20px)] overflow-hidden rounded-lg px-[clamp(14px,1.95svh,20px)] py-2 text-[clamp(13px,1.56svh,16px)] font-semibold leading-6 text-zinc-500 transition hover:bg-neutral-800/70 hover:text-zinc-200'
                }
              >
                <Image
                  src={item.icon}
                  alt=""
                  width={28}
                  height={28}
                  unoptimized
                  className="h-[clamp(20px,2.73svh,28px)] w-[clamp(20px,2.73svh,28px)] shrink-0 object-contain"
                />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </aside>
  )
}

function SidebarLogo() {
  return (
    <div className="flex h-[clamp(76px,10.94svh,112px)] w-full items-center justify-between px-[clamp(24px,3.9svh,40px)] pb-[clamp(22px,3.9svh,40px)] pt-[clamp(30px,4.69svh,48px)]">
      <Image
        src="/assets/logos/aidee-logo-blue.svg"
        alt="Aidee"
        width={115}
        height={40}
        priority
        unoptimized
        className="h-[clamp(40px,6.25svh,64px)] w-auto object-contain"
        style={{ width: 'auto' }}
      />
      <div className="h-[clamp(30px,3.9svh,40px)] w-[clamp(30px,3.9svh,40px)]" />
    </div>
  )
}

function ProjectProgressSidebar({
  activeExpert,
  activeExperts,
  activeStageKey,
  pathname,
}: {
  activeExpert: ExpertKey
  activeExperts: ExpertKey[]
  activeStageKey: StageKey
  pathname: string
}) {
  const activeStepIndex =
    processSteps.find((step) => step.stageKeys.includes(activeStageKey))
      ?.index ?? 1

  return (
    <aside className="hidden w-[clamp(220px,31.25svh,320px)] shrink-0 flex-col overflow-hidden bg-neutral-900 lg:flex">
      <SidebarLogo />

      <SidebarNav pathname={pathname} />

      <section className="border-b border-neutral-800 px-[clamp(12px,1.56svh,16px)] py-[clamp(10px,1.56svh,16px)]">
        <div className="flex flex-col gap-[3px]">
          {expertItems.map((expert) => {
            const selected =
              activeExperts.length > 0
                ? activeExperts.includes(expert.key)
                : activeExpert === expert.key

            return (
              <div
                key={expert.key}
                className={`flex h-[clamp(36px,4.69svh,48px)] items-center gap-[clamp(12px,1.95svh,20px)] rounded-lg px-[clamp(14px,1.95svh,20px)] py-2 ${
                  selected
                    ? 'bg-gradient-to-l from-zinc-800 to-slate-600/50 text-white'
                    : 'text-zinc-500'
                }`}
              >
                <Image
                  src={expert.icon}
                  alt=""
                  width={28}
                  height={28}
                  unoptimized
                  className={`h-[clamp(20px,2.73svh,28px)] w-[clamp(20px,2.73svh,28px)] shrink-0 object-contain ${
                    selected ? 'opacity-100' : 'opacity-45'
                  }`}
                />
                <span className="font-['Inter'] text-[clamp(13px,1.56svh,16px)] font-semibold leading-6">
                  {expert.label}
                </span>
              </div>
            )
          })}
        </div>
      </section>

      <section className="min-h-0 flex-1 overflow-hidden px-[clamp(16px,2.34svh,26px)] py-[clamp(14px,2.34svh,24px)]">
        <div className="relative flex flex-col gap-[clamp(10px,1.95svh,20px)]">
          <div className="absolute bottom-3 left-2 top-3 w-px bg-slate-700" />
          {processSteps.map((step) => {
            const active = step.stageKeys.includes(activeStageKey)
            const completed = step.index < activeStepIndex
            const visible = active || completed

            return (
              <div
                key={step.index}
                className="relative z-10 flex items-center gap-[clamp(14px,1.85svh,20px)]"
              >
                <div className="flex h-4 w-4 shrink-0 items-center justify-center">
                  {completed ? (
                    <div className="flex h-3 w-3 items-center justify-center rounded-full border border-white bg-white">
                      <div className="h-[5px] w-1.5 -translate-y-px -rotate-45 border-b border-l border-blue-600" />
                    </div>
                  ) : active ? (
                    <div className="flex h-4 w-4 items-center justify-center rounded-lg bg-blue-600 outline outline-1 outline-offset-[-1px] outline-white">
                      <div className="h-[5px] w-[5px] rounded-full bg-white" />
                    </div>
                  ) : (
                    <div className="h-3 w-3 rounded-full border border-gray-400 bg-neutral-800" />
                  )}
                </div>
                <div className="flex min-w-0 items-center gap-1.5">
                  <span
                    className={`font-['Inter'] font-semibold ${
                      active
                        ? 'text-[clamp(12px,1.3svh,14px)] text-white'
                        : `text-[clamp(11px,1.2svh,13px)] ${
                            visible ? 'text-white' : 'text-gray-400'
                          }`
                    }`}
                  >
                    {String(step.index).padStart(2, '0')}.
                  </span>
                  <span
                    className={`min-w-0 font-['Inter'] font-semibold ${
                      active
                        ? 'text-[clamp(12px,1.3svh,14px)] text-white'
                        : `text-[clamp(11px,1.2svh,13px)] ${
                            visible ? 'text-white' : 'text-gray-400'
                          }`
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </section>
    </aside>
  )
}

function SidebarNav({ pathname }: { pathname: string }) {
  return (
    <nav className="border-b border-neutral-800 px-[clamp(12px,1.56svh,16px)] pb-[clamp(10px,1.56svh,16px)] pt-[clamp(10px,1.56svh,16px)]">
      <div className="flex w-full flex-col items-start">
        {navItems.map((item) => {
          const active = isActivePath(pathname, item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={
                active
                  ? 'inline-flex h-[clamp(36px,4.69svh,48px)] w-full items-center gap-[clamp(12px,1.95svh,20px)] rounded-lg bg-gradient-to-l from-zinc-800 to-slate-600/50 px-[clamp(14px,1.95svh,20px)] py-2 font-["Inter"] text-[clamp(13px,1.56svh,16px)] font-semibold leading-6 text-white shadow-[0px_4px_8px_0px_rgba(0,0,0,0.10),inset_0px_1px_0px_0px_rgba(255,255,255,0.05)]'
                  : 'inline-flex h-[clamp(36px,4.69svh,48px)] w-full items-center gap-[clamp(12px,1.95svh,20px)] overflow-hidden rounded-lg px-[clamp(14px,1.95svh,20px)] py-2 font-["Inter"] text-[clamp(13px,1.56svh,16px)] font-semibold leading-6 text-zinc-500 transition hover:bg-neutral-800/70 hover:text-zinc-200'
              }
            >
              <Image
                src={item.icon}
                alt=""
                width={28}
                height={28}
                unoptimized
                className="h-[clamp(20px,2.73svh,28px)] w-[clamp(20px,2.73svh,28px)] shrink-0 object-contain"
              />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
