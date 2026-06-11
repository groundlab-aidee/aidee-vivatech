'use client'

import Image from 'next/image'
import type { ReactNode } from 'react'

import {
  DashboardSegmentedControl,
} from '@/components/dashboard/DashboardUi'
import {
  ProjectsCard,
  type DashboardProject,
} from '@/components/dashboard/ProjectsCard'
import {
  useAppLanguage,
  type AppLanguage,
} from '@/components/i18n/AppLanguageContext'

const tokenBalance = {
  purchased: 1200,
  remaining: 400,
}

const dashboardCopy = {
  ENG: {
    dashboard: 'Dashboard',
    favoritePartner: 'Add to favorite partners',
    feedback: 'Feedbacks from Mentors',
    metrics: ['Questions', 'Answers', 'Design Generated'],
    partnerFilters: ['All', 'Favorites'],
    partners: 'My Partners',
    productDesign: 'Product Design',
    development: 'Development',
    remainingTokenRatio: 'Remaining token ratio',
    tokens: 'Tokens',
  },
  KOR: {
    dashboard: '대시보드',
    favoritePartner: '관심 파트너 등록',
    feedback: '전문가 피드백',
    metrics: ['총 질문', '총 답변', '총 디자인 생성'],
    partnerFilters: ['전체', '관심 파트너'],
    partners: '협력 파트너',
    productDesign: '제품 디자인',
    development: '개발',
    remainingTokenRatio: '잔여 토큰 비율',
    tokens: '토큰',
  },
} satisfies Record<AppLanguage, Record<string, string | string[]>>

const summaryValues = ['639', '1,824', '1,409']

const expertFeedback = [
  {
    icon: '/assets/icons/chat/strategist.svg',
    labels: { ENG: 'Strategist', KOR: '기획전략가' },
    value: 98,
  },
  {
    icon: '/assets/icons/chat/designer.svg',
    labels: { ENG: 'Designer', KOR: '디자이너' },
    value: 72,
  },
  {
    icon: '/assets/icons/chat/engineer.svg',
    labels: { ENG: 'Engineer', KOR: '엔지니어' },
    value: 33,
  },
  {
    icon: '/assets/icons/chat/marketer.svg',
    labels: { ENG: 'Marketer', KOR: '마케터' },
    value: 16,
  },
] as const

const partners = [
  {
    accent: 'from-blue-100 to-indigo-200',
    names: { ENG: 'ProtoLabs Korea', KOR: '프로토랩스 코리아' },
    rating: '4.8',
  },
  {
    accent: 'from-cyan-100 to-sky-200',
    names: { ENG: 'Techwin Solution', KOR: '(주)테크윈 솔루션' },
    rating: '4.6',
  },
  {
    accent: 'from-violet-100 to-fuchsia-200',
    names: { ENG: 'Lineworks Direction', KOR: '라인웍스 디렉션' },
    rating: '4.7',
  },
  {
    accent: 'from-[#DDF444]/30 to-[#DDF444]/70',
    names: { ENG: 'Pixel to Product', KOR: '픽셀 투 프로덕트' },
    rating: '4.5',
  },
  {
    accent: 'from-emerald-100 to-teal-200',
    names: { ENG: 'Object Lab', KOR: '오브젝트 랩' },
    rating: '4.9',
  },
  {
    accent: 'from-rose-100 to-pink-200',
    names: { ENG: 'Bold & Brave', KOR: '볼드앤브레이브' },
    rating: '4.4',
  },
  {
    accent: 'from-slate-100 to-slate-300',
    names: { ENG: 'Mindbridge Consulting', KOR: '마인드브릿지 컨설팅' },
    rating: '4.7',
  },
  {
    accent: 'from-[#DDF444]/30 to-[#DDF444]/70',
    names: { ENG: 'Maxtech', KOR: '(주)맥스텍' },
    rating: '4.6',
  },
] as const

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="font-['Inter'] text-[clamp(16px,1.042vw,20px)] font-semibold leading-6 text-zinc-950">
      {children}
    </h2>
  )
}

function TokenCard({ language }: { language: AppLanguage }) {
  const safePurchased = Math.max(0, tokenBalance.purchased)
  const safeRemaining = Math.min(
    Math.max(0, tokenBalance.remaining),
    safePurchased
  )
  const remainingPercentage =
    safePurchased > 0 ? Math.round((safeRemaining / safePurchased) * 100) : 0
  const locale = language === 'ENG' ? 'en-US' : 'ko-KR'

  return (
    <section className="dashboard-summary-card flex min-h-0 flex-col justify-center overflow-hidden rounded-2xl bg-zinc-200 px-[clamp(10px,1.852svh,20px)]">
      <SectionTitle>{dashboardCopy[language].tokens}</SectionTitle>
      <div className="mt-[clamp(8px,1.852svh,20px)] grid h-[clamp(56px,7.87svh,85px)] w-full grid-cols-[minmax(0,192fr)_minmax(0,374fr)] items-center gap-[clamp(12px,1.458vw,28px)] overflow-hidden rounded-[10px] bg-white px-[clamp(12px,1.042vw,20px)] py-[clamp(6px,1.111svh,12px)]">
        <div className="flex h-10 min-w-0 items-end gap-1 whitespace-nowrap">
          <strong className="text-[clamp(36px,2.5vw,48px)] font-bold leading-10 text-zinc-950">
            {safeRemaining.toLocaleString(locale)}
          </strong>
          <span className="text-[clamp(15px,1.042vw,20px)] font-medium leading-6 text-zinc-500">
            / {safePurchased.toLocaleString(locale)}
            {language === 'KOR' ? '개' : ''}
          </span>
        </div>
        <div className="w-full min-w-0">
          <div
            className="h-[clamp(32px,4.444svh,48px)] overflow-hidden rounded-[clamp(10px,1.481svh,16px)] bg-zinc-100 shadow-[inset_1px_1px_8px_0px_rgba(0,0,0,0.10)]"
            role="progressbar"
            aria-label={dashboardCopy[language].remainingTokenRatio}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={remainingPercentage}
          >
            <div
              className="flex h-full items-center justify-center overflow-hidden whitespace-nowrap bg-blue-600 text-white"
              style={{ width: `${remainingPercentage}%` }}
            >
              {remainingPercentage > 0 ? (
                <>
                  <span className="text-[clamp(22px,1.563vw,30px)] font-bold leading-10">
                    {remainingPercentage}
                  </span>
                  <span className="text-[clamp(14px,0.938vw,18px)] font-medium leading-7">
                    %
                  </span>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function FeedbackCard({ language }: { language: AppLanguage }) {
  return (
    <section className="dashboard-summary-card flex min-h-0 flex-col justify-center overflow-hidden rounded-2xl bg-zinc-200 px-[clamp(10px,1.852svh,20px)]">
      <SectionTitle>{dashboardCopy[language].feedback}</SectionTitle>
      <div className="mt-[clamp(8px,1.852svh,20px)] grid grid-cols-4 gap-[clamp(6px,0.521vw,10px)]">
        {expertFeedback.map((expert) => (
          <div
            key={expert.labels.ENG}
            className="flex h-[clamp(56px,7.87svh,85px)] min-w-0 flex-col justify-between rounded-[10px] bg-white p-[clamp(6px,0.926svh,10px)]"
          >
            <div className="flex items-center gap-2">
              <Image
                src={expert.icon}
                alt=""
                width={20}
                height={20}
                unoptimized
                className="h-[clamp(16px,1.042vw,20px)] w-[clamp(16px,1.042vw,20px)] shrink-0 object-contain"
              />
              <span className="truncate text-xs font-semibold text-zinc-800">
                {expert.labels[language]}
              </span>
            </div>
            <strong className="text-right text-[clamp(24px,1.563vw,30px)] font-bold leading-8 text-zinc-900">
              {expert.value}
            </strong>
          </div>
        ))}
      </div>
    </section>
  )
}

function PartnersCard({ language }: { language: AppLanguage }) {
  const currentCopy = dashboardCopy[language]

  return (
    <section className="dashboard-detail-card flex min-h-0 flex-col overflow-hidden rounded-2xl bg-zinc-200 p-[clamp(12px,1.042vw,20px)]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <SectionTitle>{currentCopy.partners}</SectionTitle>
        <div className="w-full sm:w-56">
          <DashboardSegmentedControl
            ariaLabel={currentCopy.partners}
            items={currentCopy.partnerFilters.map((label, index) => ({
              label,
              value: String(index),
            }))}
            onChange={() => undefined}
            value="0"
          />
        </div>
      </div>
      <div className="dashboard-inner-scroll mt-5 min-h-0 flex-1 overflow-y-auto pr-2">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {partners.map((partner, index) => {
            const name = partner.names[language]

            return (
              <article
                key={partner.names.ENG}
                className="group overflow-hidden rounded-xl border border-zinc-200 bg-white transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div
                  className={`relative flex h-24 items-center justify-center bg-gradient-to-br ${partner.accent}`}
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/80 font-['Inter'] text-lg font-bold text-zinc-700 shadow-sm backdrop-blur">
                    {String(index + 1).padStart(2, '0')}
                  </div>
                  <button
                    type="button"
                    aria-label={`${name} ${currentCopy.favoritePartner}`}
                    className="absolute right-3 top-3 text-lg text-white drop-shadow hover:text-rose-500"
                  >
                    ♡
                  </button>
                </div>
                <div className="p-3">
                  <h3 className="truncate text-sm font-medium leading-6 text-zinc-700">
                    {name}
                  </h3>
                  <div className="mt-1 flex items-center gap-1 text-xs">
                    <span className="tracking-wider text-amber-400">★★★★★</span>
                    <span className="font-medium text-zinc-400">
                      {partner.rating}
                    </span>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <span className="rounded-md bg-blue-50 px-2 py-1 text-[11px] font-medium text-blue-600">
                      {currentCopy.productDesign}
                    </span>
                    <span className="rounded-md bg-zinc-100 px-2 py-1 text-[11px] font-medium text-zinc-500">
                      {currentCopy.development}
                    </span>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export function DashboardContent({
  projects,
}: {
  projects: DashboardProject[]
}) {
  const { language } = useAppLanguage()
  const currentCopy = dashboardCopy[language]

  return (
    <div className="dashboard-page mx-auto flex h-full w-full max-w-[1480px] flex-col overflow-hidden px-[clamp(16px,2.083vw,40px)] py-[clamp(16px,2.593svh,28px)] font-['Pretendard']">
      <div className="flex shrink-0 items-start justify-between gap-[clamp(16px,1.25vw,24px)] pb-[clamp(12px,1.852svh,20px)]">
        <h1 className="text-[clamp(28px,1.875vw,36px)] font-bold leading-[clamp(40px,4.444svh,48px)] text-zinc-950">
          {currentCopy.dashboard}
        </h1>
        <div className="grid shrink-0 grid-cols-3 gap-[clamp(20px,2.917vw,56px)]">
          {currentCopy.metrics.map((label, index) => (
            <div key={label}>
              <p className="text-sm font-medium leading-5 text-zinc-400">
                {label}
              </p>
              <strong className="mt-1 block text-[clamp(24px,1.563vw,30px)] font-semibold leading-10 text-zinc-800">
                {summaryValues[index]}
              </strong>
            </div>
          ))}
        </div>
      </div>

      <div className="dashboard-columns grid min-h-0 flex-1 gap-[clamp(10px,0.833vw,16px)]">
        <div className="dashboard-column grid min-h-0 min-w-0 gap-[clamp(10px,0.833vw,16px)]">
          <TokenCard language={language} />
          <ProjectsCard projects={projects} />
        </div>
        <div className="dashboard-column grid min-h-0 min-w-0 gap-[clamp(10px,0.833vw,16px)]">
          <FeedbackCard language={language} />
          <PartnersCard language={language} />
        </div>
      </div>
    </div>
  )
}
