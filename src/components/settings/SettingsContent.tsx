'use client'

import Image from 'next/image'
import type { ReactNode } from 'react'

import { useAppLanguage } from '@/components/i18n/AppLanguageContext'
import { SettingsLanguageSelector } from '@/components/settings/SettingsLanguageSelector'

export type SettingsPlanId = 'free' | 'basic' | 'business' | 'pro'

type PlanCopy = {
  badge?: string
  buttonLabel: string
  description: string
  features: string[]
  name: string
  period?: string
  price: string
}

const plans: Record<SettingsPlanId, { ENG: PlanCopy; KOR: PlanCopy }> = {
  free: {
    ENG: {
      buttonLabel: 'Keep current plan',
      description: 'A plan to quickly explore your ideas',
      features: [
        '500 tokens / month',
        'Up to 1 product design proposal',
        'Basic AI mentor responses',
        'Save up to 3 projects',
        '1GB Library storage',
      ],
      name: 'Free',
      period: '/ mo.',
      price: '$0',
    },
    KOR: {
      buttonLabel: '현재 플랜 유지하기',
      description: '아이디어를 빠르게 탐색해보는 플랜',
      features: [
        '매월 500 토큰 지급',
        '제품디자인 개발 기획안 체험 가능 (약 1개 미만)',
        '전문가 AI 기본 답변 제공',
        '프로젝트 최대 3개 저장 가능',
        '라이브러리 저장 공간 1GB',
      ],
      name: 'Free',
      price: '0원',
    },
  },
  basic: {
    ENG: {
      buttonLabel: 'Upgrade Plan',
      description: 'A light plan to organize your first product ideas',
      features: [
        '3,000 tokens / month',
        'Generate 3–4 Project Reports',
        'Basic AI mentor responses',
        'Save up to 10 projects',
        '15GB Library storage',
        'Additional tokens available ($5 per 1,000 tokens)',
      ],
      name: 'Basic',
      period: '/ mo.',
      price: '$9.99',
    },
    KOR: {
      buttonLabel: '플랜 업그레이드 하기',
      description: '첫 제품 아이디어를 가병게 정리하는 플랜',
      features: [
        '매월 3,000 토큰 지급',
        '제품디자인 개발 기획안 3~4개 생성 가능',
        '전문가 AI 기본 답변 제공',
        '프로젝트 최대 10개 저장 가능',
        '라이브러리 저장 공간 15GB',
        '추가 토큰 구매 가능: 1,000토큰당 3,000원',
      ],
      name: 'Basic',
      period: '/ 월',
      price: '9,900원',
    },
  },
  pro: {
    ENG: {
      badge: 'Save 50%',
      buttonLabel: 'Upgrade Plan',
      description: 'Advance your ideas into actionable plans',
      features: [
        '15,000 tokens / month',
        'Generate 15 Project Reports',
        'In-depth AI mentor responses',
        'Save up to 50 projects',
        '100GB Library storage',
        'Advanced market, target, and competitor analysis',
        'Partners matching service',
      ],
      name: 'Pro',
      period: '/ mo.',
      price: '$39.99',
    },
    KOR: {
      badge: '50% 할인',
      buttonLabel: '플랜 업그레이드 하기',
      description: '실행 가능한 제품개발 기획안으로 발전시키는 플랜',
      features: [
        '매월 15,000 토큰 지급',
        '제품디자인 개발 기획안 15개 이상 생성 가능',
        '전문가 AI의 심층 답변 제공',
        '프로젝트 최대 50개 저장 가능',
        '라이브러리 저장 공간 100GB',
        '시장 · 타겟 · 경쟁 제품 심화 분석 지원',
        '협력업체 매칭 가능',
      ],
      name: 'Pro',
      period: '/ 월',
      price: '39,900원',
    },
  },
  business: {
    ENG: {
      badge: 'Save 50%',
      buttonLabel: 'Opening soon',
      description: 'Share and collaborate on the entire process',
      features: [
        '50,000 tokens / month',
        'Generate 50+ Project Reports',
        'In-depth AI mentor responses',
        'Unlimited projects',
        '500GB Library storage',
        'Market viability, manufacturability, and cost risk assessment',
        'Team invitation & shared project viewing',
        'Export product proposals for sharing',
      ],
      name: 'Business',
      period: '/ mo.',
      price: '$99.99',
    },
    KOR: {
      badge: '50% 할인',
      buttonLabel: '플랜 업그레이드 하기',
      description: '팀과 함께 제품개발 전 과정을 공유하고 협업하는 플랜',
      features: [
        '매월 50,000 토큰 지급',
        '제품디자인 개발 기획안 50개 이상 생성 가능',
        '전문가 AI의 심층 답변 제공',
        '프로젝트 무제한 저장 가능',
        '라이브러리 저장 공간 500GB',
        '시장성 · 제조 가능성 · 비용 리스크 검토 지원',
      ],
      name: 'Business',
      period: '/ 월',
      price: '99,000원',
    },
  },
}

const planOrder: SettingsPlanId[] = ['free', 'basic', 'pro', 'business']

const copy = {
  ENG: {
    account: 'Account',
    address: 'Address',
    addressValue: 'Seoul, Korea',
    change: 'Change',
    currentPlan: 'Current Plan',
    delete: 'Delete',
    findPassword: 'Find Password',
    general: 'General',
    keepCurrentPlan: 'Keep current plan',
    language: 'Language',
    lastChanged: 'Last changed: 04/20/2026',
    logout: 'Log out',
    password: 'Password',
    payment: 'Payment',
    paymentValue: 'Visa 1234',
    selectPlan: 'Select your plan',
    setting: 'Setting',
  },
  KOR: {
    account: '계정',
    address: '주소',
    addressValue: '서울특별시 성동구',
    change: '변경',
    currentPlan: '현재 플랜',
    delete: '탈퇴',
    findPassword: '찾기',
    general: '일반',
    keepCurrentPlan: '현재 플랜 유지하기',
    language: '언어',
    lastChanged: '마지막 변경: 2026.04.20(월)',
    logout: '로그아웃',
    password: '비밀번호',
    payment: '지불방식',
    paymentValue: '카카오페이',
    selectPlan: '요금제 선택',
    setting: '설정',
  },
} as const

type SettingsIcon = 'address' | 'language' | 'member' | 'password' | 'payment'

const settingsIconAssets: Record<SettingsIcon, string> = {
  address: '/assets/icons/settings/address.svg',
  language: '/assets/icons/settings/language.svg',
  member: '/assets/icons/settings/member.svg',
  password: '/assets/icons/settings/password.svg',
  payment: '/assets/icons/settings/payment.svg',
}

export function SettingsContent({
  currentPlan,
}: {
  currentPlan: SettingsPlanId
}) {
  const { language } = useAppLanguage()
  const currentCopy = copy[language]

  return (
    <div className="flex min-h-full w-full min-w-0 flex-col overflow-x-hidden bg-white font-['Pretendard']">
      <section className="flex h-[136px] shrink-0 items-center px-[clamp(24px,5.208vw,80px)]">
        <div className="w-full max-w-[1420px]">
          <h1 className="text-[clamp(28px,1.875vw,36px)] font-bold leading-[clamp(40px,4.444svh,48px)] text-black">
            {currentCopy.setting}
          </h1>
        </div>
      </section>

      <section className="h-[472px] shrink-0 px-[clamp(24px,4.557vw,70px)] pt-4">
        <div className="mx-auto flex h-full w-full max-w-[1420px] flex-col">
          <h2 className="shrink-0 text-[clamp(20px,1.25vw,24px)] font-semibold leading-7 text-neutral-900">
            {currentCopy.selectPlan}
          </h2>
          <div className="mt-[19px] grid min-h-0 flex-1 grid-cols-4 gap-3 pb-6">
            {planOrder.map((planId) => (
              <PlanCard
                key={planId}
                current={planId === currentPlan}
                currentPlanLabel={currentCopy.currentPlan}
                keepCurrentPlanLabel={currentCopy.keepCurrentPlan}
                plan={plans[planId][language]}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-[1560px] shrink-0 grid-cols-2 gap-[clamp(10px,0.729vw,14px)] px-[clamp(20px,4.557vw,70px)] py-5">
        <div className="grid w-full min-w-0 grid-rows-[28px_214px] gap-4">
          <h2 className="shrink-0 text-2xl font-semibold leading-7 text-black">
            {currentCopy.general}
          </h2>
          <div className="h-[214px] w-full min-w-0 rounded-[20px] bg-[#D7D7D7] px-[clamp(18px,2.344vw,36px)] py-5">
            <div className="flex flex-col gap-2">
              <SettingsRow icon="language" label={currentCopy.language}>
                <SettingsLanguageSelector />
              </SettingsRow>
              <SettingsRow icon="payment" label={currentCopy.payment}>
                <button
                  type="button"
                  className="rounded-full bg-white px-3 py-1.5 text-xs font-medium leading-4 text-neutral-600 transition hover:bg-zinc-50"
                >
                  {currentCopy.paymentValue}
                </button>
              </SettingsRow>
              <SettingsRow icon="address" label={currentCopy.address}>
                <span className="text-xs font-medium leading-4 text-neutral-500">
                  {currentCopy.addressValue}
                </span>
              </SettingsRow>
            </div>
          </div>
        </div>

        <div className="grid w-full min-w-0 grid-rows-[28px_214px] gap-4">
          <h2 className="shrink-0 text-2xl font-semibold leading-7 text-black">
            {currentCopy.account}
          </h2>
          <div className="h-[214px] w-full min-w-0 rounded-[20px] bg-[#D7D7D7] px-[clamp(18px,2.344vw,36px)] py-[19px]">
            <div className="flex flex-col gap-2">
              <div className="rounded-lg bg-zinc-100 p-2">
                <div className="flex items-center justify-between gap-4">
                  <SettingsLabel icon="password">
                    {currentCopy.password}
                  </SettingsLabel>
                  <button type="button" className="rounded-md bg-white px-4 py-1.5 text-sm font-medium leading-4 text-neutral-500 transition hover:bg-zinc-50">
                    {currentCopy.findPassword}
                  </button>
                </div>
                <div className="mt-2 flex items-center justify-end gap-4 border-t border-neutral-300 pt-2">
                  <span className="text-xs font-medium leading-4 text-neutral-400">
                    {currentCopy.lastChanged}
                  </span>
                  <button type="button" className="rounded-md bg-white px-4 py-1.5 text-sm font-medium leading-4 text-neutral-500 transition hover:bg-zinc-50">
                    {currentCopy.change}
                  </button>
                </div>
              </div>

              <SettingsRow icon="member" label={currentCopy.account}>
                <button type="button" className="rounded-md bg-white px-4 py-1.5 text-sm font-medium leading-4 text-neutral-500 transition hover:bg-zinc-50">
                  {currentCopy.delete}
                </button>
              </SettingsRow>

              <form action="/auth/logout" method="post" className="flex justify-end">
                <button
                  type="submit"
                  className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium leading-4 text-white transition hover:bg-blue-700"
                >
                  {currentCopy.logout}
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

function PlanCard({
  current,
  currentPlanLabel,
  keepCurrentPlanLabel,
  plan,
}: {
  current: boolean
  currentPlanLabel: string
  keepCurrentPlanLabel: string
  plan: PlanCopy
}) {
  return (
    <article
      className={`flex min-h-0 flex-col rounded-[10px] border-[1.5px] px-[clamp(14px,1.042vw,20px)] py-6 ${
        current
          ? 'border-zinc-400 bg-neutral-700 text-white shadow-[3px_3px_4px_1px_rgba(0,0,0,0.10)]'
          : 'border-zinc-400 bg-white text-black'
      }`}
    >
      <header>
        <div className="flex min-h-7 items-center gap-2">
          <h3 className="font-['Inter'] text-2xl font-extrabold leading-7">
            {plan.name}
          </h3>
          {current ? (
            <span className="rounded-[3px] bg-white px-1.5 py-0.5 text-xs font-bold text-black">
              {currentPlanLabel}
            </span>
          ) : plan.badge ? (
            <span className="rounded-[3px] bg-zinc-400 px-1.5 py-0.5 text-xs font-medium text-white">
              {plan.badge}
            </span>
          ) : null}
        </div>
        <p className={`mt-3 truncate text-[10px] font-normal leading-4 ${current ? 'text-white' : 'text-black'}`}>
          {plan.description}
        </p>
      </header>

      <div className="mt-[clamp(10px,1.481svh,16px)] flex items-end gap-2">
        <span className="text-2xl font-bold leading-5">{plan.price}</span>
        {plan.period ? (
          <span className={`text-sm font-medium leading-4 ${current ? 'text-white' : 'text-neutral-500'}`}>
            {plan.period}
          </span>
        ) : null}
      </div>

      <button
        type="button"
        disabled={current}
        className={`mt-[clamp(10px,1.852svh,20px)] h-6 w-full text-xs font-semibold transition ${
          current
            ? 'cursor-default bg-[#DDF444] text-neutral-950'
            : 'border border-zinc-400 bg-zinc-100 text-neutral-600 hover:bg-zinc-200'
        }`}
      >
        {current ? keepCurrentPlanLabel : plan.buttonLabel}
      </button>

      <ul className="mt-5 flex min-h-0 flex-col gap-[9px]">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2">
            <span className={`mt-[3px] flex h-3.5 w-3.5 shrink-0 items-center justify-center text-[10px] ${current ? 'text-[#DDF444]' : 'text-blue-600'}`}>
              ✓
            </span>
            <span className="text-[10px] font-normal leading-4">{feature}</span>
          </li>
        ))}
      </ul>
    </article>
  )
}

function SettingsRow({
  children,
  icon,
  label,
}: {
  children: ReactNode
  icon: SettingsIcon
  label: string
}) {
  return (
    <div className="rounded-lg bg-zinc-100 p-2">
      <div className="flex items-center justify-between gap-4">
        <SettingsLabel icon={icon}>{label}</SettingsLabel>
        <div className="flex min-w-0 flex-1 justify-end">{children}</div>
      </div>
    </div>
  )
}

function SettingsLabel({
  children,
  icon,
}: {
  children: ReactNode
  icon: SettingsIcon
}) {
  return (
    <span className="flex shrink-0 items-center gap-2 text-sm font-semibold leading-5 text-neutral-700">
      <Image
        src={settingsIconAssets[icon]}
        alt=""
        width={20}
        height={20}
        unoptimized
        className="h-5 w-5 shrink-0 object-contain"
      />
      {children}
    </span>
  )
}
