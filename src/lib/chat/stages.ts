export type StageKey =
  | 'step_0_start'
  | 'step_1_idea'
  | 'step_2_persona'
  | 'step_2_research'
  | 'step_3_direction'
  | 'step_4_style'
  | 'step_5_design'
  | 'step_6_rfp'
  | 'step_6_company'

export type StageMeta = {
  currentStageKey: StageKey
  nextStageKey: StageKey
  reason: string
  transition: boolean
}

export const DEFAULT_STAGE_KEY: StageKey = 'step_0_start'

const NEXT_STAGE_KEY_MAP: Record<StageKey, StageKey | null> = {
  step_0_start: 'step_1_idea',
  step_1_idea: 'step_2_persona',
  step_2_persona: 'step_2_research',
  step_2_research: 'step_3_direction',
  step_3_direction: 'step_4_style',
  step_4_style: 'step_5_design',
  step_5_design: 'step_6_rfp',
  step_6_rfp: 'step_6_company',
  step_6_company: null,
}

export function isKnownStageKey(value: unknown): value is StageKey {
  return (
    typeof value === 'string' &&
    Object.prototype.hasOwnProperty.call(NEXT_STAGE_KEY_MAP, value)
  )
}

export function getNextStageKey(stageKey: StageKey) {
  return NEXT_STAGE_KEY_MAP[stageKey] ?? null
}

export function getProcessStepIndex(stageKey: StageKey) {
  switch (stageKey) {
    case 'step_0_start':
    case 'step_1_idea':
      return 1
    case 'step_2_persona':
    case 'step_2_research':
      return 2
    case 'step_3_direction':
      return 3
    case 'step_4_style':
      return 4
    case 'step_5_design':
      return 5
    case 'step_6_rfp':
      return 6
    case 'step_6_company':
      return 7
  }
}

export function canRequestRfpStage(stageKey: StageKey) {
  return stageKey === 'step_5_design' || stageKey === 'step_6_rfp'
}

export function canRequestCompanyStage(stageKey: StageKey) {
  return stageKey === 'step_6_rfp' || stageKey === 'step_6_company'
}

export function hasStyleReferenceSelection(text: string) {
  return /([1-3])\s*번|이미지\s*([1-3])|레퍼런스\s*([1-3])|첫\s*번째|두\s*번째|세\s*번째|선택|확정/.test(
    text
  )
}

export function hasDesignFinalSelection(text: string) {
  if (/수정|바꿔|변경|조정|다듬|발전|재생성/i.test(text)) {
    return false
  }

  return /(?:디자인|시안|렌더|안|[1-3]\s*번).*(?:확정|최종|진행|좋아|갈게|하겠습니다)|최종\s*확정/i.test(
    text
  )
}

export function resolveIntentStageKey({
  currentStageKey,
  hasCompletedDirectionResearch = false,
  hasCompletedStep2Research = false,
  lastUserMessage,
}: {
  currentStageKey: StageKey
  hasCompletedDirectionResearch?: boolean
  hasCompletedStep2Research?: boolean
  lastUserMessage: string
}): StageKey {
  if (
    currentStageKey === 'step_2_research' &&
    hasCompletedStep2Research &&
    /(?:궁금한\s*점|더\s*탐색|추가\s*질문).*(?:없|괜찮)|없어|없습니다|다음\s*(?:단계|STEP)|STEP\s*3|넘어가/i.test(
      lastUserMessage
    )
  ) {
    return 'step_3_direction'
  }

  if (
    currentStageKey === 'step_3_direction' &&
    hasCompletedDirectionResearch &&
    /다음\s*(?:단계|STEP)|STEP\s*4|스타일\s*(?:단계|컨셉)|넘어가|진행/i.test(
      lastUserMessage
    )
  ) {
    return 'step_4_style'
  }

  if (currentStageKey === 'step_4_style' && hasStyleReferenceSelection(lastUserMessage)) {
    return 'step_5_design'
  }

  if (currentStageKey === 'step_5_design' && hasDesignFinalSelection(lastUserMessage)) {
    return 'step_6_rfp'
  }

  if (/협력\s*(?:업체|파트너)|업체\s*추천|파트너|vendor|company/i.test(lastUserMessage)) {
    return canRequestCompanyStage(currentStageKey)
      ? 'step_6_company'
      : currentStageKey
  }

  if (/rfp|제안\s*요청서|프로젝트\s*기획안|기획안\s*생성|문서\s*생성|pdf/i.test(lastUserMessage)) {
    return canRequestRfpStage(currentStageKey) ? 'step_6_rfp' : currentStageKey
  }

  if (
    currentStageKey === 'step_6_rfp' &&
    /다음\s*(?:단계|STEP)|STEP\s*7|협력\s*(?:업체|파트너)|파트너|넘어가|진행/i.test(
      lastUserMessage
    )
  ) {
    return 'step_6_company'
  }

  return currentStageKey
}

export function inferStageMetaFromText({
  currentStageKey,
  text,
}: {
  currentStageKey: StageKey
  text: string
}): StageMeta {
  if (/STEP\s*1|아이디어|개발 조건/i.test(text) && currentStageKey === 'step_0_start') {
    return {
      currentStageKey,
      nextStageKey: 'step_1_idea',
      reason: 'text_mentions_step_1',
      transition: true,
    }
  }

  if (/STEP\s*2|페르소나/i.test(text) && currentStageKey === 'step_1_idea') {
    return {
      currentStageKey,
      nextStageKey: 'step_2_persona',
      reason: 'text_mentions_step_2',
      transition: true,
    }
  }

  if (/STEP\s*3|방향/i.test(text) && currentStageKey.startsWith('step_2')) {
    return {
      currentStageKey,
      nextStageKey: 'step_3_direction',
      reason: 'text_mentions_step_3',
      transition: true,
    }
  }

  if (/STEP\s*4|스타일|레퍼런스/i.test(text) && currentStageKey === 'step_3_direction') {
    return {
      currentStageKey,
      nextStageKey: 'step_4_style',
      reason: 'text_mentions_step_4',
      transition: true,
    }
  }

  const nextStageKey = getNextStageKey(currentStageKey) ?? currentStageKey

  return {
    currentStageKey,
    nextStageKey: currentStageKey,
    reason: nextStageKey === currentStageKey ? 'final_stage' : 'stay',
    transition: false,
  }
}
