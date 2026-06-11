'use client'

import Image from 'next/image'
import { useState, type ReactNode } from 'react'

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
    emptyFavorites: 'No favorite partners yet.',
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
    emptyFavorites: '관심 파트너가 없습니다.',
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
    image: '/assets/images/partner1png.png',
    names: { ENG: 'ProtoLabs Korea', KOR: '프로토랩스 코리아' },
    rating: '4.8',
  },
  {
    accent: 'from-cyan-100 to-sky-200',
    image: '/assets/images/partner2.png',
    names: { ENG: 'Techwin Solution', KOR: '(주)테크윈 솔루션' },
    rating: '4.6',
  },
  {
    accent: 'from-violet-100 to-fuchsia-200',
    image: '/assets/images/partner3.png',
    names: { ENG: 'Lineworks Direction', KOR: '라인웍스 디렉션' },
    rating: '4.7',
  },
  {
    accent: 'from-[#DDF444]/30 to-[#DDF444]/70',
    image: '/assets/images/partner4.png',
    names: { ENG: 'Pixel to Product', KOR: '픽셀 투 프로덕트' },
    rating: '4.5',
  },
  {
    accent: 'from-emerald-100 to-teal-200',
    image: '/assets/images/partner5.png',
    names: { ENG: 'Object Lab', KOR: '오브젝트 랩' },
    rating: '4.9',
  },
  {
    accent: 'from-rose-100 to-pink-200',
    image: '/assets/images/partner6.png',
    names: { ENG: 'Bold & Brave', KOR: '볼드앤브레이브' },
    rating: '4.4',
  },
  {
    accent: 'from-slate-100 to-slate-300',
    image: '/assets/images/partner7.png',
    names: { ENG: 'Mindbridge Consulting', KOR: '마인드브릿지 컨설팅' },
    rating: '4.7',
  },
  {
    accent: 'from-[#DDF444]/30 to-[#DDF444]/70',
    image: '/assets/images/partner8.png',
    names: { ENG: 'Maxtech', KOR: '(주)맥스텍' },
    rating: '4.6',
  },
  {
    accent: 'from-orange-100 to-amber-200',
    image: '/assets/images/partner9.png',
    names: { ENG: 'Partner 9', KOR: '협력 파트너 9' },
    rating: '4.8',
  },
  {
    accent: 'from-zinc-100 to-zinc-200',
    image: '/assets/images/partner10.png',
    names: { ENG: 'Partner 10', KOR: '협력 파트너 10' },
    rating: '4.5',
  },
  {
    accent: 'from-slate-100 to-gray-200',
    image: '/assets/images/partner11.png',
    names: { ENG: 'Partner 11', KOR: '협력 파트너 11' },
    rating: '4.7',
  },
  {
    accent: 'from-stone-100 to-neutral-200',
    image: '/assets/images/partner12.png',
    names: { ENG: 'Partner 12', KOR: '협력 파트너 12' },
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
  const [partnerFilter, setPartnerFilter] = useState<'all' | 'favorites'>('all')
  const [favoritePartners, setFavoritePartners] = useState<Set<string>>(
    () => new Set([partners[1].names.ENG])
  )
  const visiblePartners =
    partnerFilter === 'favorites'
      ? partners.filter((partner) =>
          favoritePartners.has(partner.names.ENG)
        )
      : partners
  const partnerFilterItems: Array<{
    label: string
    value: 'all' | 'favorites'
  }> = currentCopy.partnerFilters.map((label, index) => ({
    label,
    value: index === 0 ? 'all' : 'favorites',
  }))

  function toggleFavorite(partnerId: string) {
    setFavoritePartners((current) => {
      const next = new Set(current)

      if (next.has(partnerId)) {
        next.delete(partnerId)
      } else {
        next.add(partnerId)
      }

      return next
    })
  }

  return (
    <section className="dashboard-detail-card flex min-h-0 flex-col overflow-hidden rounded-2xl bg-zinc-200 p-[clamp(12px,1.042vw,20px)]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <SectionTitle>{currentCopy.partners}</SectionTitle>
        <div className="w-full sm:w-56">
          <DashboardSegmentedControl
            ariaLabel={currentCopy.partners}
            items={partnerFilterItems}
            onChange={setPartnerFilter}
            value={partnerFilter}
          />
        </div>
      </div>
      <div className="dashboard-inner-scroll mt-5 min-h-0 flex-1 overflow-y-auto pr-2">
        <div className="grid grid-cols-4 gap-2">
          {visiblePartners.map((partner) => {
            const name = partner.names[language]
            const partnerId = partner.names.ENG
            const isFavorite = favoritePartners.has(partnerId)
            const filledStars = Math.round(Number(partner.rating))

            return (
              <article
                key={partnerId}
                className="relative mx-auto aspect-[3/4] w-full max-w-36 min-w-0 overflow-hidden rounded-[clamp(6px,6.944cqw,10px)] bg-white transition [container-type:inline-size] hover:-translate-y-0.5 hover:shadow-md"
              >
                <div
                  className={`relative h-[58.333%] overflow-hidden rounded-t-[clamp(6px,6.944cqw,10px)] rounded-b-[clamp(12px,13.889cqw,20px)] border-[clamp(2px,2.083cqw,3px)] border-zinc-200 bg-gradient-to-br ${partner.accent}`}
                >
                  <Image
                    src={partner.image}
                    alt=""
                    fill
                    sizes="144px"
                    unoptimized
                    className="object-cover object-center"
                  />
                  <button
                    type="button"
                    aria-label={`${name} ${currentCopy.favoritePartner}`}
                    aria-pressed={isFavorite}
                    onClick={() => toggleFavorite(partnerId)}
                    className="absolute right-[7%] top-[8%] flex h-[clamp(14px,13.889cqw,20px)] w-[clamp(14px,13.889cqw,20px)] items-center justify-center rounded transition hover:bg-black/10"
                  >
                    <Image
                      src={
                        isFavorite
                          ? '/assets/icons/dashboard/favorite-filled.svg'
                          : '/assets/icons/dashboard/favorite-blank.svg'
                      }
                      alt=""
                      width={12}
                      height={17}
                      unoptimized
                      className="h-[clamp(11px,11.111cqw,16px)] w-auto object-contain"
                    />
                  </button>
                </div>
                <div className="absolute inset-x-0 bottom-0 h-[55.208%] rounded-b-[clamp(6px,6.944cqw,10px)] bg-white px-[8.333%] pb-[8.333%] pt-[4.167%]">
                  <h3 className="truncate font-['Inter'] text-[clamp(9px,9.722cqw,14px)] font-medium leading-[clamp(16px,16.667cqw,24px)] text-zinc-700">
                    {name}
                  </h3>
                  <div className="mt-[1%] flex h-[clamp(8px,8.333cqw,12px)] min-w-0 items-center gap-[clamp(2px,2.778cqw,4px)]">
                    <div className="flex items-center gap-[1px]">
                      {Array.from({ length: 5 }, (_, index) => (
                        <Image
                          key={index}
                          src={
                            index < filledStars
                              ? '/assets/icons/dashboard/star-filled.svg'
                              : '/assets/icons/dashboard/star-blank.svg'
                          }
                          alt=""
                          width={14}
                          height={13}
                          unoptimized
                          className="h-[clamp(8px,8.333cqw,12px)] w-[clamp(9px,9.722cqw,14px)] object-contain"
                        />
                      ))}
                    </div>
                    <span className="font-['Inter'] text-[clamp(8px,6.944cqw,10px)] font-medium leading-none text-zinc-500">
                      {partner.rating}
                    </span>
                  </div>
                  <div className="mt-[11%] flex items-center gap-[clamp(8px,9.722cqw,14px)]">
                    <button
                      type="button"
                      aria-label={`${name} homepage`}
                      className="flex h-[clamp(11px,11.111cqw,16px)] w-[clamp(11px,11.111cqw,16px)] items-center justify-center"
                    >
                      <Image
                        src="/assets/icons/dashboard/homepage.svg"
                        alt=""
                        width={20}
                        height={20}
                        unoptimized
                        className="h-full w-full object-contain"
                      />
                    </button>
                    <button
                      type="button"
                      aria-label={`${name} contact`}
                      className="flex h-[clamp(11px,11.111cqw,16px)] w-[clamp(11px,11.111cqw,16px)] items-center justify-center"
                    >
                      <Image
                        src="/assets/icons/dashboard/contact.svg"
                        alt=""
                        width={18}
                        height={18}
                        unoptimized
                        className="h-full w-full object-contain"
                      />
                    </button>
                  </div>
                </div>
              </article>
            )
          })}
          {visiblePartners.length === 0 ? (
            <div className="col-span-4 flex min-h-40 items-center justify-center rounded-xl bg-white text-center text-sm font-medium text-zinc-400">
              {currentCopy.emptyFavorites}
            </div>
          ) : null}
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
