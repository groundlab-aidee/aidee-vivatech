'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useMemo, useState } from 'react'

import {
  DashboardEmptyState,
  DashboardSegmentedControl,
} from '@/components/dashboard/DashboardUi'
import { getProcessStepIndex, type StageKey } from '@/lib/chat/stages'

export type DashboardProject = {
  createdAt: string
  id: string
  isFavorite: boolean
  stageKey: StageKey
  title: string
}

type ProjectFilter = 'all' | 'complete' | 'favorite' | 'inProgress'

const filters: Array<{ key: ProjectFilter; label: string }> = [
  { key: 'all', label: '전체' },
  { key: 'favorite', label: '즐겨찾기' },
  { key: 'inProgress', label: '진행중' },
  { key: 'complete', label: '완료' },
]

const emptyMessages: Record<ProjectFilter, { description: string; title: string }> = {
  all: {
    description: '내 작업실에서 새 프로젝트를 시작해 보세요.',
    title: '생성된 프로젝트가 없습니다.',
  },
  favorite: {
    description: '자주 확인할 프로젝트에 별표를 추가해 보세요.',
    title: '즐겨찾기한 프로젝트가 없습니다.',
  },
  inProgress: {
    description: '모든 프로젝트가 7단계를 완료했습니다.',
    title: '진행 중인 프로젝트가 없습니다.',
  },
  complete: {
    description: '7단계까지 진행하면 여기에 표시됩니다.',
    title: '완료된 프로젝트가 없습니다.',
  },
}

function formatProjectDate(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}.${month}.${day}`
}

function ProjectCard({ project }: { project: DashboardProject }) {
  const currentStep = getProcessStepIndex(project.stageKey)
  const visualized = 11

  return (
    <article
      className="h-32 rounded-xl p-4"
      style={{ backgroundColor: 'rgba(21, 22, 23, 0.02)' }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-medium leading-6 text-[var(--semantic-text-tertiary)]">
              {project.title}
            </h3>
            <span className="rounded-full bg-[var(--semantic-surface-overlay-raised-strong)] px-2 py-0.5 text-xs font-semibold leading-5 text-[var(--semantic-text-tertiary)]">
              {visualized} Visualized Data
            </span>
          </div>
          <p className="mt-0.5 text-xs font-medium leading-5 text-[var(--semantic-text-quinary)]">
            {formatProjectDate(project.createdAt)}
          </p>
        </div>
        <Link
          href={`/workspace/project/${project.id}`}
          className="flex shrink-0 items-center gap-1 text-xs font-medium text-[var(--semantic-text-quaternary)] hover:text-blue-600"
        >
          바로가기
          <Image
            src="/assets/icons/dashboard/arrow-right.svg"
            alt=""
            width={14}
            height={14}
            unoptimized
            className="h-3.5 w-3.5 shrink-0"
          />
        </Link>
      </div>
      <div
        className="mt-3 grid h-6 grid-cols-7 overflow-hidden rounded-2xl bg-[var(--semantic-surface-overlay-sunken-strong)] ring-1 ring-inset ring-zinc-300"
        aria-label={`7단계 중 ${currentStep}단계 진행`}
      >
        {Array.from({ length: 7 }, (_, index) => (
          <div
            key={index}
            className={`flex min-w-0 items-center justify-center border-r border-white/60 text-xs font-semibold last:border-r-0 ${
              index < currentStep
                ? 'bg-gradient-to-b from-blue-400 to-blue-600 text-[var(--semantic-accent-static-white)]'
                : 'text-[var(--semantic-text-quinary)]'
            }`}
          >
            {index + 1}
          </div>
        ))}
      </div>
    </article>
  )
}

export function ProjectsCard({ projects }: { projects: DashboardProject[] }) {
  const [filter, setFilter] = useState<ProjectFilter>('all')
  const filteredProjects = useMemo(() => {
    switch (filter) {
      case 'favorite':
        return projects.filter((project) => project.isFavorite)
      case 'inProgress':
        return projects.filter(
          (project) => getProcessStepIndex(project.stageKey) < 7
        )
      case 'complete':
        return projects.filter(
          (project) => getProcessStepIndex(project.stageKey) === 7
        )
      default:
        return projects
    }
  }, [filter, projects])
  const emptyMessage = emptyMessages[filter]

  return (
    <section className="dashboard-detail-card flex min-h-0 flex-col overflow-hidden rounded-2xl bg-[#D7D7D7] p-[clamp(12px,1.042vw,20px)]">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-['Inter'] text-[clamp(16px,1.042vw,20px)] font-semibold leading-6 text-zinc-950">
            프로젝트
          </h2>
          <div className="mt-2 flex items-end gap-1">
            <strong className="text-3xl font-bold leading-10 text-zinc-950">
              {filteredProjects.length.toLocaleString('ko-KR')}
            </strong>
            <span className="pb-1 text-lg font-medium text-zinc-700">개</span>
          </div>
        </div>
        <div className="w-full sm:w-80">
          <DashboardSegmentedControl
            ariaLabel="프로젝트 필터"
            items={filters.map((item) => ({
              label: item.label,
              value: item.key,
            }))}
            onChange={setFilter}
            value={filter}
          />
        </div>
      </div>

      <div className="project-list-scroll mt-4 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto rounded-[10px] bg-[var(--semantic-surface-background-default)] p-3 pr-2">
        {filteredProjects.length > 0 ? (
          filteredProjects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))
        ) : (
          <DashboardEmptyState
            description={emptyMessage.description}
            icon={filter === 'favorite' ? '☆' : '—'}
            title={emptyMessage.title}
          />
        )}
      </div>
    </section>
  )
}
