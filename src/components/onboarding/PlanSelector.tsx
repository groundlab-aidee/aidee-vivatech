'use client'

import Image from 'next/image'
import { useState, useTransition } from 'react'

export type PlanId = 'free' | 'basic' | 'pro' | 'business'

export type PlanSelectionResult = {
  error?: string
}

type PlanSelectorProps = {
  selectPlanAction: (plan: PlanId) => Promise<PlanSelectionResult | void>
}

type BillingCycle = 'monthly' | 'annual'

const plans: Array<{
  id: PlanId
  name: string
  description: string
  price: string
  period?: string
  badge?: string
  buttonLabel: string
  features: string[]
  featured?: boolean
}> = [
  {
    id: 'free',
    name: 'Free',
    description: '아이디어를 빠르게 탐색해보는 플랜',
    price: '무료',
    badge: '현재 플랜',
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
    featured: true,
  },
  {
    id: 'business',
    name: 'Business',
    description: '팀과 함께 제품개발 전 과정을 공유하고 협업하는 플랜',
    price: '99,000원',
    period: '/ 월',
    badge: '50% 할인',
    buttonLabel: '오픈 예정',
    features: [
      '매월 50,000 토큰 지급',
      '제품디자인 개발 기획안 월 50개 이상 생성 가능',
      '전문가 AI의 심층 답변 제공',
      '프로젝트 무제한 저장 가능',
      '라이브러리 저장 공간 500GB',
      '시장성 · 제조 가능성 · 비용 리스크 검토 지원',
      '팀원 초대 및 프로젝트 공동 열람 가능',
      '공유용 제품개발 기획안 내보내기 가능',
    ],
  },
]

export function PlanSelector({ selectPlanAction }: PlanSelectorProps) {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly')
  const [activePlan, setActivePlan] = useState<PlanId | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function selectPlan(plan: PlanId) {
    setActivePlan(plan)
    setErrorMessage(null)

    startTransition(async () => {
      const result = await selectPlanAction(plan)

      if (result?.error) {
        setErrorMessage(result.error)
      }
    })
  }

  return (
    <div className="flex w-full flex-col items-center">
      <header className="flex w-full flex-col items-center text-center">
        <Image
          src="/assets/logos/aidee-logo-blue.svg"
          alt="Aidee"
          width={192}
          height={64}
          priority
          className="h-16 w-auto"
          style={{ width: 'auto' }}
        />

        <h1 className="mt-9 whitespace-pre-line font-['Pretendard'] text-3xl font-bold leading-10 text-zinc-800">
          {'새로운 아이디어의 시작부터\n비즈니스 확장까지.'}
        </h1>
        <p className="mt-7 text-base font-semibold leading-6 text-neutral-500">
          나에게 딱 맞는 플랜으로 쉽고 빠르게 업그레이드하세요.
        </p>
      </header>

      <div className="mt-9 flex flex-col items-center gap-2">
        <div
          role="group"
          aria-label="결제 주기"
          className="flex h-9 w-64 rounded-full bg-[#DDF444] p-0.5 shadow-[inset_1px_1px_6px_0.5px_rgba(0,0,0,0.10)]"
        >
          <BillingCycleButton
            active={billingCycle === 'monthly'}
            label="월간"
            onClick={() => setBillingCycle('monthly')}
          />
          <BillingCycleButton
            active={billingCycle === 'annual'}
            label="연간"
            onClick={() => setBillingCycle('annual')}
          />
        </div>
        <div className="flex w-64 justify-between px-[51px]">
          <span
            className={`font-['Pretendard'] text-base font-bold leading-6 ${
              billingCycle === 'monthly' ? 'text-zinc-800' : 'text-neutral-500'
            }`}
          >
            월간
          </span>
          <span
            className={`font-['Pretendard'] text-base font-bold leading-6 ${
              billingCycle === 'annual' ? 'text-zinc-800' : 'text-neutral-500'
            }`}
          >
            연간
          </span>
        </div>
      </div>

      <div className="mt-8 flex w-full flex-col items-stretch justify-center gap-4 lg:flex-row">
        {plans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            billingCycle={billingCycle}
            disabled={isPending}
            pending={isPending && activePlan === plan.id}
            onSelect={() => selectPlan(plan.id)}
          />
        ))}
      </div>

      {errorMessage ? (
        <p className="mt-6 text-center text-sm font-medium text-red-600">
          {errorMessage}
        </p>
      ) : null}
    </div>
  )
}

function BillingCycleButton({
  active,
  label,
  onClick,
}: {
  active: boolean
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`h-8 flex-1 rounded-full transition ${
        active
          ? 'bg-white shadow-[1px_1px_7px_1px_rgba(0,0,0,0.10),-1px_-1px_7px_1px_rgba(0,0,0,0.10)]'
          : 'hover:bg-[#DDF444]/70'
      }`}
    >
      <span className="sr-only">{label}</span>
    </button>
  )
}

function PlanCard({
  plan,
  billingCycle,
  disabled,
  pending,
  onSelect,
}: {
  plan: (typeof plans)[number]
  billingCycle: BillingCycle
  disabled: boolean
  pending: boolean
  onSelect: () => void
}) {
  const isFeatured = Boolean(plan.featured)

  return (
    <article
      className={`flex min-h-96 min-w-0 w-full flex-col rounded-[10px] px-9 pb-8 pt-[26px] lg:max-w-72 ${
        isFeatured
          ? 'bg-neutral-700 text-white shadow-[3px_3px_4px_1px_rgba(0,0,0,0.10)]'
          : 'border border-neutral-200 bg-white text-black'
      }`}
    >
      <div className="flex flex-1 flex-col">
        <header className="flex flex-col">
          <div className="flex min-h-7 items-center gap-2">
            <h2 className="font-['Inter'] text-2xl font-extrabold leading-7">
              {plan.name}
            </h2>
            {plan.badge ? (
              <span
                className={`flex h-4 items-center rounded-[3px] px-1.5 font-['Pretendard'] text-xs font-medium leading-4 text-white ${
                  isFeatured ? 'bg-blue-600' : 'bg-zinc-400'
                }`}
              >
                {plan.badge}
              </span>
            ) : null}
          </div>
          <p className="mt-3 min-h-4 font-['Pretendard'] text-xs font-normal leading-4">
            {plan.description}
          </p>
        </header>

        <div className="mt-[14px] flex h-6 items-start gap-1">
          <span className="font-['Pretendard'] text-lg font-bold leading-4">
            {plan.price}
          </span>
          {plan.period ? (
            <span
              className={`pt-0.5 font-['Pretendard'] text-xs font-medium leading-4 ${
                isFeatured ? 'text-white' : 'text-neutral-500'
              }`}
            >
              {billingCycle === 'annual' ? '/ 연' : plan.period}
            </span>
          ) : null}
        </div>

        <button
          type="button"
          onClick={onSelect}
          disabled={disabled}
          className={`mt-3 h-6 w-full font-['Pretendard'] text-xs leading-4 transition disabled:cursor-not-allowed disabled:opacity-60 ${
            isFeatured
              ? 'bg-[#DDF444] font-medium text-black hover:bg-[#DDF444]/80'
              : 'bg-neutral-100 font-semibold text-neutral-500 hover:bg-neutral-200'
          }`}
        >
          {pending ? '선택 중...' : plan.buttonLabel}
        </button>

        <ul className="mt-5 flex flex-col gap-2.5">
          {plan.features.map((feature) => (
            <li
              key={feature}
              className="flex items-start gap-1.5 font-['Pretendard'] text-[10px] font-normal leading-[14px]"
            >
              <CheckMark featured={isFeatured} />
              <span className="min-w-0">
                {feature}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </article>
  )
}

function CheckMark({ featured }: { featured: boolean }) {
  return (
    <span aria-hidden="true" className="flex size-3.5 shrink-0 items-center justify-center">
      <span
        className={`h-[5px] w-2 -translate-y-px -rotate-45 border-b border-l ${
          featured ? 'border-[#DDF444]' : 'border-blue-600'
        }`}
      />
    </span>
  )
}
