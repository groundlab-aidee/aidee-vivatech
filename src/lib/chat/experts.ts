export type ExpertKey =
  | 'aidee'
  | 'planner'
  | 'engineer'
  | 'marketer'
  | 'style_designer'

export type ExpertDefinition = {
  accentClassName: string
  inputLabel: string
  key: ExpertKey
  label: string
  loadingLabel: string
}

export const EXPERT_DEFINITIONS: ExpertDefinition[] = [
  {
    accentClassName: 'bg-blue-50 text-blue-700 ring-blue-200',
    inputLabel: 'Aidee에게 물어보세요',
    key: 'aidee',
    label: 'Aidee',
    loadingLabel: 'Aidee가 답변을 정리하고 있어요.',
  },
  {
    accentClassName: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
    inputLabel: '기획 전략가에게 물어보세요',
    key: 'planner',
    label: '기획 전략가',
    loadingLabel: '기획 전략가의 답변을 로딩중이에요.',
  },
  {
    accentClassName: 'bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-200',
    inputLabel: '디자이너에게 물어보세요',
    key: 'style_designer',
    label: '디자이너',
    loadingLabel: '디자이너의 답변을 로딩중이에요.',
  },
  {
    accentClassName: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    inputLabel: '엔지니어에게 물어보세요',
    key: 'engineer',
    label: '엔지니어',
    loadingLabel: '엔지니어의 답변을 로딩중이에요.',
  },
  {
    accentClassName: 'bg-sky-50 text-sky-700 ring-sky-200',
    inputLabel: '마케터에게 물어보세요',
    key: 'marketer',
    label: '마케터',
    loadingLabel: '마케터의 답변을 로딩중이에요.',
  },
]

export function isExpertKey(value: unknown): value is ExpertKey {
  return (
    typeof value === 'string' &&
    EXPERT_DEFINITIONS.some((expert) => expert.key === value)
  )
}

export function getExpertDefinition(key: ExpertKey) {
  return (
    EXPERT_DEFINITIONS.find((expert) => expert.key === key) ??
    EXPERT_DEFINITIONS[0]
  )
}

import { ENGINEER_PROMPT } from '@/lib/chat/prompts/experts/engineer'
import { MARKETER_PROMPT } from '@/lib/chat/prompts/experts/marketer'
import { PLANNING_STRATEGIST_PROMPT } from '@/lib/chat/prompts/experts/strategist'
import { STYLE_DESIGNER_PROMPT } from '@/lib/chat/prompts/experts/designer'

const AIDEE_MODE_PROMPT = `
[현재 응답 모드: Aidee]
- Aidee는 전체 진행자입니다.
- 현재 STEP의 확정 조건, 질문 밀도, 단계 전환을 관리합니다.
- 필요한 경우 전문가 관점을 종합하되 하나의 일관된 답변으로 정리합니다.
`

const EXPERT_PROMPTS: Record<ExpertKey, string> = {
  aidee: AIDEE_MODE_PROMPT,
  engineer: ENGINEER_PROMPT,
  marketer: MARKETER_PROMPT,
  planner: PLANNING_STRATEGIST_PROMPT,
  style_designer: STYLE_DESIGNER_PROMPT,
}

export function getExpertPrompt(key: ExpertKey) {
  return EXPERT_PROMPTS[key]
}
