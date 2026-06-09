import Image from 'next/image'
import type { ReactNode } from 'react'

import {
  ProjectsCard,
  type DashboardProject,
} from '@/components/dashboard/ProjectsCard'
import { getMessageStage } from '@/lib/chat/persistence'
import {
  DEFAULT_STAGE_KEY,
  type StageKey,
} from '@/lib/chat/stages'
import { createClient } from '@/lib/supabase/server'

type ProjectRow = {
  created_at: string
  id: string
  is_favorite?: boolean | null
  requirements: unknown
  title: string | null
}

const summaryMetrics = [
  { label: '총 질문', value: '639' },
  { label: '총 답변', value: '1,824' },
  { label: '총 디자인 생성', value: '1,409' },
]

const tokenBalance = {
  purchased: 1200,
  remaining: 400,
}

const expertFeedback = [
  {
    icon: '/assets/icons/chat/strategist.svg',
    label: '기획전략가',
    value: 98,
  },
  {
    icon: '/assets/icons/chat/designer.svg',
    label: '스타일디자이너',
    value: 72,
  },
  {
    icon: '/assets/icons/chat/engineer.svg',
    label: '엔지니어',
    value: 33,
  },
  {
    icon: '/assets/icons/chat/marketer.svg',
    label: '마케터',
    value: 16,
  },
]

const partners = [
  { accent: 'from-blue-100 to-indigo-200', name: '프로토랩스 코리아', rating: '4.8' },
  { accent: 'from-cyan-100 to-sky-200', name: '(주)테크윈 솔루션', rating: '4.6' },
  { accent: 'from-violet-100 to-fuchsia-200', name: '라인웍스 디렉션', rating: '4.7' },
  { accent: 'from-[#DDF444]/30 to-[#DDF444]/70', name: '픽셀 투 프로덕트', rating: '4.5' },
  { accent: 'from-emerald-100 to-teal-200', name: '오브젝트 랩', rating: '4.9' },
  { accent: 'from-rose-100 to-pink-200', name: '볼드앤브레이브', rating: '4.4' },
  { accent: 'from-slate-100 to-slate-300', name: '마인드브릿지 컨설팅', rating: '4.7' },
  { accent: 'from-[#DDF444]/30 to-[#DDF444]/70', name: '(주)맥스텍', rating: '4.6' },
]

function getStringFromPath(value: unknown, path: string[]) {
  let current = value

  for (const key of path) {
    if (!current || typeof current !== 'object') {
      return undefined
    }

    current = (current as Record<string, unknown>)[key]
  }

  return typeof current === 'string' ? current : undefined
}

function mapProject(
  row: ProjectRow,
  stageKey: StageKey = DEFAULT_STAGE_KEY
): DashboardProject {
  return {
    createdAt: row.created_at,
    id: row.id,
    isFavorite: row.is_favorite === true,
    stageKey,
    title:
      row.title ||
      getStringFromPath(row.requirements, ['generated', 'title']) ||
      '새 프로젝트',
  }
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="font-['Inter'] text-[clamp(16px,1.042vw,20px)] font-semibold leading-6 text-zinc-950">
      {children}
    </h2>
  )
}

function SegmentedControl({ items }: { items: string[] }) {
  return (
    <div
      className="grid min-w-0 rounded-lg bg-[#CDE14D] p-0.5 shadow-inner"
      style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
    >
      {items.map((item, index) => (
        <button
          key={item}
          type="button"
          className={`rounded-md px-2 py-1 text-xs leading-4 transition ${
            index === 0
              ? 'bg-white font-medium text-zinc-900 shadow-sm'
              : 'font-normal text-zinc-500 hover:text-zinc-800'
          }`}
        >
          {item}
        </button>
      ))}
    </div>
  )
}

function TokenCard({
  purchased,
  remaining,
}: {
  purchased: number
  remaining: number
}) {
  const safePurchased = Math.max(0, purchased)
  const safeRemaining = Math.min(Math.max(0, remaining), safePurchased)
  const remainingPercentage =
    safePurchased > 0 ? Math.round((safeRemaining / safePurchased) * 100) : 0

  return (
    <section className="dashboard-summary-card flex min-h-0 flex-col justify-center overflow-hidden rounded-2xl bg-zinc-200 px-[clamp(10px,1.852svh,20px)]">
      <SectionTitle>토큰</SectionTitle>
      <div className="mt-[clamp(8px,1.852svh,20px)] grid h-[clamp(56px,7.87svh,85px)] w-full grid-cols-[minmax(0,192fr)_minmax(0,374fr)] items-center gap-[clamp(12px,1.458vw,28px)] overflow-hidden rounded-[10px] bg-white px-[clamp(12px,1.042vw,20px)] py-[clamp(6px,1.111svh,12px)]">
        <div className="flex h-10 min-w-0 items-end gap-1 whitespace-nowrap">
          <strong className="text-[clamp(36px,2.5vw,48px)] font-bold leading-10 text-zinc-950">
            {safeRemaining.toLocaleString('ko-KR')}
          </strong>
          <span className="text-[clamp(15px,1.042vw,20px)] font-medium leading-6 text-zinc-500">
            / {safePurchased.toLocaleString('ko-KR')}개
          </span>
        </div>

        <div className="w-full min-w-0">
          <div
            className="h-[clamp(32px,4.444svh,48px)] overflow-hidden rounded-[clamp(10px,1.481svh,16px)] bg-zinc-100 shadow-[inset_1px_1px_8px_0px_rgba(0,0,0,0.10)]"
            role="progressbar"
            aria-label="잔여 토큰 비율"
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
                  <span className="text-[clamp(22px,1.563vw,30px)] font-bold leading-10">{remainingPercentage}</span>
                  <span className="text-[clamp(14px,0.938vw,18px)] font-medium leading-7">%</span>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function FeedbackCard() {
  return (
    <section className="dashboard-summary-card flex min-h-0 flex-col justify-center overflow-hidden rounded-2xl bg-zinc-200 px-[clamp(10px,1.852svh,20px)]">
      <SectionTitle>전문가 피드백</SectionTitle>
      <div className="mt-[clamp(8px,1.852svh,20px)] grid grid-cols-4 gap-[clamp(6px,0.521vw,10px)]">
        {expertFeedback.map((expert) => (
          <div key={expert.label} className="flex h-[clamp(56px,7.87svh,85px)] min-w-0 flex-col justify-between rounded-[10px] bg-white p-[clamp(6px,0.926svh,10px)]">
            <div className="flex items-center gap-2">
              <Image
                src={expert.icon}
                alt=""
                width={20}
                height={20}
                unoptimized
                className="h-[clamp(16px,1.042vw,20px)] w-[clamp(16px,1.042vw,20px)] shrink-0 object-contain"
              />
              <span className="truncate text-xs font-semibold text-zinc-800">{expert.label}</span>
            </div>
            <strong className="text-right text-[clamp(24px,1.563vw,30px)] font-bold leading-8 text-zinc-900">{expert.value}</strong>
          </div>
        ))}
      </div>
    </section>
  )
}

function PartnerCard({ partner, index }: { partner: (typeof partners)[number]; index: number }) {
  return (
    <article className="group overflow-hidden rounded-xl border border-zinc-200 bg-white transition hover:-translate-y-0.5 hover:shadow-md">
      <div className={`relative flex h-24 items-center justify-center bg-gradient-to-br ${partner.accent}`}>
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/80 font-['Inter'] text-lg font-bold text-zinc-700 shadow-sm backdrop-blur">
          {String(index + 1).padStart(2, '0')}
        </div>
        <button type="button" aria-label={`${partner.name} 관심 파트너 등록`} className="absolute right-3 top-3 text-lg text-white drop-shadow hover:text-rose-500">
          ♡
        </button>
      </div>
      <div className="p-3">
        <h3 className="truncate text-sm font-medium leading-6 text-zinc-700">{partner.name}</h3>
        <div className="mt-1 flex items-center gap-1 text-xs">
          <span className="tracking-wider text-amber-400">★★★★★</span>
          <span className="font-medium text-zinc-400">{partner.rating}</span>
        </div>
        <div className="mt-3 flex gap-2">
          <span className="rounded-md bg-blue-50 px-2 py-1 text-[11px] font-medium text-blue-600">제품 디자인</span>
          <span className="rounded-md bg-zinc-100 px-2 py-1 text-[11px] font-medium text-zinc-500">개발</span>
        </div>
      </div>
    </article>
  )
}

function PartnersCard() {
  return (
    <section className="dashboard-detail-card flex min-h-0 flex-col overflow-hidden rounded-2xl bg-zinc-200 p-[clamp(12px,1.042vw,20px)]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <SectionTitle>협력 파트너</SectionTitle>
        <div className="w-full sm:w-56">
          <SegmentedControl items={['전체', '관심 파트너']} />
        </div>
      </div>
      <div className="dashboard-inner-scroll mt-5 min-h-0 flex-1 overflow-y-auto pr-2">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {partners.map((partner, index) => (
            <PartnerCard key={partner.name} index={index} partner={partner} />
          ))}
        </div>
      </div>
    </section>
  )
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const projectsQuery = user
    ? await supabase
        .from('projects')
        .select('id, title, created_at, requirements, is_favorite')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
    : { data: [], error: null }
  const { data, error } =
    user &&
    (projectsQuery.error?.code === 'PGRST204' ||
      (projectsQuery.error?.code === '42703' &&
        /is_favorite/i.test(projectsQuery.error.message)))
      ? await supabase
          .from('projects')
          .select('id, title, created_at, requirements')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
      : projectsQuery

  if (error) {
    console.warn('Failed to load dashboard projects.', {
      code: error.code,
      hint: error.hint,
      message: error.message,
    })
  }

  const projectRows = (data ?? []) as ProjectRow[]
  const projectIds = projectRows.map((project) => project.id)
  const messagesResult =
    user && projectIds.length > 0
      ? await supabase
          .from('messages')
          .select('project_id, content, seq_order, created_at')
          .eq('role', 'assistant')
          .in('project_id', projectIds)
          .order('seq_order', { ascending: false })
          .order('created_at', { ascending: false })
      : { data: [], error: null }

  if (messagesResult.error) {
    console.warn('Failed to load dashboard project stages.', {
      code: messagesResult.error.code,
      hint: messagesResult.error.hint,
      message: messagesResult.error.message,
    })
  }

  const stageByProjectId = new Map<string, StageKey>()

  for (const message of messagesResult.data ?? []) {
    if (!stageByProjectId.has(message.project_id)) {
      stageByProjectId.set(message.project_id, getMessageStage(message.content))
    }
  }

  const dashboardProjects = projectRows.map((project) =>
    mapProject(project, stageByProjectId.get(project.id))
  )

  return (
    <div className="dashboard-page mx-auto flex h-full w-full max-w-[1480px] flex-col overflow-hidden px-[clamp(16px,2.083vw,40px)] py-[clamp(16px,2.593svh,28px)] font-['Pretendard']">
      <div className="flex shrink-0 items-start justify-between gap-[clamp(16px,1.25vw,24px)] pb-[clamp(12px,1.852svh,20px)]">
        <div>
          <h1 className="text-[clamp(28px,1.875vw,36px)] font-bold leading-[clamp(40px,4.444svh,48px)] text-zinc-950">대시보드</h1>
        </div>
        <div className="grid shrink-0 grid-cols-3 gap-[clamp(20px,2.917vw,56px)]">
          {summaryMetrics.map((metric) => (
            <div key={metric.label}>
              <p className="text-sm font-medium leading-5 text-zinc-400">{metric.label}</p>
              <strong className="mt-1 block text-[clamp(24px,1.563vw,30px)] font-semibold leading-10 text-zinc-800">
                {metric.value}
              </strong>
            </div>
          ))}
        </div>
      </div>

      <div className="dashboard-columns grid min-h-0 flex-1 gap-[clamp(10px,0.833vw,16px)]">
        <div className="dashboard-column grid min-h-0 min-w-0 gap-[clamp(10px,0.833vw,16px)]">
          <TokenCard {...tokenBalance} />
          <ProjectsCard projects={dashboardProjects} />
        </div>
        <div className="dashboard-column grid min-h-0 min-w-0 gap-[clamp(10px,0.833vw,16px)]">
          <FeedbackCard />
          <PartnersCard />
        </div>
      </div>

    </div>
  )
}
