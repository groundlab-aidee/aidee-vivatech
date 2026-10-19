export type BudgetValue = {
  amount: number | null
  source: '사용자 지정' | '예상' | '미정'
}

export type MarketingBudgetData = {
  currency: string
  totalBudget: BudgetValue
  allocations: Array<BudgetValue & { name: string }>
  recommendation: BudgetValue & { percent: number | null; reason: string }
  activities: Array<{ name: string; purpose: string; target: string }>
}

function parseBudgetValue(value: unknown): BudgetValue | null {
  if (!value || typeof value !== 'object') return null
  const candidate = value as Record<string, unknown>
  const amount = typeof candidate.amount === 'number' && Number.isFinite(candidate.amount) && candidate.amount >= 0
    ? candidate.amount
    : null
  const source = candidate.source === '사용자 지정' || candidate.source === '예상'
    ? candidate.source
    : '미정'
  return { amount, source: amount === null ? '미정' : source }
}

export function extractMarketingBudgetData(content: string): MarketingBudgetData | null {
  const block = content.match(/<<AIDEE_MARKETING_BUDGET>>\s*([\s\S]*?)\s*<</i)
  if (!block) return null
  try {
    const raw = JSON.parse(block[1]) as Record<string, unknown>
    const totalBudget = parseBudgetValue(raw.totalBudget)
    const rawRecommendation = raw.recommendation && typeof raw.recommendation === 'object'
      ? raw.recommendation as Record<string, unknown>
      : null
    const recommendationValue = parseBudgetValue(rawRecommendation)
    if (!totalBudget || !recommendationValue) return null
    const allocations = Array.isArray(raw.allocations)
      ? raw.allocations.flatMap((entry) => {
          if (!entry || typeof entry !== 'object') return []
          const candidate = entry as Record<string, unknown>
          const budget = parseBudgetValue(candidate)
          return budget && typeof candidate.name === 'string'
            ? [{ ...budget, name: candidate.name }]
            : []
        })
      : []
    const activities = Array.isArray(raw.activities)
      ? raw.activities.flatMap((entry) => {
          if (!entry || typeof entry !== 'object') return []
          const candidate = entry as Record<string, unknown>
          if (typeof candidate.name !== 'string') return []
          return [{
            name: candidate.name,
            purpose: typeof candidate.purpose === 'string' && candidate.purpose ? candidate.purpose : '미정',
            target: typeof candidate.target === 'string' && candidate.target ? candidate.target : '미정',
          }]
        })
      : []
    return {
      currency: typeof raw.currency === 'string' ? raw.currency : 'KRW',
      totalBudget,
      allocations,
      recommendation: {
        ...recommendationValue,
        percent: typeof rawRecommendation?.percent === 'number' && Number.isFinite(rawRecommendation.percent)
          ? rawRecommendation.percent
          : null,
        reason: typeof rawRecommendation?.reason === 'string' ? rawRecommendation.reason : '미정',
      },
      activities,
    }
  } catch {
    return null
  }
}

export function formatBudgetAmount(amount: number | null, currency: string) {
  if (amount === null) return '미정'
  const formatted = new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 0 }).format(amount)
  return currency === 'KRW' ? `₩${formatted}` : `${formatted} ${currency}`
}
