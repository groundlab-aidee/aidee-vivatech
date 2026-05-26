'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

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
                <Image
                  src={item.icon}
                  alt=""
                  width={28}
                  height={28}
                  unoptimized
                  className="h-[clamp(20px,1.458vw,28px)] w-[clamp(20px,1.458vw,28px)] shrink-0 object-contain"
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
