export type TimelineScope = '제품 기획 및 개발' | '시제품 제작' | '양산 및 판매'
export type TimelineDurationSource = '사용자 지정' | '예상' | '미정'

export type TimelineStage = {
  tasks: string[]
  duration: string
  source: TimelineDurationSource
}

export type DevelopmentTimelineData = {
  summary: {
    idea: string
    category: string
    size: string
    features: string
    scope: TimelineScope | null
    budget: string
    targetUnitCost: string
    desiredDuration: string
    desiredDurationSource: TimelineDurationSource
    salesStrategy: string
  }
  stages: TimelineStage[]
}

const STAGE_NAMES = ['제품 기획', '제품 개발', '제품 검증', '양산 준비', '시장 진입']

export function extractDevelopmentTimelineData(content: string): DevelopmentTimelineData | null {
  const block = content.match(/<<AIDEE_DEVELOPMENT_TIMELINE>>\s*([\s\S]*?)\s*<</i)
  if (!block) return null
  try {
    const raw = JSON.parse(block[1]) as Record<string, unknown>
    const summary = raw.summary && typeof raw.summary === 'object' ? raw.summary as Record<string, unknown> : null
    if (!summary) return null
    const scope = summary.scope === '제품 기획 및 개발' || summary.scope === '시제품 제작' || summary.scope === '양산 및 판매'
      ? summary.scope
      : null
    const getSummary = (key: string) => typeof summary[key] === 'string' && summary[key] ? summary[key] as string : '—'
    const rawStages = Array.isArray(raw.stages) ? raw.stages : []
    const stages = STAGE_NAMES.map((_, index) => {
      const candidate = rawStages[index] && typeof rawStages[index] === 'object' ? rawStages[index] as Record<string, unknown> : {}
      return {
        tasks: Array.isArray(candidate.tasks) ? candidate.tasks.filter((task): task is string => typeof task === 'string' && Boolean(task.trim())).map((task) => task.trim()) : [],
        duration: typeof candidate.duration === 'string' && candidate.duration ? candidate.duration : '',
        source: (candidate.source === '사용자 지정' || candidate.source === '예상' ? candidate.source : '미정') as TimelineDurationSource,
      }
    })
    return {
      summary: {
        idea: getSummary('idea'), category: getSummary('category'), size: getSummary('size'),
        features: getSummary('features'), scope, budget: getSummary('budget'),
        targetUnitCost: getSummary('targetUnitCost'), desiredDuration: getSummary('desiredDuration'),
        desiredDurationSource: summary.desiredDurationSource === '사용자 지정' || summary.desiredDurationSource === '예상'
          ? summary.desiredDurationSource
          : '미정',
        salesStrategy: getSummary('salesStrategy'),
      },
      stages,
    }
  } catch {
    return null
  }
}

export function getTimelineScopeEnd(scope: TimelineScope | null) {
  if (!scope) return 0
  return scope === '제품 기획 및 개발' ? 2 : scope === '시제품 제작' ? 4 : 5
}
