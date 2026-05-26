'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { href: '/workspace', label: '내 작업실', icon: 'workspace' },
  { href: '/chat', label: '채팅', icon: 'chat' },
  { href: '/dashboard', label: '대시보드', icon: 'dashboard' },
  { href: '/settings', label: '설정', icon: 'settings' },
] as const

type NavIconName = (typeof navItems)[number]['icon']

function NavIcon({ icon }: { icon: NavIconName }) {
  if (icon === 'workspace') {
    return (
      <svg
        aria-hidden="true"
        className="h-[clamp(20px,1.458vw,28px)] w-[clamp(20px,1.458vw,28px)] text-emerald-400"
        fill="none"
        viewBox="0 0 28 28"
      >
        <path
          d="M7 8.75A1.75 1.75 0 0 1 8.75 7h10.5A1.75 1.75 0 0 1 21 8.75v10.5A1.75 1.75 0 0 1 19.25 21H8.75A1.75 1.75 0 0 1 7 19.25V8.75Z"
          stroke="currentColor"
          strokeWidth="2"
        />
        <path
          d="M10.5 14h7M14 10.5v7"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="2"
        />
      </svg>
    )
  }

  if (icon === 'chat') {
    return (
      <svg
        aria-hidden="true"
        className="h-[clamp(20px,1.458vw,28px)] w-[clamp(20px,1.458vw,28px)] text-blue-600"
        fill="none"
        viewBox="0 0 28 28"
      >
        <path
          d="M6.5 7.5h15v10h-8l-4.5 3.5v-3.5H6.5v-10Z"
          fill="currentColor"
          opacity="0.18"
        />
        <path
          d="M8.25 10.75h11.5M8.25 14h7"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="2"
        />
      </svg>
    )
  }

  if (icon === 'dashboard') {
    return (
      <svg
        aria-hidden="true"
        className="h-[clamp(20px,1.458vw,28px)] w-[clamp(20px,1.458vw,28px)] text-red-400"
        fill="none"
        viewBox="0 0 28 28"
      >
        <path
          d="M5.25 7h17.5v14H5.25V7Z"
          stroke="currentColor"
          strokeLinejoin="round"
          strokeWidth="2"
        />
        <path
          d="M8.75 17.5h3.5M8.75 14h10.5M8.75 10.5h10.5"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="2"
        />
      </svg>
    )
  }

  return (
    <svg
      aria-hidden="true"
      className="h-[clamp(20px,1.458vw,28px)] w-[clamp(20px,1.458vw,28px)] text-violet-500"
      fill="none"
      viewBox="0 0 28 28"
    >
      <path
        d="M14 18.08a4.08 4.08 0 1 0 0-8.16 4.08 4.08 0 0 0 0 8.16Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M22.17 15.58v-3.16l-2.37-.6a6.35 6.35 0 0 0-.75-1.8l1.25-2.1-2.23-2.22-2.1 1.25c-.57-.32-1.18-.57-1.82-.74L13.58 3h-3.16l-.58 2.37c-.64.17-1.25.42-1.82.74L5.92 4.86 3.7 7.08l1.25 2.1c-.32.57-.57 1.18-.74 1.82L1.83 11.58v3.16l2.38.58c.17.64.42 1.25.74 1.82l-1.25 2.1 2.22 2.22 2.1-1.25c.57.32 1.18.57 1.82.74l.58 2.37h3.16l.58-2.37c.64-.17 1.25-.42 1.82-.74l2.1 1.25 2.22-2.22-1.25-2.1c.32-.57.57-1.18.75-1.82l2.37-.58Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
    </svg>
  )
}

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden w-[clamp(232px,16.667vw,320px)] shrink-0 flex-col gap-2 overflow-hidden bg-neutral-900 lg:flex">
      <div className="flex h-[clamp(78px,5.833vw,112px)] w-full items-center justify-between px-[clamp(24px,2.083vw,40px)] pb-[clamp(24px,2.083vw,40px)] pt-[clamp(32px,2.5vw,48px)]">
        <Image
          src="/assets/logos/aidee-logo-blue.svg"
          alt="Aidee"
          width={176}
          height={64}
          priority
          unoptimized
          className="h-[clamp(44px,3.333vw,64px)] w-[clamp(121px,9.167vw,176px)] object-contain"
        />
        <div className="h-[clamp(32px,2.083vw,40px)] w-[clamp(32px,2.083vw,40px)]" />
      </div>

      <nav className="border-b border-neutral-800 px-[clamp(12px,0.833vw,16px)] pb-[clamp(40px,3.333vw,64px)] pt-[clamp(12px,0.833vw,16px)]">
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
                    ? 'inline-flex h-[clamp(40px,2.5vw,48px)] w-full items-center gap-[clamp(12px,1.042vw,20px)] rounded-lg bg-gradient-to-l from-zinc-800 to-slate-600/50 px-[clamp(14px,1.042vw,20px)] py-2 text-[clamp(14px,0.833vw,16px)] font-semibold leading-6 text-white shadow-[0px_4px_8px_0px_rgba(0,0,0,0.10),inset_0px_1px_0px_0px_rgba(255,255,255,0.05)]'
                    : 'inline-flex h-[clamp(40px,2.5vw,48px)] w-full items-center gap-[clamp(12px,1.042vw,20px)] overflow-hidden rounded-lg px-[clamp(14px,1.042vw,20px)] py-2 text-[clamp(14px,0.833vw,16px)] font-semibold leading-6 text-zinc-500 transition hover:bg-neutral-800/70 hover:text-zinc-200'
                }
              >
                <NavIcon icon={item.icon} />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </aside>
  )
}
