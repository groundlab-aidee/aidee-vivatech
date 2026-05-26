import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'

import { createClient } from '@/lib/supabase/server'

type PlanId = 'free' | 'basic' | 'pro' | 'business'

const plans: Array<{
  id: PlanId
  name: string
  description: string
  price: string
  period?: string
  badge?: string
  buttonLabel: string
  features: string[]
}> = [
  {
    id: 'free',
    name: 'Free',
    description: '아이디어를 빠르게 탐색해보는 플랜',
    price: '무료',
    buttonLabel: '현재 플랜 유지하기',
    features: [
      '매월 500 토큰 지급',
      '제품디자인 개발 기획안 체험 가능 (약 1개 미만)',
      '전문가 AI 기본 답변 제공',
      '프로젝트 최대 3개 저장 가능',
      '라이브러리 저장 공간 1GB',
    ],
  },
  {
    id: 'basic',
    name: 'Basic',
    description: '첫 제품 아이디어를 가볍게 정리하는 플랜',
    price: '9,900원',
    period: '/ 월',
    buttonLabel: '플랜 업그레이드 하기',
    features: [
      '매월 3,000 토큰 지급',
      '제품디자인 개발 기획안 3~4개 생성 가능',
      '전문가 AI 기본 답변 제공',
      '프로젝트 최대 10개 저장 가능',
      '라이브러리 저장 공간 15GB',
      '추가 토큰 구매 가능: 1,000토큰당 3,000원',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    description: '실행 가능한 제품개발 기획안으로 발전시키는 플랜',
    price: '39,900원',
    period: '/ 월',
    badge: '50% 할인',
    buttonLabel: '플랜 업그레이드 하기',
    features: [
      '매월 15,000 토큰 지급',
      '제품디자인 개발 기획안 15개 이상 생성 가능',
      '전문가 AI의 심층 답변 제공',
      '프로젝트 최대 50개 저장 가능',
      '라이브러리 저장 공간 100GB',
      '시장 · 타겟 · 경쟁 제품 심화 분석 지원',
      '협력업체 매칭 가능',
    ],
  },
  {
    id: 'business',
    name: 'Business',
    description: '팀과 함께 제품개발 전 과정을 공유하고 협업하는 플랜',
    price: '99,000원',
    period: '/ 월',
    badge: '50% 할인',
    buttonLabel: '플랜 업그레이드 하기',
    features: [
      '매월 50,000 토큰 지급',
      '제품디자인 개발 기획안 50개 이상 생성 가능',
      '전문가 AI의 심층 답변 제공',
      '프로젝트 무제한 저장 가능',
      '라이브러리 저장 공간 500GB',
      '시장성 · 제조 가능성 · 비용 리스크 검토 지원',
    ],
  },
]

const planIds = new Set<PlanId>(['free', 'basic', 'pro', 'business'])

export default async function SettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?next=/settings')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('plan')
    .eq('id', user.id)
    .maybeSingle()

  const currentPlan = planIds.has(profile?.plan as PlanId)
    ? (profile?.plan as PlanId)
    : 'free'

  return (
    <div className="flex min-h-full flex-col bg-white">
      <section className="px-6 py-7 sm:px-10 lg:px-20">
        <div className="flex min-h-20 flex-col items-start justify-start">
          <h1 className="text-4xl font-bold leading-[48px] text-black">
            설정
          </h1>
          <p className="mt-1 text-base font-medium leading-6 text-zinc-500">
            Settings
          </p>
        </div>
      </section>

      <section className="px-6 pb-5 sm:px-10 lg:px-20">
        <h2 className="text-2xl font-semibold leading-7 text-neutral-900">
          요금제 선택
        </h2>
        <div className="mt-4 grid gap-3 xl:grid-cols-4">
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              current={plan.id === currentPlan}
            />
          ))}
        </div>
      </section>

      <section className="grid gap-4 px-6 py-5 sm:px-10 lg:px-20 xl:grid-cols-2">
        <div className="flex flex-col gap-4">
          <h2 className="text-2xl font-semibold leading-7 text-black">일반</h2>
          <div className="rounded-[20px] bg-zinc-300 p-5 sm:p-6">
            <div className="flex flex-col gap-2">
              <SettingsRow label="언어">
                <div className="flex w-full max-w-72 rounded-lg bg-[#DDF444] p-0.5 shadow-[inset_1px_1px_6px_0.5px_rgba(0,0,0,0.10)]">
                  <Segment active>한국어</Segment>
                  <Segment>English</Segment>
                  <Segment>日本語</Segment>
                </div>
              </SettingsRow>
              <SettingsRow label="지불방식">
                <button
                  type="button"
                  className="rounded-full bg-white px-3 py-1.5 text-xs font-medium leading-4 text-neutral-500"
                >
                  카카오페이
                </button>
              </SettingsRow>
              <SettingsRow label="주소">
                <span className="text-xs font-medium leading-4 text-neutral-500">
                  서울특별시 성동구
                </span>
              </SettingsRow>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <h2 className="text-2xl font-semibold leading-7 text-black">계정</h2>
          <div className="rounded-[20px] bg-zinc-300 p-5 sm:p-6">
            <div className="flex flex-col gap-2">
              <div className="rounded-lg bg-zinc-100 p-2">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-base font-semibold leading-5 text-neutral-700">
                    비밀번호
                  </span>
                  <button className="rounded-md bg-white px-4 py-1.5 text-sm font-medium leading-4 text-neutral-500">
                    찾기
                  </button>
                </div>
                <div className="mt-2 flex items-center justify-end gap-4 border-t border-neutral-300 pt-2">
                  <span className="text-xs font-medium leading-4 text-neutral-400">
                    마지막 변경: 2026.04.20(월)
                  </span>
                  <button className="rounded-md bg-white px-4 py-1.5 text-sm font-medium leading-4 text-neutral-500">
                    변경
                  </button>
                </div>
              </div>

              <SettingsRow label="회원">
                <button className="rounded-md bg-white px-4 py-1.5 text-sm font-medium leading-4 text-neutral-500">
                  탈퇴
                </button>
              </SettingsRow>

              <form action="/auth/logout" method="post" className="flex justify-end">
                <button
                  type="submit"
                  className="rounded-md bg-blue-600 px-5 py-1.5 text-sm font-medium leading-4 text-white"
                >
                  로그아웃
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
  plan,
  current,
}: {
  plan: (typeof plans)[number]
  current: boolean
}) {
  return (
    <article
      className={`flex min-h-96 flex-col rounded-[10px] border-[1.5px] px-5 py-6 ${
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
              현재 플랜
            </span>
          ) : plan.badge ? (
            <span className="rounded-[3px] bg-zinc-400 px-1.5 py-0.5 text-xs font-medium text-white">
              {plan.badge}
            </span>
          ) : null}
        </div>
        <p
          className={`mt-3 text-[10px] font-normal leading-4 ${
            current ? 'text-white' : 'text-black'
          }`}
        >
          {plan.description}
        </p>
      </header>

      <div className="mt-4 flex items-end gap-2">
        <span className="text-2xl font-bold leading-5">{plan.price}</span>
        {plan.period ? (
          <span
            className={`text-sm font-medium leading-4 ${
              current ? 'text-white' : 'text-neutral-500'
            }`}
          >
            {plan.period}
          </span>
        ) : null}
      </div>

      <button
        type="button"
        className={`mt-5 h-6 w-full text-xs font-semibold ${
          current
            ? 'bg-[#DDF444] text-neutral-950'
            : 'border border-zinc-400 bg-zinc-100 text-neutral-600'
        }`}
      >
        {current ? '현재 플랜 유지하기' : plan.buttonLabel}
      </button>

      <ul className="mt-5 flex flex-col gap-[9px]">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2">
            <span
              className={`mt-[3px] flex h-3.5 w-3.5 shrink-0 items-center justify-center text-[10px] ${
                current ? 'text-[#DDF444]' : 'text-blue-600'
              }`}
            >
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
  label,
}: {
  children: ReactNode
  label: string
}) {
  return (
    <div className="rounded-lg bg-zinc-100 p-2">
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm font-semibold leading-5 text-neutral-700">
          {label}
        </span>
        {children}
      </div>
    </div>
  )
}

function Segment({
  active = false,
  children,
}: {
  active?: boolean
  children: ReactNode
}) {
  return (
    <button
      type="button"
      className={`flex-1 rounded-md py-1 text-xs leading-4 ${
        active
          ? 'bg-white font-medium text-neutral-900 shadow-[0px_1px_3px_0px_rgba(36,34,31,0.10)]'
          : 'font-normal text-neutral-900/60'
      }`}
    >
      {children}
    </button>
  )
}
