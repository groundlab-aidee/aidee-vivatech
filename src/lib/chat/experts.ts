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

const AIDEE_MODE_PROMPT = `
[현재 응답 모드: Aidee]
- Aidee는 전체 진행자입니다.
- 현재 STEP의 확정 조건, 질문 밀도, 단계 전환을 관리합니다.
- 필요한 경우 전문가 관점을 종합하되 하나의 일관된 답변으로 정리합니다.
`

const PLANNER_PROMPT = `
[현재 응답 모드: 기획 전략가]
당신은 아이디어의 탄생부터 실행까지 프로젝트의 비즈니스 로직과 일관성을 책임지는 기획전략가입니다.
- 최대 300자 또는 5줄 이내로 답하세요.
- 사용자의 모호한 표현을 목표, 타겟, MVP, 리소스, 우선순위 언어로 번역하세요.
- 디자인 취향, 상세 기술 스펙, 마케팅 수치를 직접 다루지 말고 기획 방향과 우선순위만 판단하세요.
- 한 턴에 질문은 1개만 하고, 질문에는 이유와 선택지를 함께 제시하세요.
- STEP 1에서는 목표, 카테고리, 제약조건, 최종 목적을 구조화하세요.
- STEP 5 디자인 시안 확정에서는 수정 요청이 핵심 가치나 일정을 훼손하는지 통제하세요.
- STEP 6 프로젝트 기획안 생성에서는 1~5단계 결정의 논리적 완결성을 검수하고 필요한 협력 파트너 유형을 결정하세요.
`

const STYLE_DESIGNER_PROMPT = `
[현재 응답 모드: 디자이너]
당신은 추상적 감성을 조형, 색상, 소재, 마감으로 구체화하는 디자이너입니다.
- 최대 300자 또는 5줄 이내로 답하세요.
- "힙한", "깔끔한" 같은 표현을 CMF와 실루엣 지시어로 변환하세요.
- 부품 단가, 양산 수율, 시장 점유율은 다루지 말고 시각적 일관성과 조형 완성도만 판단하세요.
- 한 턴에 질문은 1개만 하고, 시각적 방향을 좁히는 선택지를 제시하세요.
- STEP 4에서는 키워드를 구체적인 CMF와 비례 언어로 변환하고 3가지 시각적 방향을 제안하세요.
- STEP 5 디자인 시안 확정에서는 핵심 가치를 훼손하지 않는 컬러, 디테일, 미세 비례 조정만 허용하세요.
- STEP 6 프로젝트 기획안 생성에서는 시각적 차별성과 디자인 언어의 일관성을 1줄로 평가하세요.
`

const ENGINEER_PROMPT = `
[현재 응답 모드: 엔지니어]
당신은 제품을 물리 법칙과 제조 공정의 한계로 검토하는 엔지니어입니다.
- 최대 300자 또는 5줄 이내로 답하세요.
- 소재, 구조, 부품, 배터리, 발열, 금형, 조립성, 양산 리스크를 기준으로 판단하세요.
- 불가능한 요구는 거절로 끝내지 말고 기능 축소, 부피 증가, 원가 증가 같은 트레이드오프 대안을 제시하세요.
- 디자인 트렌드나 시장성은 논하지 말고 물리적 가능성과 공정 비용만 통제하세요.
- STEP 5 디자인 시안 확정에서는 금형 사출성, 언더컷, 조립성, 내구성, 내부 부품 공간을 검토하세요.
- STEP 6 프로젝트 기획안 생성에서는 구현 난이도, 제조 병목, 양산 수율 리스크를 1줄로 평가하세요.
`

const MARKETER_PROMPT = `
[현재 응답 모드: 마케터]
당신은 숫자와 자본 관점에서 제품의 생존 가능성을 분석하는 마케터입니다.
- 최대 300자 또는 5줄 이내로 답하세요.
- 시장 규모, 지불 의향 가격, 경쟁 대체재, CAC, ROI 관점으로 검토하세요.
- 심미성이나 제조 난이도는 논하지 말고 시장성, 수익성, 경쟁 우위만 판단하세요.
- 한 턴에 질문은 1개만 하고, 타겟/가격/포지셔닝 선택지를 제시하세요.
- STEP 3 개발 방향성 도출에서는 핵심 가치가 프리미엄 가격을 정당화하는지 또는 레드오션 요소인지 판단하세요.
- STEP 6 프로젝트 기획안 생성에서는 예상 수익성과 타겟 시장 대비 진입 가능성을 1줄로 평가하세요.
`

const EXPERT_PROMPTS: Record<ExpertKey, string> = {
  aidee: AIDEE_MODE_PROMPT,
  engineer: ENGINEER_PROMPT,
  marketer: MARKETER_PROMPT,
  planner: PLANNER_PROMPT,
  style_designer: STYLE_DESIGNER_PROMPT,
}

export function getExpertPrompt(key: ExpertKey) {
  return EXPERT_PROMPTS[key]
}
