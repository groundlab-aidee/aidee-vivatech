export type StageKey =
  | 'step_0_start'
  | 'step_1_idea'
  | 'step_2_agent'
  | 'step_3_persona'
  | 'step_3_research'
  | 'step_4_direction'
  | 'step_5_style'
  | 'step_5_design'
  | 'step_5_cmf'
  | 'step_5_3d'
  | 'step_6_structure'
  | 'step_7_market'
  | 'step_7_rfp'

export type ChatAction =
  | 'confirm_artifact'
  | 'confirm_step_2_team'
  | 'confirm_process'
  | 'confirm_moodboard'
  | 'confirm_and_visualize_artifact'
  | 'visualize_artifact'
  | 'complete_certification_visualization'
  | 'confirm_form_design_summary'
  | 'start_step_3'
  | 'start_step_2'
  | 'start_step_6'
  | 'stay_in_step_1'
  | 'stay_in_step_2'
  | 'select_step5_shape'
  | 'select_step5_form'
  | 'confirm_step5_combination'
  | 'return_to_aidee'

export type StageMeta = {
  currentStageKey: StageKey
  nextStageKey: StageKey
  reason: string
  transition: boolean
}

export const DEFAULT_STAGE_KEY: StageKey = 'step_0_start'

const NEXT_STAGE_KEY_MAP: Record<StageKey, StageKey | null> = {
  step_0_start: 'step_1_idea',
  step_1_idea: 'step_2_agent',
  step_2_agent: 'step_3_persona',
  step_3_persona: 'step_3_research',
  step_3_research: 'step_4_direction',
  step_4_direction: 'step_5_style',
  step_5_style: 'step_5_design',
  step_5_design: 'step_5_cmf',
  step_5_cmf: 'step_5_3d',
  step_5_3d: 'step_6_structure',
  step_6_structure: 'step_7_market',
  step_7_market: 'step_7_rfp',
  step_7_rfp: null,
}

const STAGE_ORDER: StageKey[] = [
  'step_0_start',
  'step_1_idea',
  'step_2_agent',
  'step_3_persona',
  'step_3_research',
  'step_4_direction',
  'step_5_style',
  'step_5_design',
  'step_5_cmf',
  'step_5_3d',
  'step_6_structure',
  'step_7_market',
  'step_7_rfp',
]

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
    case 'step_2_agent':
      return 2
    case 'step_3_persona':
    case 'step_3_research':
      return 3
    case 'step_4_direction':
      return 4
    case 'step_5_style':
    case 'step_5_design':
    case 'step_5_cmf':
    case 'step_5_3d':
      return 5
    case 'step_6_structure':
      return 6
    case 'step_7_market':
    case 'step_7_rfp':
      return 7
  }
}

export function getLaterStageKey(left: StageKey, right: StageKey) {
  return STAGE_ORDER.indexOf(right) > STAGE_ORDER.indexOf(left) ? right : left
}

export function canRequestRfpStage(stageKey: StageKey) {
  return stageKey === 'step_7_rfp'
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

export function resolveStageStartAction(
  currentStageKey: StageKey,
  message: string
): StageKey | null {
  const match = message.trim().match(/^STEP\s*([1-7])\s*시작할게요[.!?？]?$/i)

  if (!match) {
    return null
  }

  const targetStep = Number(match[1])
  const allowedTransitions: Partial<Record<StageKey, [number, StageKey]>> = {
    step_0_start: [1, 'step_1_idea'],
    step_1_idea: [2, 'step_2_agent'],
    step_2_agent: [3, 'step_3_persona'],
    step_3_persona: [4, 'step_4_direction'],
    step_3_research: [4, 'step_4_direction'],
    step_4_direction: [5, 'step_5_style'],
    step_5_3d: [6, 'step_6_structure'],
    step_6_structure: [7, 'step_7_market'],
  }
  const transition = allowedTransitions[currentStageKey]

  return transition?.[0] === targetStep ? transition[1] : null
}

export function resolveIntentStageKey({
  action,
  currentStageKey,
  hasCompletedDirectionResearch = false,
  hasCompletedDirectionFlow = false,
  hasCompletedStep2Research = false,
  lastUserMessage,
}: {
  action?: ChatAction | null
  currentStageKey: StageKey
  hasCompletedDirectionResearch?: boolean
  hasCompletedDirectionFlow?: boolean
  hasCompletedStep2Research?: boolean
  lastUserMessage: string
}): StageKey {
  if (action === 'start_step_6') {
    return currentStageKey.startsWith('step_5')
      ? 'step_6_structure'
      : currentStageKey
  }

  if (action === 'start_step_2') {
    return currentStageKey === 'step_1_idea' ? 'step_2_agent' : currentStageKey
  }

  if (action === 'start_step_3') {
    return currentStageKey === 'step_2_agent'
      ? 'step_3_persona'
      : currentStageKey
  }

  if (action === 'confirm_process' || action === 'stay_in_step_1') {
    return currentStageKey === 'step_1_idea' ? 'step_1_idea' : currentStageKey
  }

  if (action === 'confirm_moodboard') {
    return currentStageKey === 'step_5_style'
      ? 'step_5_design'
      : currentStageKey
  }

  if (action === 'confirm_step_2_team' || action === 'stay_in_step_2') {
    return currentStageKey === 'step_2_agent'
      ? 'step_2_agent'
      : currentStageKey
  }

  if (currentStageKey === 'step_0_start' && lastUserMessage.trim()) {
    return 'step_1_idea'
  }

  const explicitStageStart = resolveStageStartAction(
    currentStageKey,
    lastUserMessage
  )

  if (
    explicitStageStart &&
    explicitStageStart !== 'step_2_agent' &&
    !(
      currentStageKey === 'step_4_direction' &&
      (!hasCompletedDirectionResearch || !hasCompletedDirectionFlow)
    )
  ) {
    return explicitStageStart
  }

  // "STEP 1 시작할게요"는 step_0_start 프로세스 소개 후 STEP 1 진입 신호다.
  if (
    (currentStageKey === 'step_0_start' || currentStageKey === 'step_1_idea') &&
    /STEP\s*1\s*시작할게요/i.test(lastUserMessage)
  ) {
    return 'step_1_idea'
  }

  if (
    currentStageKey === 'step_2_agent' &&
    /STEP\s*3(?:로)?\s*(?:진행|넘어가|시작)|STEP\s*3\s*시작할게요/i.test(
      lastUserMessage
    )
  ) {
    return 'step_3_persona'
  }

  if (
    currentStageKey === 'step_3_research' &&
    hasCompletedStep2Research &&
    /STEP\s*4\s*시작할게요|다음\s*단계로\s*진행할게요|(?:궁금한\s*점|더\s*탐색|추가\s*질문).*(?:없|괜찮)|없어|없습니다|넘어가/i.test(
      lastUserMessage
    )
  ) {
    return 'step_4_direction'
  }

  if (
    currentStageKey === 'step_4_direction' &&
    hasCompletedDirectionResearch &&
    hasCompletedDirectionFlow &&
    /STEP\s*5\s*시작할게요/i.test(lastUserMessage)
  ) {
    return 'step_5_style'
  }

  if (
    currentStageKey === 'step_5_design' &&
    /2D\s*(?:렌더링\s*)?시안을\s*(?:최종\s*)?확정하고\s*시각화(?:했어요|했습니다|했어)/i.test(
      lastUserMessage
    )
  ) {
    return 'step_5_cmf'
  }

  if (
    currentStageKey === 'step_5_3d' &&
    /STEP\s*6\s*시작할게요/i.test(lastUserMessage)
  ) {
    return 'step_6_structure'
  }

  if (
    currentStageKey === 'step_6_structure' &&
    /STEP\s*7\s*시작할게요/i.test(lastUserMessage)
  ) {
    return 'step_7_market'
  }

  if (
    currentStageKey === 'step_7_market' &&
    /프로젝트\s*기획안\s*시각화하기/i.test(lastUserMessage)
  ) {
    return 'step_7_rfp'
  }

  if (/rfp|제안\s*요청서|프로젝트\s*기획안|기획안\s*생성|문서\s*생성|pdf/i.test(lastUserMessage)) {
    return canRequestRfpStage(currentStageKey) ? 'step_7_rfp' : currentStageKey
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
  if (
    currentStageKey === 'step_0_start' &&
    /STEP\s*1/i.test(text) &&
    /(?:전체\s*프로세스|프로세스는|1[.)]\s*개발\s*조건)/i.test(text)
  ) {
    return {
      currentStageKey,
      nextStageKey: 'step_1_idea',
      reason: 'text_mentions_step_1',
      transition: true,
    }
  }

  if (
    currentStageKey.startsWith('step_3') &&
    /(?:지금은\s*)?STEP\s*4[.]?\s*개발\s*방향\s*도출\s*단계(?:입니다|를\s*시작합니다)/i.test(text)
  ) {
    return {
      currentStageKey,
      nextStageKey: 'step_4_direction',
      reason: 'text_mentions_step_4',
      transition: true,
    }
  }

  if (
    currentStageKey === 'step_4_direction' &&
    /(?:지금은\s*)?STEP\s*5[.]?\s*디자인\s*컨셉\s*도출\s*단계(?:입니다|를\s*시작합니다)/i.test(text)
  ) {
    return {
      currentStageKey,
      nextStageKey: 'step_5_style',
      reason: 'text_mentions_step_5',
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
