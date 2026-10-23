import { NextResponse } from 'next/server'

import {
  buildInitialUserPrompt,
  buildReferenceGuidelineBlock,
  buildSystemPrompt,
  buildStep3ScopedSystemPrompt,
  getStep3PromptTopicGuidance,
} from '@/lib/chat/context'
import { isExpertKey, type ExpertKey } from '@/lib/chat/experts'
import {
  appendImageBlockIfPresent,
  generateGeminiImages,
  generateGeminiText,
  getGeminiApiKey,
  type GeminiMessage,
} from '@/lib/chat/gemini'
import {
  appendRfpJsonBlock,
  buildRfpPrompt,
  extractRfpJsonBlock,
  parseRfpDocument,
  stripCodeFence,
  type RfpDocument,
} from '@/lib/chat/rfp'
import {
  DEFAULT_STAGE_KEY,
  hasStyleReferenceSelection,
  inferStageMetaFromText,
  isKnownStageKey,
  resolveIntentStageKey,
  type ChatAction,
  type StageKey,
} from '@/lib/chat/stages'
import {
  getProjectForUser,
  getProjectMessages,
  getReferenceImages,
  insertProjectMessage,
  isStep1CompletionContent,
  type ChatMessageRecord,
} from '@/lib/chat/persistence'
import {
  appendPersonaCardBlock,
  buildPersonaCardDataFromText,
} from '@/lib/chat/persona-card'
import { createClient } from '@/lib/supabase/server'
import {
  generateUnsplashSearchQuery,
  getUnsplashAccessKey,
  searchUnsplashPhotos,
  type UnsplashImageMeta,
} from '@/lib/chat/unsplash'

export const maxDuration = 60

// TEMP CARD DEBUG: 개발 중 새 프로젝트 초기 요청 흐름을 추적하기 위한 로그입니다.
const cardDebugRequestCounts = new Map<string, number>()

const MOCK_AI_ENABLED = process.env.NEXT_PUBLIC_MOCK_AI === 'true'
const MOCK_IMAGE_URL = '/assets/images/mock-ai-placeholder.svg'

const STEP1_SUPPLEMENT_SLOTS = [
  '주요 기능·특징',
  '형태나 디자인 스타일',
  '주요 재질',
  '사용 환경과 상황',
  '색상',
] as const

const STEP1_SUPPLEMENT_SLOT_KEYS = [
  'features',
  'style',
  'material',
  'scene',
  'color',
] as const

type Step1SupplementSlotKey = (typeof STEP1_SUPPLEMENT_SLOT_KEYS)[number]
type Step1SlotStatus = 'missing' | 'filled' | 'undecided'
type Step1ConfirmationSlotKey =
  | 'goal'
  | 'category'
  | 'budgetDuration'
  | 'usage'

const STEP1_CONFIRM_SLOT_KEYS: Step1ConfirmationSlotKey[] = [
  'goal',
  'category',
  'budgetDuration',
  'usage',
]

type Step1ConfirmationProgress = {
  index: number
  asked: boolean
  reaskCounts: Record<Step1ConfirmationSlotKey, number>
}

type Step1Progress = {
  slots: Record<Step1SupplementSlotKey, { status: Step1SlotStatus; value: string }>
  askedSlot: Step1SupplementSlotKey | null
  clarificationCounts: Record<Step1SupplementSlotKey, number>
  confirmation: Step1ConfirmationProgress
}

type Step1Assessment = {
  slots: Step1Progress['slots']
  nextSlot: Step1SupplementSlotKey | null
  askedSlotAnswered: boolean
  userAskedForHelp: boolean
}

const STEP1_MAX_CLARIFICATIONS = 2

const STEP1_PROGRESS_KEY = '_step1Progress'

const STEP1_CONFIRM_SLOTS = [
  '프로젝트의 주된 목표',
  '제품 카테고리',
  '예산·기간 범위',
  '최종 활용 목적',
]

const STEP1_CONFIRMATION_HISTORY_KEY = '_step1ConfirmationHistory'

type ChatRequestBody = {
  action?: unknown
  artifactMessageId?: unknown
  artifactSelectedIndex?: unknown
  artifactType?: unknown
  activeExpert?: unknown
  currentStageKey?: unknown
  forceImageGeneration?:
    | 'design_revision'
    | 'initial_design'
    | 'persona_card'
    | 'style_reference'
  message?: unknown
  projectId?: unknown
  styleKeywordSelections?: unknown
}

type ArtifactType =
  | 'persona'
  | 'problem_statements'
  | 'keyword_experience'
  | 'keyword_relationship'
  | 'direction_market_size'
  | 'direction_consumption_keywords'
  | 'direction_brand_positioning'
  | 'moodboard'
  | 'design'
  | 'modeling'
  | 'form_design'
  | 'marketing_budget'
  | 'development_timeline'

type StyleKeywordSelections = {
  color: string[]
  emotional: string[]
  structure: string[]
  texture: string[]
}

function normalizeStyleKeywordSelections(
  value: unknown
): StyleKeywordSelections | null {
  if (!value || typeof value !== 'object') return null

  const source = value as Record<string, unknown>
  const getValues = (key: keyof StyleKeywordSelections) =>
    Array.isArray(source[key])
      ? source[key].filter((item): item is string => typeof item === 'string')
      : []

  const selections = {
    color: getValues('color'),
    emotional: getValues('emotional'),
    structure: getValues('structure'),
    texture: getValues('texture'),
  }

  return Object.values(selections).some((items) => items.length > 0)
    ? selections
    : null
}

function buildStyleKeywordSelectionMessage(
  selections: StyleKeywordSelections
) {
  return [
    '사용자가 STEP 5 스타일 키워드 선택 UI에서 다음 키워드를 선택했습니다.',
    `감정: ${selections.emotional.join(', ')}`,
    `색감: ${selections.color.join(', ')}`,
    `구조: ${selections.structure.join(', ')}`,
    `촉감: ${selections.texture.join(', ')}`,
  ].join('\n')
}

function normalizeChatAction(value: unknown): ChatAction | null {
  return value === 'confirm_step_2_team' ||
    value === 'confirm_artifact' ||
    value === 'confirm_process' ||
    value === 'confirm_moodboard' ||
    value === 'start_step_2' ||
    value === 'start_step_3' ||
    value === 'stay_in_step_1' ||
    value === 'stay_in_step_2' ||
    value === 'select_step5_shape' ||
    value === 'select_step5_form' ||
    value === 'visualize_artifact'
    || value === 'confirm_form_design_summary'
    ? value
    : null
}

type Step5WidgetKind = 'shape' | 'form'

const STEP5_WIDGET_MARKERS: Record<Step5WidgetKind, string> = {
  shape: '<<AIDEE_STEP5_SHAPE_WIDGET>>',
  form: '<<AIDEE_STEP5_FORM_WIDGET>>',
}

function hasStep5WidgetSelection(
  messages: Array<{ action?: ChatAction | null }>,
  kind: Step5WidgetKind
) {
  return messages.some(
    (message) => message.action === `select_step5_${kind}`
  )
}

function hasStep5WidgetMarker(
  messages: Array<{ content: string }>,
  kind: Step5WidgetKind
) {
  return messages.some((message) =>
    message.content.includes(STEP5_WIDGET_MARKERS[kind])
  )
}

function shouldShowStep5Widget({
  currentStageKey,
  messages,
  text,
}: {
  currentStageKey: StageKey
  messages: Array<{ action?: ChatAction | null; content: string }>
  text: string
}) {
  if (currentStageKey !== 'step_5_style') return null

  const shapeSelected = hasStep5WidgetSelection(messages, 'shape')
  const formSelected = hasStep5WidgetSelection(messages, 'form')
  const shapeShown = hasStep5WidgetMarker(messages, 'shape')
  const formShown = hasStep5WidgetMarker(messages, 'form')

  if (
    !shapeSelected &&
    !shapeShown &&
    /(?:도형|큰\s*덩어리|전체\s*형태)/i.test(text)
  ) {
    return 'shape' as const
  }

  if (
    shapeSelected &&
    !formSelected &&
    !formShown &&
    /(?:입체|기하학적|유기적|복합\s*형태|자연물처럼|곡면|한\s*덩어리|나뉘거나|접히는)/i.test(text)
  ) {
    return 'form' as const
  }

  return null
}

function normalizeArtifactType(value: unknown): ArtifactType | null {
  return value === 'persona' ||
    value === 'problem_statements' ||
    value === 'keyword_experience' ||
    value === 'keyword_relationship' ||
    value === 'direction_market_size' ||
    value === 'direction_consumption_keywords' ||
    value === 'direction_brand_positioning' ||
    value === 'moodboard' ||
    value === 'design' ||
    value === 'modeling'
    || value === 'form_design'
    || value === 'marketing_budget'
    || value === 'development_timeline'
    ? value
    : null
}

function buildArtifactEventContent({
  artifactMessageId,
  artifactSelectedIndex,
  artifactType,
  eventType = 'confirmed',
}: {
  artifactMessageId: string
  artifactSelectedIndex?: number
  artifactType: ArtifactType
  eventType?: 'confirmed' | 'visualized'
}) {
  const confirmationLabel =
    artifactType === 'problem_statements'
      ? 'Problem Statements 확정하기'
      : artifactType === 'keyword_experience'
        ? 'Keywords: Experience 확정하기'
        : artifactType === 'keyword_relationship'
          ? 'Keywords: Relationship 확정하기'
          : artifactType === 'persona'
            ? '페르소나 카드 확정하기'
            : ''
  return `<<AIDEE_ARTIFACT_EVENT>>\n${JSON.stringify({
    artifactMessageId,
    artifactSelectedIndex,
    confirmationLabel,
    artifactType,
    eventType,
  })}\n<</AIDEE_ARTIFACT_EVENT>>`
}

function getArtifactEvent(content: string) {
  const match = content.match(
    /<<AIDEE_ARTIFACT_EVENT>>\s*([\s\S]*?)\s*<\<\/AIDEE_ARTIFACT_EVENT>>/i
  )
  if (!match) return null

  try {
    return JSON.parse(match[1]) as {
      artifactMessageId?: string
      artifactSelectedIndex?: number
      artifactType?: ArtifactType
      eventType?: 'confirmed' | 'visualized'
    }
  } catch {
    return null
  }
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  if (error && typeof error === 'object') {
    const candidate = error as {
      code?: unknown
      details?: unknown
      hint?: unknown
      message?: unknown
    }
    const message =
      typeof candidate.message === 'string' ? candidate.message : ''
    const details =
      typeof candidate.details === 'string' ? candidate.details : ''
    const hint = typeof candidate.hint === 'string' ? candidate.hint : ''
    const code = typeof candidate.code === 'string' ? candidate.code : ''
    const parts = [message, details, hint, code ? `code: ${code}` : ''].filter(
      Boolean
    )

    if (parts.length > 0) {
      return parts.join(' ')
    }
  }

  return 'Chat API error'
}

function normalizeStage(value: unknown): StageKey {
  return isKnownStageKey(value) ? value : DEFAULT_STAGE_KEY
}

function normalizeExpert(value: unknown): ExpertKey {
  return isExpertKey(value) ? value : 'aidee'
}

function buildConversation(messages: Array<{ content: string; role: string }>) {
  return messages
    .map((message) => `[${message.role}] ${message.content}`)
    .join('\n\n')
}

function isImageRequest(text: string) {
  return /이미지|시안|렌더|무드보드|비주얼|visual|render|image|그려|보여줘|만들어줘/i.test(
    text
  )
}

const STEP5_STYLE_QUESTIONS = [
  '제품을 보거나 사용할 때 어떤 기분을 느끼게 하고 싶은가',
  '제품이 놓일 곳에서 어떤 모습으로 보이길 원하는가',
  '사용자가 제품을 처음 봤을 때 어떤 인상을 받길 원하는가',
  '제품을 만졌을 때 어떤 느낌을 주길 원하는가',
] as const

const STEP3_PROGRESS_KEY = '_step3Progress'

const STEP3_EXPERIENCE_RESULT_FORMAT = `
[Keywords: Experience 결과 작성]
지금 대화 내용을 바탕으로 결과를 작성한다.

작성 규칙
- 사용자가 대화에서 직접 말한 내용과 Problem Statements를 근거로 작성한다. 대화에 없던 내용을 새로 만들지 않는다.
- 각 키워드는 2~10자 짧은 명사구로 작성한다.
- 감정은 사용 후 기대하는 감정 상태를 드러내는 키워드로 쓴다.
- 행동은 "편리함", "효율성" 같은 일반적인 표현보다 관찰 가능한 행동으로 쓴다.
- 공간은 제품이 신체와 환경 속에서 놓이는 방식과 드러나는 정도를 쓴다.
- 다른 프로젝트의 예시 키워드를 가져오지 않는다.
- 버튼을 언급하거나 누르도록 안내하지 않는다.
- 키워드 블록 이후에 질문이나 설명을 붙이지 않는다.

출력 형식
## Keywords: Experience
감정: [키워드 10개]
행동: [키워드 10개]
공간: [키워드 10개]

결과 작성이 끝나면 응답 마지막에 <<AIDEE_STEP3_EXPERIENCE_READY>> 를 출력한다.
`

const STEP3_RELATIONSHIP_RESULT_FORMAT = `
[Keywords: Relationship 결과 작성]
지금 대화 내용을 바탕으로 결과를 작성한다.

작성 규칙
- 사용자가 대화에서 직접 말한 내용과 앞선 Problem Statements, Keywords: Experience를 근거로 작성한다. 대화에 없던 내용을 새로 만들지 않는다.
- 각 키워드는 2~10자 짧은 명사구로 작성한다.
- 각 관계는 감성적인 표현이 아니라, 사용자·제품·도구·환경·타인 사이의 역할 분배가 드러나는 키워드로 작성한다.
- 다른 프로젝트의 예시 키워드를 가져오지 않는다.
- 버튼을 언급하거나 누르도록 안내하지 않는다.
- 키워드 블록 이후에 질문이나 설명을 붙이지 않는다.

출력 형식
## Keywords: Relationship
사용자와 제품: [키워드 5개]
기존 도구: [키워드 5개]
환경: [키워드 5개]
다른 사람: [키워드 5개]
시간·루틴: [키워드 5개]
실패·회복: [키워드 5개]

결과 작성이 끝나면 응답 마지막에 <<AIDEE_STEP3_RELATIONSHIP_READY>> 를 출력한다.
`

const STEP3_NO_PROGRESS_LANGUAGE_RULE =
  '질문에 진행 상황이나 내부 구조를 드러내는 표현을 넣지 마세요. "마지막으로", "마지막 질문", "하나만 더", "다음은", "다음 하위 주제", "하위 주제"라는 표현을 사용하지 마세요.'

type Step5StyleProgress =
  | { phase: 'awaiting_keywords' }
  | { phase: 'questions'; answeredCount: number }
  | { phase: 'keyword_summary' }
  | { phase: 'summary_confirmation' }
  | { phase: 'mood_options' }

function isStyleKeywordSummary(text: string) {
  return (
    /키워드/i.test(text) &&
    /(?:제품|공간|경험)/.test(text) &&
    /(?:확인|맞|괜찮|동의|정리)/.test(text)
  )
}

function getStep5StyleProgress(
  messages: Array<{ content: string; role: string; stageKey?: StageKey }>,
  hasCurrentKeywordSelection: boolean
): Step5StyleProgress {
  const selectedIndex = messages.reduce(
    (latest, message, index) =>
      message.role === 'assistant' &&
      /<<AIDEE_STYLE_KEYWORDS_SELECTED>>/i.test(message.content)
        ? index
        : latest,
    -1
  )

  if (selectedIndex < 0) {
    return hasCurrentKeywordSelection
      ? { answeredCount: 0, phase: 'questions' }
      : { phase: 'awaiting_keywords' }
  }

  const summaryIndex = messages.reduce(
    (latest, message, index) =>
      index > selectedIndex &&
      message.role === 'assistant' &&
      isStyleKeywordSummary(message.content)
        ? index
        : latest,
    -1
  )

  if (summaryIndex >= 0) {
    const hasSummaryConfirmation = messages.some(
      (message, index) => index > summaryIndex && message.role === 'user'
    )
    return hasSummaryConfirmation
      ? { phase: 'mood_options' }
      : { phase: 'summary_confirmation' }
  }

  const answeredCount = messages.filter(
    (message, index) =>
      index > selectedIndex &&
      message.role === 'user' &&
      message.stageKey === 'step_5_style'
  ).length

  return answeredCount >= STEP5_STYLE_QUESTIONS.length
    ? { phase: 'keyword_summary' }
    : { answeredCount, phase: 'questions' }
}

function buildStep5StyleProgressInstruction(progress: Step5StyleProgress) {
  if (progress.phase === 'questions') {
    const question = STEP5_STYLE_QUESTIONS[progress.answeredCount]
    return [
      '[STEP 5 진행 상태 — 이 지시가 다른 모든 지시보다 우선합니다]',
      '이번 턴에는 스타일 탐색 질문 ' +
        (progress.answeredCount + 1) +
        '/4만 하세요. ' +
        question +
        '에 대해 한 가지 질문만 하세요.',
      '사용자의 직전 답변에 대한 짧은 반응 한 문장을 먼저 쓰고, 그다음 질문 한 문장만 쓰세요.',
      '예시, 선택지, 다른 항목에 대한 질문, 스타일 분위기 위젯, 이미지 생성을 요청하거나 출력하지 마세요.',
    ].join('\n')
  }

  if (progress.phase === 'keyword_summary') {
    return [
      '[STEP 5 진행 상태 — 이 지시가 다른 모든 지시보다 우선합니다]',
      '네 가지 스타일 탐색 질문의 답변을 바탕으로 핵심 키워드 4~6개를 정리하세요.',
      '각 키워드마다 그것이 제품, 공간, 경험 중 무엇을 가리키는지 한 줄에 함께 적으세요.',
      '키워드 정리만 출력하고 스타일 분위기 위젯이나 이미지를 출력하지 마세요. 마지막에는 정리한 키워드가 맞는지 확인하는 한 문장만 쓰세요.',
    ].join('\n')
  }

  if (progress.phase === 'summary_confirmation') {
    return [
      '[STEP 5 진행 상태 — 이 지시가 다른 모든 지시보다 우선합니다]',
      '사용자가 키워드 정리를 확인하기 전에는 무드보드 방향을 출력하지 마세요.',
      '사용자가 확인했다면 서로 다른 무드보드 방향 3개를 제시하세요.',
      '각 방향에는 제목과 프로젝트에 맞는 설명을 포함하고, 반드시 {"widgets":[{"title":"한국어 제목 (English Search Style)","description":"설명"},{"title":"...","description":"..."},{"title":"...","description":"..."}]} 형식의 JSON을 출력하세요.',
    ].join('\n')
  }

  if (progress.phase === 'mood_options') {
    return [
      '[STEP 5 진행 상태 — 이 지시가 다른 모든 지시보다 우선합니다]',
      '사용자가 선택한 무드보드 방향을 확인하는 짧은 문장만 작성하세요. 무드보드 방향 선택 UI와 이미지는 시스템이 처리합니다.',
    ].join('\n')
  }

  return [
    '[STEP 5 진행 상태 — 이 지시가 다른 모든 지시보다 우선합니다]',
    '키워드 칩 선택 직후에는 네 가지 스타일 탐색 질문의 첫 번째 질문부터 한 번에 하나씩 시작하세요.',
    '스타일 분위기 위젯이나 이미지를 바로 출력하지 마세요.',
  ].join('\n')
}

function isUnrenderableStructuredResponse(
  text: string,
  allowStyleWidgets = false
) {
  const trimmed = text.trim()

  if (allowStyleWidgets && /\{\s*"widgets"\s*:/i.test(trimmed)) {
    return false
  }

  if (
    /"image_url"\s*:|"features"\s*:|"title"\s*:.*"description"\s*:/i.test(
      trimmed
    )
  ) {
    return true
  }

  if (
    (trimmed.startsWith('{') || trimmed.startsWith('[')) &&
    (trimmed.endsWith('}') || trimmed.endsWith(']'))
  ) {
    try {
      return typeof JSON.parse(trimmed) === 'object'
    } catch {
      return false
    }
  }

  return false
}

function stripStep6InternalNotes(text: string) {
  return text
    .replace(/^.*STEP\s*6에서\s*확인해야\s*할\s*사항.*$/gim, '')
    .replace(/^.*STEP\s*6에서\s*확인할\s*사항.*$/gim, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function hasStyleKeywordPicker(content: string) {
  return /<<AIDEE_STYLE_KEYWORD_PICKER>>/.test(content)
}

function isPersonaCardVisualizationRequest(text: string) {
  return (
    /페르소나|persona/i.test(text) &&
    /시각화|이미지|visuali[sz]e|image|그려|보여줘/i.test(text)
  )
}

function isPersonaCardConfirmRequest(text: string) {
  return /페르소나\s*카드.*확정|persona\s*card.*confirm/i.test(text)
}

function isPersonaCardRevisionRequest(text: string) {
  return /페르소나\s*카드\s*(?:수정|다시\s*생성|재생성)|persona\s*card\s*(?:edit|revise|regenerate)/i.test(
    text
  )
}

function hasPersonaFeatureCheckPrompt(messages: Array<{ content: string }>) {
  return messages.some((message) =>
    /페르소나\s*Summary가.*제품의\s*특징과\s*요구사항/i.test(message.content)
  )
}

function hasPersonaExperienceCheckPrompt(messages: Array<{ content: string }>) {
  return messages.some((message) =>
    /페르소나가\s*이\s*제품을\s*통해\s*궁극적으로\s*어떤\s*경험/i.test(
      message.content
    )
  )
}

function hasPersonaDetailAnswer(
  messages: Array<{ content: string; role: string }>
) {
  const relationshipConfirmationIndex = messages.reduce(
    (lastIndex, message, index) =>
      message.role === 'system' &&
      message.content.includes('<<AIDEE_ARTIFACT_EVENT>>') &&
      /Keywords:\s*Relationship\s*확정하기/i.test(message.content)
        ? index
        : lastIndex,
    -1
  )

  return messages.some(
    (message, index) =>
      index > relationshipConfirmationIndex &&
      message.role === 'user' &&
      message.content.trim().length > 0
  )
}

function hasPersonaSummaryText(text: string) {
  return /(?:^|\n)\s*#{1,6}\s*Persona\s*Summary/i.test(text)
}

function buildPersonaFinalCheckPrompt() {
  return '이 페르소나 Summary가 만들고자 하는 제품의 특징과 요구사항을 잘 반영하고 있는지 확인해 주세요.'
}

function buildPersonaExperienceCheckPrompt() {
  return '이 페르소나가 이 제품을 통해 궁극적으로 어떤 경험을 하게 될지, 추가하고 싶은 부분이 있으실까요?'
}

function buildMockRfp(projectTitle: string): RfpDocument {
  return {
    avoidDirections: ['핵심 목적과 무관한 기능 확장'],
    budgetRange: '설정된 예산 범위 내',
    coreNeeds: '사용자의 핵심 문제를 간결하게 해결',
    coreValue: '명확성, 사용성, 구현 가능성',
    finalPurpose: '프로젝트 검증 및 제품 개발',
    implementationNotes: ['확정된 요구사항을 기준으로 상세 설계 진행'],
    mainTarget: '프로젝트에서 정의한 핵심 사용자',
    mustHaveFeatures: ['핵심 사용 흐름', '기본 안전성과 내구성'],
    nextActions: ['상세 설계 검토', '프로토타입 제작'],
    niceToHaveFeatures: ['사용 경험 개선 기능'],
    oneLineDefinition: '대화에서 확정한 조건을 반영한 제품 개발 프로젝트',
    projectGoal: '확정된 프로젝트 목표 달성',
    projectName: projectTitle,
    referenceSummary: '업로드된 레퍼런스와 대화 내용을 기준으로 정리',
    researchInsights: ['핵심 타겟과 사용 맥락에 집중'],
    sizeOrForm: '확정된 크기와 형태 조건 적용',
    styleKeywords: ['명확한', '일관된', '실용적인'],
    successCriteria: ['핵심 요구사항 충족', '프로토타입 검증 완료'],
    timeline: '설정된 목표 일정 내',
    usageContext: '프로젝트에서 정의한 주요 사용 환경',
  }
}

function buildMockStageResponse({
  currentStageKey,
  forceImageGeneration,
  message,
  projectTitle,
  step1UserTurnCount = 0,
}: {
  currentStageKey: StageKey
  forceImageGeneration?: ChatRequestBody['forceImageGeneration']
  message: string
  projectTitle: string
  step1UserTurnCount?: number
}) {
  if (currentStageKey === 'step_7_rfp') {
    return appendRfpJsonBlock({
      rfp: buildMockRfp(projectTitle),
      text: '프로젝트 기획안 생성이 완료되었습니다. 프로젝트 대화 프로세스가 종료되었습니다.',
    })
  }

  const imagePurpose =
    currentStageKey === 'step_5_cmf'
      ? null
      : forceImageGeneration === 'persona_card'
        ? 'persona'
        : forceImageGeneration === 'style_reference'
          ? 'style_reference'
      : forceImageGeneration === 'initial_design' ||
          forceImageGeneration === 'design_revision' ||
          currentStageKey === 'step_5_design'
            ? 'design'
            : currentStageKey === 'step_5_3d'
              ? 'modeling'
              : null

  if (imagePurpose) {
    const imageCount =
        imagePurpose === 'design' && forceImageGeneration !== 'design_revision'
        ? 3
        : imagePurpose === 'modeling'
          ? 2
          : imagePurpose === 'style_reference'
            ? 3
            : 1
    const text =
      imagePurpose === 'design'
        ? '확정된 스타일 방향을 반영한 디자인 시안 3가지를 제안합니다.'
        : imagePurpose === 'modeling'
          ? '확정된 2D 시안과 CMF를 반영한 3D 모델링 시안 2가지를 제안합니다.'
          : imagePurpose === 'style_reference'
            ? '선택한 스타일을 바탕으로 레퍼런스 이미지를 준비했습니다.'
            : '페르소나 카드 시각화를 준비했습니다.'

    return appendImageBlockIfPresent({
      imageBlock: {
        images: Array.from({ length: imageCount }, () => MOCK_IMAGE_URL),
        model: 'mock-ai',
        prompt: 'Mock AI placeholder',
        purpose: imagePurpose,
        selectedImageIndex: null,
      },
      text,
    })
  }

  switch (currentStageKey) {
    case 'step_0_start':
      return '프로젝트의 목표, 카테고리, 예산과 기간, 최종 활용 목적을 정리했습니다.\n\n전체 개발 프로세스를 함께 확인해볼까요?'
    case 'step_1_idea':
      if (/STEP\s*1\s*시작할게요/i.test(message)) {
        return 'STEP 1. 제품 개발 조건 정리를 시작합니다. 이 프로젝트에서 가장 먼저 달성하고 싶은 핵심 목표는 무엇인가요?'
      }
      if (step1UserTurnCount === 1) {
        return '이 제품은 어떤 제품 카테고리로 정의할 수 있을까요?'
      }
      if (step1UserTurnCount === 2) {
        return '이 프로젝트의 예산과 목표 기간은 어느 정도로 생각하고 계신가요?'
      }
      if (step1UserTurnCount === 3) {
        return '이 제품은 전시, 판매, 테스트 중 어떤 목적을 가장 우선하나요?'
      }
      return '현재까지 확인된 프로젝트 목표, 제품 카테고리, 예산·기간 범위, 최종 활용 목적을 기준으로 제품 개발 조건을 정리했습니다.\n\n전체 개발 프로세스를 함께 확인해볼까요?\n<<AIDEE_STEP_1_COMPLETE>>'
    case 'step_2_agent':
      return buildAgentStageEntryPrompt()
    case 'step_3_persona':
      return 'STEP 3. 제품 사용자 정의를 시작합니다. 제품을 가장 자주 사용할 사람은 어떤 상황에서 가장 큰 불편을 겪고 있나요?'
    case 'step_3_research':
      return buildPersonaConfirmedPrompt()
    case 'step_4_direction':
      if (/시장\s*규모/i.test(message)) {
        return '## Tam Sam Som\n목 시장을 기준으로 TAM, SAM, SOM을 구분한 목 리서치 결과입니다.'
      }
      if (/소비\s*트렌드/i.test(message)) {
        return '## Keywords: Consumption\n목 소비 트렌드 분석입니다.\n키워드: 실용성, 개인화, 지속가능성, 편의성, 직관성'
      }
      if (/경쟁사/i.test(message)) {
        return '## Positioning Map: Brand\n목 경쟁사 포지셔닝 분석입니다.'
      }
      return 'STEP 4. 개발 방향 도출 단계입니다.\n\n시장·소비·경쟁 리서치를 바탕으로 프로젝트의 개발 방향을 정하는 단계입니다. 먼저 확인하고 싶은 리서치 항목을 아래에서 선택해 주세요.\n\n<<AIDEE_DIRECTION_WIDGETS>>\nmarket_size\nconsumption_keywords\nbrand_positioning\n<</AIDEE_DIRECTION_WIDGETS>>'
    case 'step_5_style':
      return 'STEP 5. 디자인 컨셉 도출 단계입니다. 프로젝트에 맞는 스타일 키워드를 준비했습니다.\n\n<<AIDEE_STYLE_KEYWORD_PICKER>>\n{"emotional":["차분한","활기찬","신뢰감"],"color":["뉴트럴","선명한","따뜻한"],"structure":["간결한","유기적인","모듈형"],"texture":["매트한","부드러운","견고한"]}\n<</AIDEE_STYLE_KEYWORD_PICKER>>'
    case 'step_5_design':
      return '확정된 스타일 방향을 반영한 디자인 시안 3가지를 제안합니다.'
    case 'step_5_cmf':
      return 'STEP 5의 색·소재·마감(CMF)을 대화로 정합니다.'
    case 'step_5_3d':
      return 'STEP 5의 3D 모델링 시안 구간을 시작합니다.'
    case 'step_6_structure':
      return buildStructureStageCompletedPrompt()
    case 'step_7_market':
      return buildMarketStageCompletedPrompt()
  }
}

function isRfpConfirmRequest(text: string) {
  return /(?:프로젝트\s*)?기획안.*확정|project\s*(?:plan|report).*confirm/i.test(
    text
  )
}

function isRfpRevisionRequest(text: string) {
  return /(?:프로젝트\s*)?기획안.*(?:수정|다시\s*생성|재생성)|project\s*(?:plan|report).*(?:edit|revise|regenerate)/i.test(
    text
  )
}

function buildPostPersonaKeywordPrompt() {
  return [
    'Persona Card를 생성했습니다.',
    '',
    '내용을 확인한 뒤 다시 생성하거나 확정할 수 있습니다.',
    '확정하면 시각화하기가 활성화됩니다.',
  ].join('\n')
}

function buildPersonaConfirmedPrompt() {
  return [
    '네, 페르소나가 최종 확정되었습니다. 이 페르소나는 앞으로 제품 기획과 디자인의 중요한 기준이 될 것입니다.',
    '',
    '다음으로 STEP 4. 개발 방향 도출 단계로 넘어가겠습니다.',
    '시장 규모, 소비 트렌드, 경쟁사 리서치를 바탕으로 제품의 개발 방향과 차별화 전략을 구체화하는 단계입니다. 진행할까요?',
  ].join('\n')
}

function buildAgentStageEntryPrompt() {
  return [
    'STEP 2. AI 에이전트 생성',
    '',
    '프로젝트에 필요한 전문 분야를 바탕으로, 함께할 AI 에이전트를 직접 커스터마이징 해보세요.',
    '에이전트 4명을 모두 커스터마이징해야 아래 [완료] 버튼이 활성화됩니다.',
  ].join('\n')
}

function buildStep4EntryPrompt() {
  return [
    '현재 STEP 4. 개발 방향 도출 단계입니다.',
    'STEP 3에서 정의한 제품 사용자를 기준으로, 이 아이디어가 실제로 만들 가치가 있는지와 무엇에 집중해야 하는지를 시장·소비·경쟁 리서치 근거로 정합니다.',
    '어떤 항목부터 리서치를 시작해볼까요?',
    '',
    '<<AIDEE_DIRECTION_WIDGETS>>',
    'market_size',
    'consumption_keywords',
    'brand_positioning',
    '<</AIDEE_DIRECTION_WIDGETS>>',
  ].join('\n')
}

function buildStep2TeamCompletedPrompt() {
  return [
    'AI 팀 구성이 완료되었습니다. 기획전략가 · 디자이너 · 엔지니어 · 마케터 4명이 좌측 사이드바에 추가되었습니다. 좌측 사이드바의 에이전트를 클릭하면 에이전트의 정보가 팝업창으로 나옵니다.',
    '',
    "다음으로 STEP 3. 제품 사용자 정의 단계로 넘어가겠습니다. 이 단계에서는 '이 제품을 누가 사용할 것인가'에 대해 구체적으로 알아볼 예정입니다. 진행할까요?",
  ].join('\n')
}

function buildDesignStageCompletedPrompt() {
  return [
    'STEP 5. 디자인 컨셉 도출 단계가 완료되었습니다.',
    '',
    '다음으로 STEP 6. 구조 설계 방향 도출 단계로 넘어가겠습니다. STEP 6. 구조 설계 방향 도출을 시작할까요?',
  ].join('\n')
}

function buildStructureStageCompletedPrompt() {
  return [
    'STEP 6. 구조 설계 방향 도출 단계가 완료되었습니다.',
    '',
    '다음으로 STEP 7. 시장 진입 전략 도출 단계로 넘어가겠습니다. STEP 7. 시장 진입 전략 도출을 시작할까요?',
  ].join('\n')
}

function buildMarketStageCompletedPrompt() {
  return [
    '타겟 시장과 판매 채널, 가격·런칭 방향, 실행 우선순위를 정리했습니다.',
    '',
    'STEP 7. 시장 진입 전략 도출 단계가 완료되었습니다. 프로젝트 기획안 생성을 위해 내용을 확정하시겠습니까?',
  ].join('\n')
}

function buildRfpConfirmedPrompt() {
  return [
    '프로젝트 기획안을 확정했습니다.',
    '',
    '확정된 내용을 Project Report로 시각화할 수 있습니다.',
  ].join('\n')
}

function hasAllKeywordResults(
  messages: Array<{ content: string }>,
  additionalContent = ''
) {
  const content = [...messages.map((message) => message.content), additionalContent]
    .join('\n')

  return (
    /#{1,3}\s*Keywords:\s*Experience/i.test(content) &&
    /#{1,3}\s*Keywords:\s*Relationship/i.test(content)
  )
}

function hasStep3Artifact(
  messages: Array<{ content: string; role?: string }>,
  pattern: RegExp
) {
  return messages.some((message) => pattern.test(message.content))
}

function hasStep3ArtifactConfirmation(
  messages: Array<{ content: string; role?: string }>,
  pattern: RegExp
) {
  return messages.some(
    (message) =>
      (message.role === 'user' && pattern.test(message.content)) ||
      (message.role === 'system' &&
        message.content.includes('<<AIDEE_ARTIFACT_EVENT>>') &&
        pattern.test(
          message.content
            .replace(/<<AIDEE_ARTIFACT_EVENT>>|<</g, ' ')
            .replace(/>>/g, ' ')
        ))
  )
}

function hasStep3ArtifactEvent(
  messages: Array<{ content: string; role?: string }>,
  artifactType: ArtifactType,
  eventType: 'confirmed' | 'visualized'
) {
  return messages.some((message) => {
    if (message.role !== 'system') return false
    const event = getArtifactEvent(message.content)
    return (
      event?.artifactType === artifactType && event.eventType === eventType
    )
  })
}

function hasStep3UserMessageAfterArtifactEvent(
  messages: Array<{ content: string; role?: string }>,
  artifactType: ArtifactType,
  eventType: 'confirmed' | 'visualized'
) {
  let eventIndex = -1

  messages.forEach((message, index) => {
    if (message.role !== 'system') return
    const event = getArtifactEvent(message.content)
    if (
      event?.artifactType === artifactType &&
      event.eventType === eventType
    ) {
      eventIndex = index
    }
  })

  return (
    eventIndex >= 0 &&
    messages.some(
      (message, index) => index > eventIndex && message.role === 'user'
    )
  )
}

type Step3Phase =
  | 'problem_dialogue'
  | 'problem_confirmation'
  | 'problem_visualization'
  | 'experience_dialogue'
  | 'experience_confirmation'
  | 'experience_visualization'
  | 'relationship_dialogue'
  | 'relationship_confirmation'
  | 'relationship_visualization'
  | 'persona_followup'

function getStep3Phase(
  messages: Array<{ content: string; role: string }>
): Step3Phase {
  const hasProblemStatements = hasStep3Artifact(
    messages,
    /#{1,3}\s*Problem\s*Statements/i
  )
  const hasProblemStatementsConfirmation = hasStep3ArtifactEvent(
    messages,
    'problem_statements',
    'confirmed'
  ) || hasStep3ArtifactConfirmation(messages, /Problem\s*Statements\s*확정하기/i)
  const hasProblemStatementsVisualization = hasStep3ArtifactEvent(
    messages,
    'problem_statements',
    'visualized'
  )
  const hasExperience = hasStep3Artifact(
    messages,
    /#{1,3}\s*Keywords:\s*Experience/i
  )
  const hasExperienceConfirmation = hasStep3ArtifactEvent(
    messages,
    'keyword_experience',
    'confirmed'
  ) || hasStep3ArtifactConfirmation(messages, /Keywords:\s*Experience\s*확정하기/i)
  const hasExperienceVisualization = hasStep3ArtifactEvent(
    messages,
    'keyword_experience',
    'visualized'
  )
  const hasRelationship = hasStep3Artifact(
    messages,
    /#{1,3}\s*Keywords:\s*Relationship/i
  )
  const hasRelationshipConfirmation = hasStep3ArtifactEvent(
    messages,
    'keyword_relationship',
    'confirmed'
  ) || hasStep3ArtifactConfirmation(messages, /Keywords:\s*Relationship\s*확정하기/i)
  const hasRelationshipVisualization = hasStep3ArtifactEvent(
    messages,
    'keyword_relationship',
    'visualized'
  )

  if (!hasProblemStatements) return 'problem_dialogue'
  if (!hasProblemStatementsConfirmation) return 'problem_confirmation'
  if (!hasProblemStatementsVisualization) return 'problem_visualization'
  if (!hasExperience) return 'experience_dialogue'
  if (!hasExperienceConfirmation) return 'experience_confirmation'
  if (!hasExperienceVisualization) return 'experience_visualization'
  if (!hasRelationship) return 'relationship_dialogue'
  if (!hasRelationshipConfirmation) return 'relationship_confirmation'
  if (!hasRelationshipVisualization) return 'relationship_visualization'
  return 'persona_followup'
}

type Step3Section = 'experience' | 'relationship'
type Step3TopicStatus = 'pending' | 'awaiting_core' | 'awaiting_deep' | 'complete' | 'undecided'
type Step3TopicKey =
  | 'emotion'
  | 'behavior'
  | 'space'
  | 'userProduct'
  | 'existingTool'
  | 'environment'
  | 'otherPeople'
  | 'timeRoutine'
  | 'failureRecovery'

type Step3TopicProgress = {
  status: Step3TopicStatus
  deepQuestionCount: number
  pendingQuestionKind: 'core' | 'deep' | null
  reaskCount: number
}

type Step3Progress = {
  section: Step3Section
  currentTopic: Step3TopicKey
  topics: Record<Step3TopicKey, Step3TopicProgress>
  lastJudgement: Record<string, unknown> | null
}

const STEP3_TOPIC_ORDER: Record<Step3Section, Step3TopicKey[]> = {
  experience: ['emotion', 'behavior', 'space'],
  relationship: [
    'userProduct',
    'existingTool',
    'environment',
    'otherPeople',
    'timeRoutine',
    'failureRecovery',
  ],
}

const STEP3_TOPIC_LABELS: Record<Step3TopicKey, string> = {
  emotion: '감정',
  behavior: '행동',
  space: '공간',
  userProduct: '사용자와 제품의 관계',
  existingTool: '기존 도구와의 관계',
  environment: '환경과의 관계',
  otherPeople: '다른 사람과의 관계',
  timeRoutine: '시간 및 루틴과의 관계',
  failureRecovery: '실패와 회복의 관계',
}

function createStep3Progress(section: Step3Section): Step3Progress {
  const topics = {} as Record<Step3TopicKey, Step3TopicProgress>
  for (const topic of [...STEP3_TOPIC_ORDER.experience, ...STEP3_TOPIC_ORDER.relationship]) {
    topics[topic] = {
      status: 'pending',
      deepQuestionCount: 0,
      pendingQuestionKind: null,
      reaskCount: 0,
    }
  }
  return {
    section,
    currentTopic: STEP3_TOPIC_ORDER[section][0],
    topics,
    lastJudgement: null,
  }
}

function getStep3ProgressFromProject(
  project: Awaited<ReturnType<typeof getProjectForUser>>
) {
  const requirements =
    project?.requirements && typeof project.requirements === 'object'
      ? (project.requirements as Record<string, unknown>)
      : {}
  const value = requirements[STEP3_PROGRESS_KEY]
  if (!value || typeof value !== 'object') return null
  const source = value as Record<string, unknown>
  if (source.section !== 'experience' && source.section !== 'relationship') return null
  if (
    typeof source.currentTopic !== 'string' ||
    !Object.prototype.hasOwnProperty.call(STEP3_TOPIC_LABELS, source.currentTopic)
  ) return null
  if (!source.topics || typeof source.topics !== 'object') return null
  const topics = {} as Record<Step3TopicKey, Step3TopicProgress>
  for (const topic of [...STEP3_TOPIC_ORDER.experience, ...STEP3_TOPIC_ORDER.relationship]) {
    const item = (source.topics as Record<string, unknown>)[topic]
    const itemRecord = item && typeof item === 'object' ? item as Record<string, unknown> : {}
    const status = itemRecord.status
    topics[topic] = {
      status:
        status === 'awaiting_core' ||
        status === 'awaiting_deep' ||
        status === 'complete' ||
        status === 'undecided'
          ? status
          : 'pending',
      deepQuestionCount:
        typeof itemRecord.deepQuestionCount === 'number'
          ? Math.max(0, Math.min(3, itemRecord.deepQuestionCount))
          : 0,
      pendingQuestionKind:
        itemRecord.pendingQuestionKind === 'core' || itemRecord.pendingQuestionKind === 'deep'
          ? itemRecord.pendingQuestionKind
          : null,
      reaskCount:
        typeof itemRecord.reaskCount === 'number'
          ? Math.max(0, Math.min(1, itemRecord.reaskCount))
          : 0,
    }
  }
  return {
    section: source.section,
    currentTopic: source.currentTopic as Step3TopicKey,
    topics,
    lastJudgement:
      source.lastJudgement && typeof source.lastJudgement === 'object'
        ? source.lastJudgement as Record<string, unknown>
        : null,
  } satisfies Step3Progress
}

async function saveStep3Progress({
  project,
  progress,
  supabase,
}: {
  project: Awaited<ReturnType<typeof getProjectForUser>>
  progress: Step3Progress
  supabase: Awaited<ReturnType<typeof createClient>>
}) {
  if (!project?.requirements || typeof project.requirements !== 'object') return
  const requirements = project.requirements as Record<string, unknown>
  const { error } = await supabase
    .from('projects')
    .update({ requirements: { ...requirements, [STEP3_PROGRESS_KEY]: progress } })
    .eq('id', project.id)
  if (error) throw error
}

type Step3Judgement = {
  currentTopic: Step3TopicKey
  responseType: 'answer' | 'clarification' | 'undecided' | 'off_topic'
  questionMatches: boolean
  sufficient: boolean
  undecided: boolean
  questionKind: 'core' | 'deep'
}

function parseStep3Judgement(raw: string): Step3Judgement | null {
  try {
    const parsed = JSON.parse(stripCodeFence(raw).trim()) as Record<string, unknown>
    if (
      typeof parsed.currentTopic !== 'string' ||
      !Object.prototype.hasOwnProperty.call(STEP3_TOPIC_LABELS, parsed.currentTopic)
    ) return null
    const responseType = parsed.responseType
    if (
      responseType !== 'answer' &&
      responseType !== 'clarification' &&
      responseType !== 'undecided' &&
      responseType !== 'off_topic'
    ) return null
    if (
      parsed.questionKind !== 'core' &&
      parsed.questionKind !== 'deep'
    ) return null
    if (typeof parsed.questionMatches !== 'boolean') return null
    return {
      currentTopic: parsed.currentTopic as Step3TopicKey,
      responseType,
      questionMatches: parsed.questionMatches,
      sufficient: parsed.sufficient === true,
      undecided: parsed.undecided === true,
      questionKind: parsed.questionKind,
    }
  } catch {
    return null
  }
}

async function assessStep3Topic({
  apiKey,
  progress,
  conversation,
  userMessage,
}: {
  apiKey: string
  progress: Step3Progress
  conversation: Array<{ role: string; content: string }>
  userMessage: string
}) {
  if (!apiKey) return null
  const current = progress.topics[progress.currentTopic]
  const raw = await generateGeminiText({
    apiKey,
    messages: [{
      role: 'user',
      content: [
        'STEP 3 하위 주제 대화 상태를 평가하세요. JSON만 출력하세요.',
        `현재 구간: ${progress.section}`,
        `현재 하위 주제: ${progress.currentTopic} (${STEP3_TOPIC_LABELS[progress.currentTopic]})`,
        `현재 하위 주제의 prompt.ts 확인할 내용: ${getStep3PromptTopicGuidance(progress.currentTopic).criteria}`,
        'sufficient=true는 위 확인할 내용이 충분히 확인된 경우에만 반환하세요. 일부만 확인됐으면 sufficient=false입니다.',
        `현재 상태: ${JSON.stringify(current)}`,
        `현재 저장된 전체 상태: ${JSON.stringify(progress.topics)}`,
        '사용자 응답을 answer, clarification, undecided, off_topic 중 하나로 분류하세요. 프로젝트에 대해 조금이라도 말했으면 짧거나 모호해도 answer입니다.',
        '직전 Aidee 응답이 현재 하위 주제의 서버 지정 질문 종류(core 또는 deep)에 맞는지 questionMatches로 판단하세요.',
        '핵심 질문 답변 뒤에는 반드시 심화 질문을 최소 1회 진행해야 합니다. 핵심 답변만으로 sufficient=true가 되어도 다음 상태는 심화 질문이어야 합니다.',
        '사용자가 모르겠다거나 넘어가자고 하면 undecided=true로 반환하세요. 되묻기나 프로젝트와 무관한 말은 각각 clarification 또는 off_topic으로 반환하세요.',
        '심화 질문 횟수는 서버가 관리하며 최대 2회입니다. 2회에 도달하면 complete로 닫습니다.',
        `최근 대화: ${JSON.stringify(conversation.slice(-8))}`,
        `이번 사용자 답변: ${userMessage}`,
        '형식: {"currentTopic":"emotion","responseType":"answer|clarification|undecided|off_topic","questionMatches":true,"sufficient":false,"undecided":false,"questionKind":"core|deep"}',
      ].join('\n'),
    }],
    system: 'STEP 3 내부 하위 주제 판단기입니다. 대화 응답을 작성하지 말고 지정된 JSON만 반환하세요.',
  })
  return parseStep3Judgement(raw)
}

function applyStep3Judgement(
  progress: Step3Progress,
  judgement: Step3Judgement
) {
  const next: Step3Progress = {
    ...progress,
    topics: { ...progress.topics },
    lastJudgement: judgement as unknown as Record<string, unknown>,
  }
  const current = next.topics[next.currentTopic] = { ...next.topics[next.currentTopic] }

  const requiresSameQuestionRetry =
    !judgement.questionMatches ||
    judgement.responseType === 'clarification' ||
    judgement.responseType === 'off_topic'

  if (requiresSameQuestionRetry && current.reaskCount < 1) {
    current.reaskCount += 1
    return {
      progress: next,
      reasked: true,
      forcedAnswerAfterLimit: false,
    }
  }

  const forcedAnswerAfterLimit = requiresSameQuestionRetry && current.reaskCount >= 1

  if (judgement.undecided && !forcedAnswerAfterLimit) {
    current.status = 'undecided'
  } else if (current.status === 'awaiting_core') {
    current.status = 'awaiting_deep'
    current.deepQuestionCount = 0
    current.pendingQuestionKind = 'deep'
    current.reaskCount = 0
  } else if (current.status === 'awaiting_deep') {
    current.deepQuestionCount = Math.min(3, current.deepQuestionCount + 1)
    if (current.deepQuestionCount >= 1 && judgement.sufficient) {
      current.status = 'complete'
      current.pendingQuestionKind = null
      current.reaskCount = 0
    } else if (current.deepQuestionCount >= 2) {
      current.status = 'complete'
      current.pendingQuestionKind = null
      current.reaskCount = 0
    } else {
      current.status = 'awaiting_deep'
      current.pendingQuestionKind = 'deep'
      current.reaskCount = 0
    }
  }

  if (current.status === 'complete' || current.status === 'undecided') {
    const order = STEP3_TOPIC_ORDER[next.section]
    const nextTopic = order.find((candidate) => next.topics[candidate].status === 'pending')
    if (nextTopic) {
      next.currentTopic = nextTopic
    }
  }

  return {
    progress: next,
    reasked: false,
    forcedAnswerAfterLimit,
  }
}

function getStep3PreviousAssistantQuestion(
  messages: Array<{ content: string; role: string }>
) {
  return [...messages]
    .reverse()
    .find((message) => message.role === 'assistant')?.content ?? ''
}

function markStep3QuestionIssued(progress: Step3Progress) {
  const current = progress.topics[progress.currentTopic]
  if (current.status === 'pending') {
    current.status = 'awaiting_core'
    current.pendingQuestionKind = 'core'
    current.reaskCount = 0
  }
  return progress
}

function areStep3TopicsComplete(progress: Step3Progress, section: Step3Section) {
  return STEP3_TOPIC_ORDER[section].every((topic) => {
    const status = progress.topics[topic].status
    return status === 'complete' || status === 'undecided'
  })
}

function advanceStep3AfterVisualization(
  progress: Step3Progress,
  section: Step3Section
) {
  const next: Step3Progress = {
    ...progress,
    topics: { ...progress.topics },
  }
  for (const topic of STEP3_TOPIC_ORDER[section]) {
    const current = next.topics[topic]
    if (current.status !== 'complete' && current.status !== 'undecided') {
      next.topics[topic] = {
        ...current,
        status: 'undecided',
        pendingQuestionKind: null,
        reaskCount: 0,
      }
    }
  }

  if (section === 'experience') {
    next.section = 'relationship'
    next.currentTopic = STEP3_TOPIC_ORDER.relationship[0]
  }

  return next
}

function hasConfirmedStep3Artifacts(
  messages: Array<{ content: string; role?: string }>
) {
  return (
    hasStep3Artifact(messages, /#{1,3}\s*Problem\s*Statements/i) &&
    hasStep3Artifact(messages, /#{1,3}\s*Keywords:\s*Experience/i) &&
    hasStep3Artifact(messages, /#{1,3}\s*Keywords:\s*Relationship/i) &&
    hasStep3ArtifactConfirmation(messages, /Problem\s*Statements\s*확정하기/i) &&
    hasStep3ArtifactConfirmation(messages, /Keywords:\s*Experience\s*확정하기/i) &&
    hasStep3ArtifactConfirmation(messages, /Keywords:\s*Relationship\s*확정하기/i) &&
    hasStep3ArtifactEvent(messages, 'problem_statements', 'visualized') &&
    hasStep3ArtifactEvent(messages, 'keyword_experience', 'visualized') &&
    hasStep3ArtifactEvent(messages, 'keyword_relationship', 'visualized')
  )
}

function getStep3GateInstruction(
  messages: Array<{ content: string; role: string }>,
  progress: Step3Progress | null
) {
  const phase = getStep3Phase(messages)

  if (phase === 'problem_dialogue') {
    return '현재는 Problem Statements 대화 구간입니다. Problem Statements에 필요한 질문만 한 번에 하나씩 하고, 결과를 충분히 확인하기 전에는 Problem Statements 결과나 Keywords, Persona Summary를 출력하지 마세요.'
  }

  if (progress && (phase === 'experience_dialogue' || phase === 'relationship_dialogue')) {
    const sectionComplete = areStep3TopicsComplete(progress, progress.section)
    const current = progress.topics[progress.currentTopic]
    if (sectionComplete) {
      return progress.section === 'experience'
        ? STEP3_EXPERIENCE_RESULT_FORMAT
        : STEP3_RELATIONSHIP_RESULT_FORMAT
    }
    const topicLabel = STEP3_TOPIC_LABELS[progress.currentTopic]
    const questionKindLabel = current.pendingQuestionKind === 'deep' ? '심화' : '핵심'
    const reaskInstruction = current.reaskCount > 0
      ? `같은 질문을 그대로 반복하지 말고, 같은 의미를 더 쉽고 다른 문장으로 다시 물으세요. 직전 질문은 다음과 같습니다: ${getStep3PreviousAssistantQuestion(messages)} 이번 재질문이 마지막 허용 횟수입니다.`
      : ''
    if (current.status === 'awaiting_core') {
      return `이번 응답의 하위 주제는 ${topicLabel}이고 질문 종류는 ${questionKindLabel}입니다. ${topicLabel}에 대한 핵심 질문을 한 번에 하나만 하세요. 다른 하위 주제로 넘어가거나 결과 블록을 작성하지 마세요. ${reaskInstruction} ${STEP3_NO_PROGRESS_LANGUAGE_RULE} 결과 마커도 출력하지 마세요.`
    }
    if (current.status === 'awaiting_deep') {
      return `이번 응답의 하위 주제는 ${topicLabel}이고 질문 종류는 ${questionKindLabel}입니다. 같은 하위 주제에서 확인할 내용을 한 번에 하나씩 더 물으세요. 현재 심화 질문 횟수는 ${current.deepQuestionCount}회입니다. 다른 하위 주제로 넘어가거나 결과 블록을 작성하지 마세요. ${reaskInstruction} ${STEP3_NO_PROGRESS_LANGUAGE_RULE} 결과 마커도 출력하지 마세요.`
    }
    return `이번 응답의 하위 주제는 ${topicLabel}이고 질문 종류는 ${questionKindLabel}입니다. 핵심 질문을 한 번에 하나만 하세요. 핵심 질문 뒤에는 사용자의 답변을 받고 반드시 심화 질문을 최소 1회 진행하세요. 다른 하위 주제로 넘어가거나 결과 블록을 작성하지 마세요. ${STEP3_NO_PROGRESS_LANGUAGE_RULE} 결과 마커도 출력하지 마세요.`
  }

  if (phase === 'problem_confirmation') {
    return 'Problem Statements 결과가 아직 확정되지 않았습니다. Keywords: Experience, Keywords: Relationship, Persona Summary를 출력하지 말고 Problem Statements 확정만 기다리세요.'
  }

  if (phase === 'problem_visualization') {
    return 'Problem Statements가 확정되었습니다. 사용자가 시각화하기를 완료했습니다. 이번 응답에서는 Problem Statements 결과를 다시 출력하지 말고, Keywords: Experience 질문이나 결과, Keywords: Relationship, Persona Summary도 출력하지 마세요.'
  }

  if (phase === 'experience_dialogue') {
    return '현재는 Keywords: Experience 대화 구간입니다. 감정·행동·공간의 경험 변화를 프로젝트 맥락에 맞게 한 번에 하나씩 질문하세요. 사용자가 충분히 답하기 전에는 Keywords: Experience 결과 블록을 출력하지 말고, 결과를 출력할 때는 응답 맨 끝에 <<AIDEE_STEP3_EXPERIENCE_READY>>를 붙이세요. Keywords: Relationship과 Persona Summary는 출력하지 마세요.'
  }

  if (phase === 'experience_confirmation') {
    return 'Keywords: Experience 결과가 아직 확정되지 않았습니다. Keywords: Relationship과 Persona Summary를 출력하지 말고 Experience 확정만 기다리세요.'
  }

  if (phase === 'experience_visualization') {
    return 'Keywords: Experience가 확정되었습니다. 사용자가 시각화하기를 완료하기 전에는 Keywords: Relationship 질문이나 결과, Persona Summary를 출력하지 마세요.'
  }

  if (phase === 'relationship_dialogue') {
    return '현재는 Keywords: Relationship 대화 구간입니다. 사용자·제품·기존 도구·공간·환경·타인 사이의 관계를 프로젝트 맥락에 맞게 한 번에 하나씩 질문하세요. 사용자가 충분히 답하기 전에는 Keywords: Relationship 결과 블록을 출력하지 말고, 결과를 출력할 때는 응답 맨 끝에 <<AIDEE_STEP3_RELATIONSHIP_READY>>를 붙이세요. Persona Summary는 출력하지 마세요.'
  }

  if (phase === 'relationship_confirmation') {
    return 'Keywords: Relationship 결과가 아직 확정되지 않았습니다. Persona Summary를 출력하지 말고 Relationship 확정만 기다리세요.'
  }

  if (phase === 'relationship_visualization') {
    return 'Keywords: Relationship이 확정되었습니다. 사용자가 시각화하기를 완료하기 전에는 Persona Summary를 출력하지 마세요.'
  }

  if (hasPersonaDetailAnswer(messages)) {
    return '사용자가 설명한 인물 정보를 바탕으로 이번 응답에서 Persona Summary를 즉시 작성하세요. 정리하겠다는 예고만 출력하거나 사용자의 추가 요청을 기다리지 마세요.'
  }

  return '이 제품을 사용할 특정 인물 한 명을 떠올릴 수 있도록 이름이나 호칭, 생활 환경, 반복되는 행동 특징을 자연스럽게 묻는 질문 1개를 출력하세요. Persona Summary를 작성하겠다고 예고만 하지 마세요.'
}

function removeStep3ResultBlock(text: string, kind: 'experience' | 'relationship') {
  const titlePattern =
    kind === 'experience'
      ? /(?:^|\n)\s*\**\s*#{0,3}\s*Keywords:\s*Experience\b[^\n]*/i
      : /(?:^|\n)\s*\**\s*#{0,3}\s*Keywords:\s*Relationship\b[^\n]*/i
  const categoryPattern =
    kind === 'experience'
      ? /(?:^|\n)\s*\**\s*(?:감정|행동|공간|Emotion|Action|Space)\s*[:：]/i
      : /(?:^|\n)\s*\**\s*(?:사용자\s*와\s*제품|기존\s*도구|환경|다른\s*사람|시간\s*[·.]?\s*루틴|실패\s*[·.]?\s*회복)\s*[:：]/i
  const titleMatch = titlePattern.exec(text)
  const categoryMatch = titleMatch ? null : categoryPattern.exec(text)
  const match = titleMatch ?? categoryMatch
  if (!match || match.index === undefined) return text.trim()

  const start = match.index + (match[0].startsWith('\n') ? 1 : 0)
  const remainder = text.slice(start)
  const nextSection = remainder.search(
    /\n\s*\**\s*#{1,3}\s+(?!Keywords:\s*(?:Experience|Relationship)\b)/i
  )
  const end = nextSection >= 0 ? nextSection : remainder.length
  return `${text.slice(0, start)}${remainder.slice(end)}`.trim()
}

function hasStep3ResultHeader(text: string, kind: 'experience' | 'relationship') {
  return kind === 'experience'
    ? /(?:^|\n)\s*\**\s*#{1,3}\s*Keywords:\s*Experience\b/i.test(text)
    : /(?:^|\n)\s*\**\s*#{1,3}\s*Keywords:\s*Relationship\b/i.test(text)
}

function buildStep3FallbackQuestion(progress: Step3Progress) {
  const topic = progress.currentTopic
  const questionKind = progress.topics[topic].pendingQuestionKind ?? 'core'
  const coreQuestions: Record<Step3TopicKey, string> = {
    emotion: '제품을 사용하기 전과 사용한 뒤, 사용자의 감정이 어떻게 달라지면 좋을까요?',
    behavior: '제품을 사용한 뒤 사용자가 새롭게 하거나 더 안정적으로 이어가고 싶은 행동은 무엇일까요?',
    space: '제품이 놓이는 공간에서 어떤 모습으로 보이고 주변과 어떻게 어우러지면 좋을까요?',
    userProduct: '사용자가 이 제품과 어떤 방식으로 관계를 맺고 직접 조작하거나 의지하면 좋을까요?',
    existingTool: '지금 사용하는 도구나 방식과 이 제품이 어떤 역할로 함께 작동하면 좋을까요?',
    environment: '제품이 놓일 환경과 어떤 관계를 맺고 주변 조건에 어떻게 대응하면 좋을까요?',
    otherPeople: '다른 사람과 함께 사용할 때 제품의 역할은 무엇이면 좋을까요?',
    timeRoutine: '이 제품이 사용자의 시간과 반복되는 루틴에 어떤 변화를 만들면 좋을까요?',
    failureRecovery: '사용 중 문제가 생겼을 때 사용자가 어떻게 알아차리고 다시 회복할 수 있으면 좋을까요?',
  }
  if (questionKind === 'core') return coreQuestions[topic]
  return `방금 말씀하신 내용을 바탕으로 ${STEP3_TOPIC_LABELS[topic]}에서 한 가지를 더 구체화한다면, 사용자가 실제 상황에서 무엇을 느끼거나 하게 되면 좋을까요?`
}

function buildStep3ContextualFallbackQuestion({
  progress,
  project,
  lastUserMessage,
}: {
  progress: Step3Progress
  project: Awaited<ReturnType<typeof getProjectForUser>>
  lastUserMessage: string
}) {
  const productName = '이 제품'
  const productObject = chooseKoreanParticle(productName, '을', '를')
  const productTopic = chooseKoreanParticle(productName, '은', '는')
  const productSubject = chooseKoreanParticle(productName, '이', '가')
  const productWith = chooseKoreanParticle(productName, '과', '와')
  const topic = progress.currentTopic
  const questionKind = progress.topics[topic].pendingQuestionKind ?? 'core'
  const isReask = progress.topics[topic].reaskCount > 0

  const questions: Record<Step3TopicKey, string> = {
    emotion: `${productObject} 쓰기 전과 쓰고 난 뒤, 사용자의 기분이 어떻게 달라지면 좋을까요?`,
    behavior: `${productName} 덕분에 사용자가 더 쉽게 하거나 계속 이어 갈 수 있게 되는 일은 무엇일까요?`,
    space: `${productTopic} 주로 어디에 두고 쓰게 될까요?`,
    userProduct: `${productSubject} 알아서 해 줬으면 하는 일과, 사용자가 직접 정하고 싶은 일은 무엇일까요?`,
    existingTool: `사용자가 이미 쓰고 있는 물건 중 ${productWith} 함께 쓰게 되는 것이 있을까요?`,
    environment: `장소나 날씨가 바뀌어도 ${productSubject} 꼭 지켜야 하는 점은 무엇일까요?`,
    otherPeople: `${productObject} 쓸 때 주변 사람이 보거나 함께 쓰게 되는 순간이 있을까요?`,
    timeRoutine: `${productObject} 평소에 쓰면서, 관리하는 수고는 어느 정도까지 괜찮을까요?`,
    failureRecovery: `${productSubject} 제대로 작동하지 않을 때, 사용자는 어떻게 알아채고 다시 쓸 수 있으면 좋을까요?`,
  }

  if (topic === 'emotion' || topic === 'behavior' || topic === 'space' || topic === 'userProduct' || topic === 'existingTool' || topic === 'environment' || topic === 'otherPeople' || topic === 'timeRoutine' || topic === 'failureRecovery') {
    if (!isReask && questionKind === 'core') return questions[topic]

    const detail = lastUserMessage
      ? `방금 말씀하신 '${lastUserMessage}' 내용을 바탕으로, `
      : ''
    return `${detail}${questions[topic]}`
  }

  const problemQuestions: Record<string, string> = {
    scene: `${productSubject} 가장 필요해지는 순간을 떠올려 보면, 사용자는 어디에서 무엇을 하고 있나요?`,
    goal: `그 순간 문제가 없었다면, 사용자는 무엇을 끝내거나 계속하고 싶었을까요?`,
    breakpoint: '그 장면에서 사용자가 처음 멈칫하거나 불편해지는 순간은 언제인가요?',
    currentResponse: '사용자는 지금 그 불편을 어떤 방법이나 물건으로 해결하고 있나요?',
    remainingProblem: '지금 방법으로 해결해도 여전히 남는 가장 큰 불편은 무엇인가요?',
    conditions: '같은 사용자라도 그 불편이 더 커지거나 덜 느껴지는 때는 언제인가요?',
    minimumChange: `${productSubject} 모든 걸 해결하지 못해도, 어떤 한 가지만 달라지면 써 볼 만하다고 느낄까요?`,
  }
  return problemQuestions[topic] ?? `${productSubject} 사용 장면에서 가장 먼저 확인하고 싶은 점은 무엇인가요?`
}

function isUsableStep3FallbackQuestion(text: string) {
  const trimmed = text.trim()
  return Boolean(
    trimmed &&
    !/Keywords:\s*(?:Experience|Relationship)|Persona\s*Summary|<<AIDEE_/i.test(trimmed) &&
    !/^\s*#{1,6}\s/m.test(trimmed) &&
    /[?？]|(?:까요|나요|가요|인가요)[.!]?$/i.test(trimmed)
  )
}

function hasStep3Question(text: string) {
  return /[?？]|(?:까요|나요|인가요|일까요|할까요|해\s*주세요|말씀해\s*주세요|알려\s*주세요)(?=[.!。！？]?\s|$)/im.test(text.trim())
}

function hasStep3ForbiddenDialogueContent(text: string) {
  return Boolean(
    /<<AIDEE_/i.test(text) ||
    /(?:Keywords\s*:\s*(?:Experience|Relationship)|Problem\s*Statements|Persona\s*Summary)/i.test(text) ||
    /(?:^|\n)\s*\**#{1,6}\s*/m.test(text) ||
    /(?:^|\n)\s*\**(?:감정|행동|공간|Emotion|Action|Space|사용자\s*와\s*제품|기존\s*도구|다른\s*사람|시간\s*[·.]?\s*루틴|실패\s*[·.]?\s*회복)\s*[:：]/im.test(text) ||
    /(?:다음으로|다음\s*단계|다음은|다음\s*하위\s*주제|하위\s*주제|마지막으로|마지막\s*질문|하나만\s*더|STEP\s*[2-7]|전체\s*개발\s*프로세스|프로세스\s*확인|정리해\s*드릴게요|요약해\s*드릴게요)/i.test(text)
    || /핵심\s*질문|심화\s*질문|확인할\s*내용/i.test(text)
  )
}

function removeStep3InternalLabels(text: string) {
  return text
    .replace(
      /(^|\n)\s*(?:\*{1,2}|_{1,2})?\s*(?:핵심\s*질문|심화\s*질문|확인할\s*내용)\s*[:：]\s*(?:\*{1,2}|_{1,2})?\s*/gim,
      '$1'
    )
    .replace(/\s*(?:핵심\s*질문|심화\s*질문|확인할\s*내용)\s*[:：]\s*/gi, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function removeStep3ProgressLanguage(text: string) {
  return text
    .replace(/마지막\s*질문(?:으로)?/gi, '')
    .replace(/마지막으로/gi, '')
    .replace(/하나만\s*더/gi, '')
    .replace(/다음\s*하위\s*주제/gi, '')
    .replace(/다음은/gi, '')
    .replace(/다음으로/gi, '')
    .replace(/하위\s*주제/gi, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([,。.!?？])/g, '$1')
    .trim()
}

function removeStep3SystemStateSentences(text: string) {
  const stateLinePattern = /(?:Problem\s*Statements.*(?:확정|시각화)|(?:다음으로|이제)\s+(?:Keywords|STEP\s*[2-7]).*(?:넘어가|시작)|(?:확정|시각화)\s*(?:되었습니다|완료)|(?:버튼을|버튼이)|프로세스\s*확인)/i
  return text
    .split(/\r?\n/)
    .filter((line) => !stateLinePattern.test(line.trim()))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function getStep3QuestionEndIndexes(text: string) {
  const indexes: number[] = []
  const questionPattern = /[?？]|(?:까요|나요|인가요|일까요|할까요|해\s*주세요|말씀해\s*주세요|알려\s*주세요)(?=[.!。！？]?\s|$)/gi
  let match: RegExpExecArray | null
  while ((match = questionPattern.exec(text))) {
    if (!isInsideStep3Quote(text, match.index)) {
      indexes.push(match.index + match[0].length)
    }
  }
  return indexes
}

function isInsideStep3Quote(text: string, index: number) {
  let quote: string | null = null
  const closingQuotes: Record<string, string> = {
    '“': '”',
    '「': '」',
    '『': '』',
  }
  for (let cursor = 0; cursor < index; cursor += 1) {
    const character = text[cursor]
    if (quote) {
      if (character === quote) quote = null
      continue
    }
    if (closingQuotes[character]) {
      quote = closingQuotes[character]
    } else if (character === '"' || character === "'") {
      quote = character
    }
  }
  return quote !== null
}

function hasBalancedStep3Quotes(text: string) {
  return !isInsideStep3Quote(text, text.length)
}

function startsWithStep3Clarification(text: string) {
  return /^(?:예를 들어|즉|말하자면)(?=\s|,|:|$)/i.test(text.trimStart())
}

function normalizeStep3DialogueResponse(text: string) {
  const withoutState = removeStep3InternalLabels(
    removeStep3ProgressLanguage(
    removeStep3SystemStateSentences(text)
    )
  )
  const questionEnds = getStep3QuestionEndIndexes(withoutState)
  if (questionEnds.length <= 1) return withoutState

  const firstQuestionEnd = questionEnds[0]
  const afterFirstQuestion = withoutState.slice(firstQuestionEnd).trimStart()
  if (startsWithStep3Clarification(afterFirstQuestion)) {
    const followingQuestionEnds = getStep3QuestionEndIndexes(afterFirstQuestion)
    if (followingQuestionEnds.length > 0) {
      return `${withoutState.slice(0, firstQuestionEnd)} ${afterFirstQuestion.slice(0, followingQuestionEnds[0]).trim()}`.trim()
    }
  }

  // 두 번째 질문 뒤에 있는 힌트는 첫 번째 질문에 대한 것인지 확인할 수 없으므로 함께 제거합니다.
  const firstQuestionOnly = withoutState.slice(0, questionEnds[0]).trim()
  return hasBalancedStep3Quotes(firstQuestionOnly) && firstQuestionOnly.endsWith('?')
    ? firstQuestionOnly
    : withoutState
}

function isStep3ClarifyingQuestionChain(text: string) {
  const questionEnds = getStep3QuestionEndIndexes(text)
  if (questionEnds.length !== 2) return false
  return startsWithStep3Clarification(text.slice(questionEnds[0]))
}

function isValidStep3DialogueResponse(text: string) {
  const trimmed = text.trim()
  if (!trimmed || !hasStep3Question(trimmed)) return false
  if (hasStep3ForbiddenDialogueContent(trimmed)) return false
  const questionMarks = (trimmed.match(/[?？]/g) ?? []).length
  return questionMarks <= 1 || isStep3ClarifyingQuestionChain(trimmed)
}

function normalizeStep3ResultLine(line: string) {
  return line
    .trim()
    .replace(/^\*+\s*/, '')
    .replace(/\s*\*+$/, '')
    .replace(/^[-•*]\s*/, '')
    .replace(/^#{1,6}\s*/, '')
    .trim()
}

function isValidStep3ResultFormat(
  text: string,
  kind: 'experience' | 'relationship'
) {
  return getStep3ResultValidationReasons(text, kind).length === 0
}

function getStep3ResultValidationReasons(
  text: string,
  kind: 'experience' | 'relationship'
) {
  const reasons: string[] = []
  const marker = kind === 'experience'
    ? '<<AIDEE_STEP3_EXPERIENCE_READY>>'
    : '<<AIDEE_STEP3_RELATIONSHIP_READY>>'
  const markerIndex = text.indexOf(marker)
  if (markerIndex < 0) reasons.push('missing-result-marker')
  if (markerIndex >= 0 && text.slice(markerIndex + marker.length).trim()) {
    reasons.push('text-after-result-marker')
  }

  const body = text.slice(0, markerIndex >= 0 ? markerIndex : undefined).trim()
  const lines = body
    .split(/\r?\n/)
    .map(normalizeStep3ResultLine)
    .filter(Boolean)
  const title = kind === 'experience' ? 'Keywords: Experience' : 'Keywords: Relationship'
  const labels = kind === 'experience'
    ? ['감정', '행동', '공간']
    : ['사용자와 제품', '기존 도구', '환경', '다른 사람', '시간·루틴', '실패·회복']
  const expectedCount = kind === 'experience' ? 10 : 5

  if (lines.length !== labels.length + 1 || lines[0].toLowerCase() !== title.toLowerCase()) {
    reasons.push('invalid-result-lines')
  }

  labels.forEach((label, index) => {
    const line = lines[index + 1]
    if (!line) {
      reasons.push(`${label}: 0개/${expectedCount}개`)
      return
    }
    const separator = line.indexOf(':') >= 0 ? ':' : '：'
    const [actualLabel, rawKeywords = ''] = line.split(separator)
    if (actualLabel.trim() !== label) {
      reasons.push(`${label}: 항목 누락 또는 라벨 불일치`)
      return
    }
    const keywords = rawKeywords.split(',').map((keyword) => keyword.trim()).filter(Boolean)
    if (keywords.length !== expectedCount) {
      reasons.push(`${label}: ${keywords.length}개/${expectedCount}개`)
    }
    if (!keywords.every((keyword) => keyword.length >= 2 && keyword.length <= 10)) {
      reasons.push(`${label}: 키워드 길이 오류`)
    }
  })
  if (hasStep3Question(text)) reasons.push('question-in-result')
  return reasons
}

function splitStep3ResultResponse(
  text: string,
  kind: 'experience' | 'relationship'
) {
  const title = kind === 'experience' ? 'Keywords: Experience' : 'Keywords: Relationship'
  const titlePattern = kind === 'experience'
    ? /(?:^|\n)\s*\**\s*#{0,3}\s*Keywords:\s*Experience\b/i
    : /(?:^|\n)\s*\**\s*#{0,3}\s*Keywords:\s*Relationship\b/i
  const match = titlePattern.exec(text)
  if (!match || match.index === undefined) return null
  const titleStart = match.index + (match[0].startsWith('\n') ? 1 : 0)
  const reaction = text.slice(0, titleStart).trim()
  const result = text
    .slice(titleStart)
    .replace(/\s*<<AIDEE_STEP3_(?:EXPERIENCE|RELATIONSHIP)_READY>>\s*/gi, '')
    .trim()
  if (!result.toLowerCase().startsWith(title.toLowerCase())) return null
  return { reaction, result }
}

type Step4ResearchSplit = {
  intro: string
  result: string
  followUp: string
}

function isLikelyStep4QuestionLine(line: string) {
  const normalized = line.trim()
  return (
    /[?？]\s*$/.test(normalized) ||
    /(?:까요|나요|할까요|어떨까요|원하시나요|생각하시나요)\s*[.!。]?$/i.test(
      normalized
    )
  )
}

function splitStep4ResearchResponse(text: string): Step4ResearchSplit | null {
  const titlePattern = /(?:^|\n)\s*(?:\*{1,2})?\s*#{0,3}\s*(Tam\s+Sam\s+Som|Keywords\s*:\s*Consumption|Positioning\s+Map\s*:\s*Brand)\b[^\n]*/i
  const titleMatch = titlePattern.exec(text)
  if (!titleMatch || titleMatch.index === undefined) return null

  const titleStart = titleMatch.index + (titleMatch[0].startsWith('\n') ? 1 : 0)
  const intro = text.slice(0, titleStart).trim()
  const remainder = text.slice(titleStart)
  const lines = remainder.split(/\r?\n/)
  const normalizedTitle = titleMatch[0].replace(/^\s*\n?/, '').trim()
  let hasResultAnchor = false
  let splitIndex = -1

  for (let index = 1; index < lines.length; index += 1) {
    const line = lines[index].trim()
    if (!line) continue

    if (
      /TAM|SAM|SOM|PROJECT\s*GOAL|키워드|Keywords?|OUR\s*BRAND|X축|Y축|포지션|브랜드/i.test(
        line
      )
    ) {
      hasResultAnchor = true
    }

    if (
      hasResultAnchor &&
      (isLikelyStep4QuestionLine(line) || /^A[.)]\s+/i.test(line))
    ) {
      splitIndex = index
      break
    }
  }

  const resultLines = splitIndex >= 0 ? lines.slice(0, splitIndex) : lines
  const followUpLines = splitIndex >= 0 ? lines.slice(splitIndex) : []
  const result = [normalizedTitle, ...resultLines.slice(1)]
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  const followUp = followUpLines.join('\n').trim()

  if (!result) return null

  return { intro, result, followUp }
}

function extractStep3KeywordBlock(
  text: string,
  kind: 'experience' | 'relationship'
) {
  const title = kind === 'experience' ? 'Keywords: Experience' : 'Keywords: Relationship'
  const titlePattern = kind === 'experience'
    ? /(?:^|\n)\s*\**\s*#{0,3}\s*Keywords:\s*Experience\b/i
    : /(?:^|\n)\s*\**\s*#{0,3}\s*Keywords:\s*Relationship\b/i
  const titleMatch = titlePattern.exec(text)
  if (!titleMatch || titleMatch.index === undefined) return null

  const labels = kind === 'experience'
    ? ['감정', '행동', '공간']
    : ['사용자와 제품', '기존 도구', '환경', '다른 사람', '시간·루틴', '실패·회복']
  const expectedCount = kind === 'experience' ? 10 : 5
  const body = text
    .slice(titleMatch.index + titleMatch[0].length)
    .split(/<<AIDEE_STEP3_(?:EXPERIENCE|RELATIONSHIP)_READY>>/i)[0]
  const extractedKeywords = new Map<string, string[]>()
  let foundLabels = 0
  let totalKeywords = 0
  let score = 0

  for (const label of labels) {
    const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const line = body.match(
      new RegExp(`(?:^|\\n)\\s*[-•*]?\\s*${escapedLabel}\\s*[:：]([^\\n]*)`, 'i')
    )
    if (!line) continue
    foundLabels += 1
    const keywords = line[1].split(',').map((keyword) => keyword.trim()).filter(Boolean)
    totalKeywords += keywords.length
    score += 10 + Math.min(keywords.length, expectedCount)
    extractedKeywords.set(label, keywords.slice(0, expectedCount))
  }

  if (foundLabels === 0 || totalKeywords === 0) return null
  score += foundLabels * 20
  const placeholder = '재생성 필요'
  const outputLines = [
    `## ${title}`,
    ...labels.map((label) => {
      const keywords = extractedKeywords.get(label) ?? []
      return `${label}: ${(keywords.length > 0
        ? keywords
        : Array.from({ length: expectedCount }, () => placeholder)
      ).join(', ')}`
    }),
  ]
  return {
    text: `${outputLines.join('\n')}\n${kind === 'experience' ? '<<AIDEE_STEP3_EXPERIENCE_READY>>' : '<<AIDEE_STEP3_RELATIONSHIP_READY>>'}`,
    score,
    foundLabels,
    expectedLabels: labels.length,
    expectedCount,
  }
}

function buildStep3EmergencyResult(
  kind: 'experience' | 'relationship'
) {
  const title = kind === 'experience' ? 'Keywords: Experience' : 'Keywords: Relationship'
  const labels = kind === 'experience'
    ? ['감정', '행동', '공간']
    : ['사용자와 제품', '기존 도구', '환경', '다른 사람', '시간·루틴', '실패·회복']
  const count = kind === 'experience' ? 10 : 5
  const placeholder = Array.from({ length: count }, () => '재생성 필요').join(', ')
  return [
    `## ${title}`,
    ...labels.map((label) => `${label}: ${placeholder}`),
    kind === 'experience'
      ? '<<AIDEE_STEP3_EXPERIENCE_READY>>'
      : '<<AIDEE_STEP3_RELATIONSHIP_READY>>',
  ].join('\n')
}

async function generateStep3FallbackQuestion({
  apiKey,
  progress,
  conversation,
}: {
  apiKey: string
  progress: Step3Progress
  conversation: Array<{ role: string; content: string }>
}) {
  if (!apiKey) return null
  const current = progress.topics[progress.currentTopic]
  const lastUserMessage = [...conversation]
    .reverse()
    .find((message) => message.role === 'user')?.content ?? ''
  const raw = await generateGeminiText({
    apiKey,
    messages: [{
      role: 'user',
      content: [
        'STEP 3의 현재 질문을 한 문장으로 다시 작성하세요. 질문만 출력하세요.',
        `현재 하위 주제: ${STEP3_TOPIC_LABELS[progress.currentTopic]}`,
        `질문 종류: ${current.pendingQuestionKind === 'deep' ? '심화' : '핵심'}`,
        '핵심 질문이면 해당 하위 주제의 핵심을, 심화 질문이면 직전 사용자 답변을 바탕으로 더 구체적으로 물으세요.',
        '프로젝트 맥락에 맞는 쉬운 표현을 사용하고, 프롬프트의 질문 문장을 그대로 복사하지 마세요.',
        '결과, 키워드 목록, 내부 단계명, 마커, 선택지를 출력하지 마세요.',
        `직전 사용자 답변: ${lastUserMessage}`,
      ].join('\n'),
    }],
    system: 'STEP 3 질문 재생성기입니다. 프로젝트에 맞는 질문 한 문장만 반환하세요.',
  })
  return isUsableStep3FallbackQuestion(raw) ? raw.trim() : null
}

function sanitizeStep3Response({
  messages,
  phase,
  text,
  progress,
  onResultRemoved,
}: {
  messages: Array<{ content: string; role: string }>
  phase: Step3Phase
  text: string
  progress: Step3Progress | null
  onResultRemoved?: () => void
}) {
  const experienceTopicsComplete = Boolean(
    progress && areStep3TopicsComplete(progress, 'experience')
  )
  const relationshipTopicsComplete = Boolean(
    progress && areStep3TopicsComplete(progress, 'relationship')
  )
  const canAcceptExperienceResult =
    phase === 'experience_dialogue' &&
    experienceTopicsComplete &&
    hasStep3ResultHeader(text, 'experience') &&
    /<<AIDEE_STEP3_EXPERIENCE_READY>>/i.test(text) &&
    hasStep3ArtifactEvent(messages, 'problem_statements', 'visualized')
  const canAcceptRelationshipResult =
    phase === 'relationship_dialogue' &&
    relationshipTopicsComplete &&
    hasStep3ResultHeader(text, 'relationship') &&
    /<<AIDEE_STEP3_RELATIONSHIP_READY>>/i.test(text) &&
    hasStep3ArtifactEvent(messages, 'keyword_experience', 'visualized')

  let sanitized = text
    .replace(/\s*<<AIDEE_STEP3_(?:EXPERIENCE|RELATIONSHIP)_READY>>\s*/gi, '\n')

  if (!canAcceptExperienceResult) {
    const next = removeStep3ResultBlock(sanitized, 'experience')
    if (next !== sanitized) onResultRemoved?.()
    sanitized = next
  }

  if (!canAcceptRelationshipResult) {
    const next = removeStep3ResultBlock(sanitized, 'relationship')
    if (next !== sanitized) onResultRemoved?.()
    sanitized = next
  }

  if (hasStep3ArtifactEvent(messages, 'problem_statements', 'visualized')) {
    const next = sanitized.replace(
      /(?:^|\n)\s*#{0,3}\s*Problem\s*Statements\b[^\n]*[\s\S]*?(?=\n\s*#{1,3}\s|$)/i,
      ''
    ).trim()
    if (next !== sanitized) onResultRemoved?.()
    sanitized = next
  }

  if (
    phase !== 'persona_followup' &&
    phase !== 'relationship_visualization'
  ) {
    sanitized = sanitized.replace(
      /(?:^|\n)\s*#{0,3}\s*Persona\s*Summary\b[^\n]*[\s\S]*?(?=\n\s*#{1,3}\s|$)/i,
      ''
    ).trim()
  }

  if (sanitized.trim()) return sanitized.trim()

  if (phase === 'experience_dialogue') {
    return '이제 제품을 사용하면서 기대하는 경험의 변화를 한 가지씩 살펴볼게요. 제품을 사용하기 전과 사용한 뒤, 사용자의 감정이 어떻게 달라졌으면 하나요?'
  }

  if (phase === 'relationship_dialogue') {
    return '이제 제품과 주변 환경의 관계를 한 가지씩 살펴볼게요. 사용자가 이미 사용하는 도구나 방식 중 새로운 제품이 함께 작동해야 하는 것은 무엇인가요?'
  }

  return sanitized.trim()
}

function hasDirectionResearch(
  messages: Array<{ content: string }>,
  additionalContent = ''
) {
  const content = [...messages.map((message) => message.content), additionalContent]
    .join('\n')

  return [
    /#{1,3}\s*(?:시장\s*규모\s*리서치|Tam\s*Sam\s*Som)/i,
    /#{1,3}\s*(?:소비\s*트렌드\s*리서치|Keywords:\s*Consumption)/i,
    /#{1,3}\s*(?:경쟁사\s*리서치|Positioning\s*Map:\s*Brand)/i,
  ].every((pattern) => pattern.test(content))
}

function hasCompletedDirectionFlow(
  messages: Array<{ content: string }>
) {
  return messages.some((message) =>
    /STEP\s*4\.\s*개발\s*방향\s*도출\s*단계가\s*완료되었습니다/i.test(
      message.content
    )
  )
}

function isDirectionResearchRequest(text: string) {
  return /(?:시장\s*규모|소비\s*트렌드|경쟁사)\s*리서치\s*(?:보기|다시\s*생성하기)/i.test(
    text
  )
}

const DIRECTION_RESEARCH_ARTIFACT_TYPES = [
  'direction_market_size',
  'direction_consumption_keywords',
  'direction_brand_positioning',
] as const

function hasPendingStep4ResearchQuestion(
  messages: Array<{ content: string; role?: string }>
) {
  const latestVisualizationIndex = messages.reduce(
    (latestIndex, message, index) => {
      if (message.role !== 'system') return latestIndex
      const event = getArtifactEvent(message.content)
      return event &&
        event.eventType === 'visualized' &&
        DIRECTION_RESEARCH_ARTIFACT_TYPES.includes(
          event.artifactType as (typeof DIRECTION_RESEARCH_ARTIFACT_TYPES)[number]
        )
        ? index
        : latestIndex
    },
    -1
  )

  if (latestVisualizationIndex < 0) return false

  const messagesAfterVisualization = messages.slice(latestVisualizationIndex + 1)
  return (
    messagesAfterVisualization.some((message) => message.role === 'assistant') &&
    !messagesAfterVisualization.some((message) => message.role === 'user')
  )
}

function hasStep4NextResearchQuestion(text: string) {
  return /(?:다음|남은|다른)(?:\s*으로)?[\s\S]{0,30}(?:리서치|조사).*(?:진행|시작|확인|살펴|볼까요|할까요)/i.test(
    text
  )
}

function shouldKeepStep4ResearchWidgets({
  allowWidgets,
  text,
  messages,
}: {
  allowWidgets: boolean
  text: string
  messages: Array<{ content: string; role: string; stageKey?: StageKey }>
}) {
  if (!allowWidgets) return false

  const hasStep4AssistantResponse = messages.some(
    (message) =>
      message.role === 'assistant' && message.stageKey === 'step_4_direction'
  )

  return (
    (!hasStep4AssistantResponse && !hasDirectionResearch(messages)) ||
    hasStep4NextResearchQuestion(text)
  )
}

function removeStep4ResearchWidgets(text: string) {
  return text
    .replace(
      /\n?<<AIDEE_DIRECTION_WIDGETS>>[\s\S]*?<<\/AIDEE_DIRECTION_WIDGETS>>/gi,
      ''
    )
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function isExplicitStep4ProceedRequest(text: string) {
  // Triggers Unsplash moodboard_candidate search — only when user explicitly selects a style mood
  return /스타일\s*분위기를\s*선택했어요/i.test(text)
}

type StyleMoodWidget = {
  description: string
  title: string
}

function parseStyleMoodWidgets(text: string): StyleMoodWidget[] {
  const widgetsMatch = text.match(/\{\s*"widgets"\s*:\s*(\[[\s\S]*?\])\s*\}/i)

  if (widgetsMatch) {
    try {
      const parsed = JSON.parse(widgetsMatch[1]) as unknown

      if (Array.isArray(parsed)) {
        return parsed
          .filter(
            (item): item is Record<string, unknown> =>
              Boolean(item) && typeof item === 'object'
          )
          .map((item) => ({
            description:
              typeof item.description === 'string' ? item.description.trim() : '',
            title: typeof item.title === 'string' ? item.title.trim() : '',
          }))
          .filter((item) => item.title)
          .slice(0, 3)
      }
    } catch {
      return []
    }
  }

  const moodsMatch = text.match(/\{\s*"moods"\s*:\s*(\[[\s\S]*?\])\s*\}/i)

  if (!moodsMatch) return []

  try {
    const parsed = JSON.parse(moodsMatch[1]) as unknown

    return Array.isArray(parsed)
      ? parsed
          .filter((item): item is string => typeof item === 'string')
          .map((item) => ({ description: '', title: item.trim() }))
          .filter((item) => item.title)
          .slice(0, 3)
      : []
  } catch {
    return []
  }
}

function getStyleWidgetSearchQuery(widget: StyleMoodWidget) {
  const englishTitle = widget.title.match(/\(([^)]+)\)/)?.[1]
  const title = (englishTitle ?? widget.title)
    .replace(/[^a-zA-Z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return `${title || 'modern minimal'} product design`.slice(0, 100)
}

const STYLE_KEYWORD_FALLBACKS = {
  emotional: [
    '차분한', '편안한', '안정적인', '따뜻한', '고요한', '산뜻한', '경쾌한', '정돈된',
    '활기찬', '몰입감 있는', '섬세한', '부드러운', '세련된', '신뢰감 있는', '친근한',
    '감각적인', '위로가 되는', '자기주도적인', '특별한', '영감을 주는',
  ],
  color: [
    '맑은', '따뜻한', '차가운', '중성적인', '선명한', '은은한', '깊은', '투명한',
    '자연스러운', '모던한', '빈티지한', '팝한', '어두운', '밝은', '흙빛의',
    '금속적인', '파스텔의', '무채색의', '원색적인', '그라데이션의',
  ],
  structure: [
    '단순한', '직선적인', '곡선적인', '기하학적인', '비대칭적인', '대칭적인', '미니멀한',
    '구조적인', '유기적인', '각진', '둥근', '날카로운', '두꺼운', '얇은',
    '레이어드된', '모듈형', '컴팩트한', '개방적인', '폐쇄적인', '견고한',
  ],
  texture: [
    '부드러운', '거친', '매끄러운', '따뜻한', '차가운', '무광의', '유광의',
    '천연의', '인공적인', '금속성의', '나무질의', '고무질의', '섬유질의',
    '폼 같은', '크리스탈의', '무게감 있는', '가벼운', '탄성 있는', '딱딱한', '유연한',
  ],
} as const

async function generateStyleKeywords(
  apiKey: string,
  conversation: string
): Promise<{
  emotional: string[]
  color: string[]
  structure: string[]
  texture: string[]
}> {
  const fallback = {
    emotional: [...STYLE_KEYWORD_FALLBACKS.emotional],
    color: [...STYLE_KEYWORD_FALLBACKS.color],
    structure: [...STYLE_KEYWORD_FALLBACKS.structure],
    texture: [...STYLE_KEYWORD_FALLBACKS.texture],
  }

  if (!apiKey) return fallback

  const prompt = [
    '당신은 제품 디자인 스타일 컨설턴트입니다.',
    '아래 프로젝트 대화를 분석해 각 스타일 카테고리별 한국어 형용사 키워드를 정확히 20개씩 생성하세요.',
    '',
    '반드시 아래 JSON 형식만 출력하세요. 설명·코드블록 없이 { } 로 시작하는 순수 JSON만.',
    '{"emotional":["키워드1","키워드2",...총20개],"color":[...총20개],"structure":[...총20개],"texture":[...총20개]}',
    '',
    '카테고리 설명:',
    '- emotional: 제품 사용 시 느끼는 감정/분위기 (예: 차분한, 활기찬)',
    '- color: 색감/색상 분위기 (예: 맑은, 따뜻한)',
    '- structure: 형태/구조 인상 (예: 단순한, 곡선적인)',
    '- texture: 표면/촉감 (예: 부드러운, 무광의)',
    '',
    '조건: 각 카테고리 정확히 20개, 2~7글자 한국어 형용사, 다양한 스펙트럼 포함.',
    '',
    '프로젝트 대화 (참고용):',
    conversation.slice(0, 2500),
  ].join('\n')

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }], role: 'user' }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
        }),
      }
    )
    if (!res.ok) return fallback

    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
    }
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''

    // Extract JSON object from anywhere in the response
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return fallback

    const parsed = JSON.parse(jsonMatch[0]) as Partial<typeof fallback>
    const emotional = (parsed.emotional ?? []).slice(0, 20)
    const color = (parsed.color ?? []).slice(0, 20)
    const structure = (parsed.structure ?? []).slice(0, 20)
    const texture = (parsed.texture ?? []).slice(0, 20)

    // Only use Gemini result if all categories have at least 10 keywords
    if (
      emotional.length >= 10 &&
      color.length >= 10 &&
      structure.length >= 10 &&
      texture.length >= 10
    ) {
      return { emotional, color, structure, texture }
    }
    return fallback
  } catch {
    return fallback
  }
}

function appendDirectionCompletionPrompt(text: string) {
  if (/STEP\s*5|디자인\s*컨셉.*(?:넘어|진행)|시작할까요/i.test(text)) {
    return text
  }

  return [
    text,
    '',
    'STEP 4. 개발 방향 도출 단계가 완료되었습니다.',
    '',
    '다음으로 STEP 5. 디자인 컨셉 도출 단계로 넘어가겠습니다. STEP 5. 디자인 컨셉 도출을 시작할까요?',
  ].join('\n')
}

function hasPersonaCard(messages: Awaited<ReturnType<typeof getProjectMessages>>) {
  return messages.some((message) => Boolean(message.personaCardBlock))
}

function getLatestPersonaCard(
  messages: Awaited<ReturnType<typeof getProjectMessages>>
) {
  for (const message of [...messages].reverse()) {
    if (message.personaCardBlock) {
      return message.personaCardBlock
    }
  }

  return null
}

function shouldCreatePersonaCard({
  allowReplacement,
  currentStageKey,
  hasExistingPersonaCard,
  text,
}: {
  allowReplacement: boolean
  currentStageKey: StageKey
  hasExistingPersonaCard: boolean
  text: string
}) {
  if (
    (!allowReplacement && hasExistingPersonaCard) ||
    !currentStageKey.startsWith('step_3')
  ) {
    return false
  }

  const requiredSections = [
    /(?:^|\n)\s*(?:#{1,6}\s*)?(?:\*{1,2})?Demographic\s*Info(?:\*{1,2})?\s*(?:\n|:|：)/i,
    /(?:^|\n)\s*(?:#{1,6}\s*)?(?:\*{1,2})?Persona\s*Story(?:\*{1,2})?\s*(?:\n|:|：)/i,
    /(?:^|\n)\s*(?:#{1,6}\s*)?(?:\*{1,2})?Problem\s*&?\s*Needs?(?:\*{1,2})?\s*(?:\n|:|：)/i,
    /(?:^|\n)\s*(?:#{1,6}\s*)?(?:\*{1,2})?Current\s*Behavior(?:\*{1,2})?\s*(?:\n|:|：)/i,
    /(?:^|\n)\s*(?:#{1,6}\s*)?(?:\*{1,2})?Lifestyle\s*Context(?:\*{1,2})?\s*(?:\n|:|：)/i,
    /(?:^|\n)\s*(?:#{1,6}\s*)?(?:\*{1,2})?Relationship\s*Keyword(?:\*{1,2})?\s*(?:\n|:|：)/i,
  ]

  return requiredSections.every((pattern) => pattern.test(text))
}

function hasDensePersonaCardData(
  data: ReturnType<typeof buildPersonaCardDataFromText>
) {
  return (
    data.demographicInfo.length >= 5 &&
    (data.personaStory[0]?.length ?? 0) >= 60 &&
    data.problemNeeds.length >= 5 &&
    data.currentBehavior.length >= 5 &&
    data.lifestyleContext.length >= 5 &&
    data.relationshipKeyword.length >= 5
  )
}

async function enrichPersonaSummary({
  apiKey,
  conversation,
  draft,
}: {
  apiKey: string
  conversation: string
  draft: string
}) {
  return generateGeminiText({
    apiKey,
    messages: [
      {
        role: 'user',
        content: [
          '아래 대화와 초안을 바탕으로 제품 기획용 Persona Summary를 충분한 정보 밀도로 다시 작성하세요.',
          '사용자가 직접 말한 정보는 유지하고, 누락된 세부 정보는 누적 대화의 제품·문제·행동·생활 맥락에서 설득력 있게 추론하세요.',
          '카드 UI에 들어갈 내용이므로 장문 설명이나 반복은 피하되, 각 섹션을 한 줄로 축약하지 마세요.',
          '"정리 필요", 빈 항목, 말줄임표, 코드 블록, 질문, 버튼 안내, 다음 단계 안내는 절대 포함하지 마세요.',
          '',
          '정확한 출력 형식과 분량:',
          '## Persona Summary',
          '### Demographic Info',
          '- 이름 또는 호칭 | 구체적인 나이 또는 나이대 (18자 이내)',
          '- 직업·현재 상태 (24자 이내)',
          '- 주요 사용 환경 2~3곳 (28자 이내)',
          '- 반복되는 생활 패턴 (32자 이내)',
          '- 제품과 연결되는 핵심 특징 (30자 이내)',
          '### Persona Story',
          '상황, 반복되는 문제, 제품에 기대하는 역할을 연결한 70~100자의 3~4줄 분량 문단',
          '### Problem & Needs',
          '- 서로 다른 문제와 니즈 5개 (각 18~32자)',
          '### Current Behavior',
          '- 현재 반복하는 행동과 기존 대응 방식 5개 (각 18~34자)',
          '### Lifestyle Context',
          '- 자주 쓰는 도구·장소·취향·활동을 포함한 생활 맥락 5개 (각 20~38자)',
          '### Relationship Keyword',
          '- 기존 방해 요소, 공간, 자기관리, 제품 기대 역할의 관계 5개 (각 20~38자)',
          '',
          `누적 대화:\n${conversation.slice(-10000)}`,
          '',
          `현재 초안:\n${draft}`,
        ].join('\n'),
      },
    ],
    system:
      '당신은 사용자 대화를 제품 기획용 페르소나 카드 문구로 구조화하는 사용자 리서처입니다. 지정된 형식만 출력합니다.',
  })
}

function removePrematureStep3Transition(text: string) {
  if (!/STEP\s*3|다음\s*단계|넘어가/i.test(text)) {
    return text
  }

  return text
    .split('\n')
    .filter(
      (line) =>
        !/STEP\s*3|다음\s*단계|넘어가겠습니다|넘어갈지|진행할까요/i.test(line)
    )
    .join('\n')
    .trim()
}

function cleanSingleLineText(text: string) {
  return text.replace(/\s+/g, ' ').trim()
}

function getSurveyRequirements(project: Awaited<ReturnType<typeof getProjectForUser>>) {
  const requirements = project?.requirements

  if (!requirements || typeof requirements !== 'object') {
    return {}
  }

  const survey = (requirements as Record<string, unknown>).survey

  return survey && typeof survey === 'object'
    ? (survey as Record<string, unknown>)
    : (requirements as Record<string, unknown>)
}

function getRequirementString(
  requirements: Record<string, unknown>,
  key: string,
  fallback = '미정'
) {
  const value = requirements[key]
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

function formatRequirementList(
  requirements: Record<string, unknown>,
  key: string,
  otherKey?: string
) {
  const value = requirements[key]
  const otherValue = otherKey ? getRequirementString(requirements, otherKey, '') : ''
  const values = isStringArray(value)
    ? value
        .map((item) =>
          item === '기타 (직접 입력)' && otherValue ? otherValue : item
        )
        .filter((item) => item !== '기타 (직접 입력)')
    : []

  return values.length > 0 ? values.join(', ') : otherValue || '미정'
}

function formatBudgetValue(value: unknown) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return null
  }

  if (value >= 10000) {
    return '1억 원'
  }

  return `${value.toLocaleString('ko-KR')}만 원`
}

function formatBudgetRange(requirements: Record<string, unknown>) {
  const minBudget = formatBudgetValue(requirements.minBudget)
  const maxBudget = formatBudgetValue(requirements.maxBudget)

  if (minBudget && maxBudget) {
    return `${minBudget} ~ ${maxBudget}`
  }

  return minBudget || maxBudget || '미정'
}

function summarizeIdeaText(requirements: Record<string, unknown>) {
  const idea = cleanSingleLineText(getRequirementString(requirements, 'idea', ''))

  if (!idea) {
    return '아직 아이디어 텍스트가 충분히 입력되지 않았습니다.'
  }

  if (/개발이\s*목표입니다[.!]?$/.test(idea)) {
    return `${idea.replace(/[.!?]+$/, '')}.`
  }

  const conciseIdea = idea
    .slice(0, 150)
    .replace(/[.!?]+$/, '')
    .replace(
      /(?:을|를)?\s*(?:만들고|제작하고|개발하고)\s*싶(?:어|어요|습니다|다)?$/,
      ''
    )
    .replace(
      /(?:을|를)?\s*(?:만들|제작하|개발하)(?:려고|고자)\s*(?:해|해요|합니다|한다)?$/,
      ''
    )
    .replace(/(?:을|를)?\s*(?:만들|제작할|개발할)\s*예정(?:입니다)?$/, '')
    .trim()

  return /개발$/.test(conciseIdea)
    ? `${conciseIdea}이 목표입니다.`
    : `${conciseIdea} 개발이 목표입니다.`
}

function buildProjectStartSnapshot(
  project: Awaited<ReturnType<typeof getProjectForUser>>
) {
  const projectRequirements =
    project?.requirements && typeof project.requirements === 'object'
      ? (project.requirements as Record<string, unknown>)
      : {}
  const requirements = getSurveyRequirements(project)
  const generated =
    projectRequirements.generated &&
    typeof projectRequirements.generated === 'object'
      ? (projectRequirements.generated as Record<string, unknown>)
      : {}
  const generatedSummary = getRequirementString(generated, 'summary', '')
  const budgetRange = formatBudgetRange(requirements)
  const duration = getRequirementString(requirements, 'duration')
  const budgetAndDuration =
    budgetRange === '미정' && duration === '미정'
      ? '미정'
      : `${budgetRange} / ${duration}`

  return {
    budgetAndDuration,
    category: formatRequirementList(requirements, 'categories', 'otherCategory'),
    features: formatRequirementList(requirements, 'features', 'otherFeature'),
    goal: getRequirementString(requirements, 'goal'),
    ideaSummary: generatedSummary || summarizeIdeaText(requirements),
    size: getRequirementString(requirements, 'size'),
    title: project?.title || '새 프로젝트',
    usage: getRequirementString(requirements, 'usage'),
  }
}

function emptyStep1Progress(): Step1Progress {
  return {
    askedSlot: null,
    clarificationCounts: {
      color: 0,
      features: 0,
      material: 0,
      scene: 0,
      style: 0,
    },
    slots: {
      color: { status: 'missing', value: '' },
      features: { status: 'missing', value: '' },
      material: { status: 'missing', value: '' },
      scene: { status: 'missing', value: '' },
      style: { status: 'missing', value: '' },
    },
    confirmation: {
      index: 0,
      asked: false,
      reaskCounts: {
        goal: 0,
        category: 0,
        budgetDuration: 0,
        usage: 0,
      },
    },
  }
}

function normalizeStep1Slot(value: unknown) {
  if (!value || typeof value !== 'object') return null
  const source = value as Record<string, unknown>
  const status = source.status
  if (status !== 'missing' && status !== 'filled' && status !== 'undecided') {
    return null
  }
  return {
    status,
    value: typeof source.value === 'string' ? source.value.trim() : '',
  } as { status: Step1SlotStatus; value: string }
}

function normalizeStep1Progress(value: unknown): Step1Progress | null {
  if (!value || typeof value !== 'object') return null
  const source = value as Record<string, unknown>
  const rawSlots = source.slots
  if (!rawSlots || typeof rawSlots !== 'object') return null
  const slots = {} as Step1Progress['slots']

  for (const key of STEP1_SUPPLEMENT_SLOT_KEYS) {
    const slot = normalizeStep1Slot((rawSlots as Record<string, unknown>)[key])
    if (!slot) return null
    slots[key] = slot
  }

  const rawClarificationCounts = source.clarificationCounts
  const clarificationCounts = {} as Step1Progress['clarificationCounts']
  for (const key of STEP1_SUPPLEMENT_SLOT_KEYS) {
    const count =
      rawClarificationCounts && typeof rawClarificationCounts === 'object'
        ? (rawClarificationCounts as Record<string, unknown>)[key]
        : 0
    clarificationCounts[key] = typeof count === 'number' && count >= 0 ? count : 0
  }

  const askedSlot =
    source.askedSlot === null || source.askedSlot === undefined
      ? null
      : STEP1_SUPPLEMENT_SLOT_KEYS.includes(source.askedSlot as Step1SupplementSlotKey)
        ? (source.askedSlot as Step1SupplementSlotKey)
        : null

  const rawConfirmation = source.confirmation
  const confirmationSource =
    rawConfirmation && typeof rawConfirmation === 'object'
      ? (rawConfirmation as Record<string, unknown>)
      : {}
  const rawReaskCounts = confirmationSource.reaskCounts
  const reaskCounts = {} as Step1ConfirmationProgress['reaskCounts']
  for (const key of STEP1_CONFIRM_SLOT_KEYS) {
    const count =
      rawReaskCounts && typeof rawReaskCounts === 'object'
        ? (rawReaskCounts as Record<string, unknown>)[key]
        : 0
    reaskCounts[key] = typeof count === 'number' && count >= 0 ? count : 0
  }
  const rawIndex = confirmationSource.index
  const index =
    typeof rawIndex === 'number' && Number.isInteger(rawIndex)
      ? Math.max(0, Math.min(rawIndex, STEP1_CONFIRM_SLOT_KEYS.length))
      : 0
  const asked = confirmationSource.asked === true

  return { askedSlot, slots, clarificationCounts, confirmation: { index, asked, reaskCounts } }
}

function getExistingStep1Value(
  requirements: Record<string, unknown>,
  keys: string[]
) {
  for (const key of keys) {
    const value = requirements[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
    if (Array.isArray(value) && value.length > 0) {
      return value.filter((item): item is string => typeof item === 'string').join(', ')
    }
  }
  return ''
}

function initializeStep1Progress(
  project: Awaited<ReturnType<typeof getProjectForUser>>
): Step1Progress {
  const progress = emptyStep1Progress()
  const requirements = getSurveyRequirements(project)
  const allRequirements =
    project?.requirements && typeof project.requirements === 'object'
      ? (project.requirements as Record<string, unknown>)
      : {}
  const source = { ...allRequirements, ...requirements }
  const initialValues: Record<Step1SupplementSlotKey, string> = {
    color: getExistingStep1Value(source, ['color', 'colors', 'colour']),
    features: getExistingStep1Value(source, ['features', 'feature', 'mainFeatures', 'keyFeatures', 'otherFeature']),
    material: getExistingStep1Value(source, ['material', 'materials', 'mainMaterial']),
    scene: getExistingStep1Value(source, ['scene', 'environment', 'usageEnvironment', 'usageScene']),
    style: getExistingStep1Value(source, ['style', 'designStyle', 'form', 'shape']),
  }

  for (const key of STEP1_SUPPLEMENT_SLOT_KEYS) {
    if (initialValues[key]) {
      progress.slots[key] = { status: 'filled', value: initialValues[key] }
    }
  }

  return progress
}

function getStep1ProgressFromProject(
  project: Awaited<ReturnType<typeof getProjectForUser>>
) {
  const requirements =
    project?.requirements && typeof project.requirements === 'object'
      ? (project.requirements as Record<string, unknown>)
      : {}
  return normalizeStep1Progress(requirements[STEP1_PROGRESS_KEY])
}

function hasPersistedStep1ConfirmationProgress(
  project: Awaited<ReturnType<typeof getProjectForUser>>
) {
  const requirements =
    project?.requirements && typeof project.requirements === 'object'
      ? (project.requirements as Record<string, unknown>)
      : {}
  const rawProgress = requirements[STEP1_PROGRESS_KEY]
  return Boolean(
    rawProgress &&
      typeof rawProgress === 'object' &&
      'confirmation' in (rawProgress as Record<string, unknown>)
  )
}

async function saveStep1Progress({
  project,
  progress,
  supabase,
}: {
  project: Awaited<ReturnType<typeof getProjectForUser>>
  progress: Step1Progress
  supabase: Awaited<ReturnType<typeof createClient>>
}) {
  if (!project?.requirements || typeof project.requirements !== 'object') return
  const requirements = project.requirements as Record<string, unknown>
  const { error } = await supabase
    .from('projects')
    .update({ requirements: { ...requirements, [STEP1_PROGRESS_KEY]: progress } })
    .eq('id', project.id)

  if (error) throw error
}

function parseStep1Assessment(raw: string) {
  try {
    const parsed = JSON.parse(stripCodeFence(raw).trim()) as Record<string, unknown>
    const rawSlots = parsed.slots
    if (!rawSlots || typeof rawSlots !== 'object') {
      console.error('[STEP1-PROGRESS] AI assessment JSON missing slots object')
      return null
    }
    const result = {} as Step1Progress['slots']
    for (const key of STEP1_SUPPLEMENT_SLOT_KEYS) {
      const slot = normalizeStep1Slot((rawSlots as Record<string, unknown>)[key])
      if (!slot) {
        console.error(`[STEP1-PROGRESS] AI assessment JSON missing slot: ${key}`)
        return null
      }
      result[key] = slot
    }
    const nextSlot =
      parsed.nextSlot === null || parsed.nextSlot === undefined
        ? null
        : STEP1_SUPPLEMENT_SLOT_KEYS.includes(parsed.nextSlot as Step1SupplementSlotKey)
          ? (parsed.nextSlot as Step1SupplementSlotKey)
          : null
    const askedSlotAnswered = parsed.askedSlotAnswered === true
    const userAskedForHelp = parsed.userAskedForHelp === true
    return { slots: result, nextSlot, askedSlotAnswered, userAskedForHelp }
  } catch {
    console.error('[STEP1-PROGRESS] AI assessment JSON parse failed')
    return null
  }
}

async function assessStep1Progress({
  apiKey,
  requirements,
  progress,
  userMessage,
}: {
  apiKey: string
  requirements: Record<string, unknown>
  progress: Step1Progress
  userMessage: string
}) {
  if (!apiKey) return null
  const raw = await generateGeminiText({
    apiKey,
    messages: [{
      role: 'user',
      content: [
        'STEP 1 보충 질문 상태를 평가하세요. JSON만 출력하세요.',
        '항목은 features(주요 기능·특징), style(형태/디자인 스타일), material(주요 재질), scene(사용 환경·상황), color(색상)입니다.',
        '현재 사용자 답변과 프로젝트 requirements의 설문 값만 근거로 사용하세요. 제품명이나 카테고리의 단어만으로 항목을 filled로 판단하지 마세요.',
        '현재 사용자 답변에 직접 근거가 있으면 filled와 값을 기록하세요. 이미 filled인 항목도 이번 답변에서 더 구체적인 내용이 나오면 갱신하세요.',
        '사용자가 모르겠다고 하거나 상관없다고 하면 undecided와 "미정"을 기록하세요.',
        '답변이 모호하면 undecided로 기록하세요. 사용자가 항목에 답하지 않고 다른 이야기만 하면 그 항목을 닫지 마세요.',
        '사용자가 어떤 항목에 대해 도움을 요청하면 userAskedForHelp를 true로 하고 그 항목은 닫지 마세요.',
        'askedSlotAnswered는 현재 askedSlot에 사용자가 답했거나 명시적으로 미정이라고 한 경우에만 true입니다.',
        'nextSlot은 아직 missing인 항목 중 다음에 물을 항목 하나를 대화 흐름에 맞게 선택하세요. 모두 filled 또는 undecided면 null입니다.',
        `현재 상태: ${JSON.stringify(progress.slots)}`,
        `현재 질문 항목: ${progress.askedSlot ?? '없음'}`,
        `프로젝트 requirements(설문): ${JSON.stringify(requirements)}`,
        `이번 사용자 답변: ${userMessage}`,
        '형식: {"slots":{"features":{"status":"missing|filled|undecided","value":""},"style":...,"material":...,"scene":...,"color":...},"nextSlot":"features|style|material|scene|color|null","askedSlotAnswered":true,"userAskedForHelp":false}',
      ].join('\n'),
    }],
    system: '제품 요구사항 슬롯을 의미적으로 분류하는 내부 평가기입니다. 지정된 JSON만 반환하세요.',
  })
  return parseStep1Assessment(raw)
}

type Step1ConfirmationAssessment = {
  needsClarification: boolean
  valueChanged: boolean
  changeConfidence: 'clear' | 'ambiguous' | 'none'
  newValue: string | null
  newMinBudget: number | null
  newMaxBudget: number | null
  newDuration: string | null
}

function parseStep1ConfirmationAssessment(raw: string) {
  try {
    const parsed = JSON.parse(stripCodeFence(raw).trim()) as Record<string, unknown>
    const confidence = parsed.changeConfidence
    const changeConfidence =
      confidence === 'clear' || confidence === 'ambiguous' || confidence === 'none'
        ? confidence
        : 'none'
    const numberOrNull = (value: unknown) =>
      typeof value === 'number' && Number.isFinite(value) ? value : null
    const stringOrNull = (value: unknown) =>
      typeof value === 'string' && value.trim() ? value.trim() : null

    return {
      needsClarification: parsed.needsClarification === true,
      valueChanged: parsed.valueChanged === true,
      changeConfidence,
      newValue: stringOrNull(parsed.newValue),
      newMinBudget: numberOrNull(parsed.newMinBudget),
      newMaxBudget: numberOrNull(parsed.newMaxBudget),
      newDuration: stringOrNull(parsed.newDuration),
    } satisfies Step1ConfirmationAssessment
  } catch {
    console.error('[STEP1-CONFIRM] AI assessment JSON parse failed')
    return null
  }
}

async function assessStep1ConfirmationReply({
  apiKey,
  slot,
  currentValue,
  userMessage,
}: {
  apiKey: string
  slot: Step1ConfirmationSlotKey
  currentValue: string
  userMessage: string
}) {
  if (!apiKey) return null

  const raw = await generateGeminiText({
    apiKey,
    messages: [{
      role: 'user',
      content: [
        'STEP 1 프로젝트 조건 확인 답변을 JSON으로 판단하세요.',
        '사용자는 확인 질문에 답했을 수도 있고, 질문을 되묻거나 도움을 요청했을 수도 있습니다.',
        'needsClarification은 사용자가 현재 항목을 이해하지 못해 설명을 먼저 요청했거나, 확인 질문 자체를 되묻는 경우에만 true입니다.',
        '그 외에는 valueChanged가 false여도 needsClarification은 false로 두고 답변 완료로 처리합니다.',
        '사용자가 값을 바꿨다고 명확히 말한 경우에만 valueChanged를 true로 두고 changeConfidence를 clear로 설정하세요.',
        '추측, 희망, 검토 중인 생각, 가능성 표현은 명확한 변경값으로 처리하지 마세요. 예: "좀 더 늘릴까 생각 중".',
        '명확한 변경값을 추출할 수 없거나 애매하면 valueChanged는 false, changeConfidence는 ambiguous 또는 none으로 설정하세요.',
        'goal/category/usage는 newValue에 새 값을 넣으세요.',
        'budgetDuration은 명확할 때만 newMinBudget/newMaxBudget를 만 원 단위 숫자로, newDuration을 기간 문자열로 넣으세요. 불명확한 값은 null로 두세요.',
        `현재 확인 항목: ${slot}`,
        `현재 저장된 값: ${currentValue}`,
        `사용자 답변: ${userMessage}`,
        '형식: {"needsClarification":false,"valueChanged":false,"changeConfidence":"none|ambiguous|clear","newValue":null,"newMinBudget":null,"newMaxBudget":null,"newDuration":null}',
      ].join('\n'),
    }],
    system: 'STEP 1 확인 답변을 분류하는 내부 평가기입니다. 지정된 JSON만 반환하세요.',
  })

  return parseStep1ConfirmationAssessment(raw)
}

function getStep1ConfirmationSlotValue(
  project: Awaited<ReturnType<typeof getProjectForUser>>,
  slot: Step1ConfirmationSlotKey
) {
  const snapshot = buildProjectStartSnapshot(project)
  return slot === 'goal'
    ? snapshot.goal
    : slot === 'category'
      ? snapshot.category
      : slot === 'budgetDuration'
        ? snapshot.budgetAndDuration
        : snapshot.usage
}

async function applyStep1ConfirmationValueChange({
  project,
  slot,
  assessment,
  supabase,
}: {
  project: Awaited<ReturnType<typeof getProjectForUser>>
  slot: Step1ConfirmationSlotKey
  assessment: Step1ConfirmationAssessment
  supabase: Awaited<ReturnType<typeof createClient>>
}) {
  if (!project?.requirements || typeof project.requirements !== 'object') return null
  if (!assessment.valueChanged || assessment.changeConfidence !== 'clear') return null

  const requirements = project.requirements as Record<string, unknown>
  const currentSurvey =
    requirements.survey && typeof requirements.survey === 'object'
      ? (requirements.survey as Record<string, unknown>)
      : null
  const target = currentSurvey ? { ...currentSurvey } : { ...requirements }
  const previousValue = getStep1ConfirmationSlotValue(project, slot)
  let nextValue = ''
  let changedLabel = ''

  if ((slot === 'goal' || slot === 'category' || slot === 'usage') && assessment.newValue) {
    nextValue = assessment.newValue
    changedLabel =
      slot === 'goal'
        ? '목표'
        : slot === 'category'
          ? '제품 카테고리'
          : '최종 활용 목적'
    if (slot === 'goal') target.goal = nextValue
    if (slot === 'usage') target.usage = nextValue
    if (slot === 'category') {
      target.categories = [nextValue]
      target.otherCategory = ''
    }
  } else if (slot === 'budgetDuration') {
    if (assessment.newMinBudget !== null) target.minBudget = assessment.newMinBudget
    if (assessment.newMaxBudget !== null) target.maxBudget = assessment.newMaxBudget
    if (assessment.newDuration) target.duration = assessment.newDuration
    nextValue = [
      assessment.newMinBudget !== null ? `${assessment.newMinBudget}만 원` : '',
      assessment.newMaxBudget !== null ? `${assessment.newMaxBudget}만 원` : '',
      assessment.newDuration ?? '',
    ].filter(Boolean).join(' / ')
    if (!nextValue) return null
    changedLabel =
      assessment.newDuration &&
      assessment.newMinBudget === null &&
      assessment.newMaxBudget === null
        ? '기간'
        : assessment.newDuration &&
            (assessment.newMinBudget !== null || assessment.newMaxBudget !== null)
          ? '예산과 기간'
          : '예산'
  } else {
    return null
  }

  const historyValue = Array.isArray(requirements[STEP1_CONFIRMATION_HISTORY_KEY])
    ? requirements[STEP1_CONFIRMATION_HISTORY_KEY]
    : []
  const history = [
    ...historyValue,
    {
      slot,
      previousValue,
      newValue: nextValue,
      changedAt: new Date().toISOString(),
    },
  ]
  const updatedRequirements = {
    ...requirements,
    ...(currentSurvey ? { survey: target } : target),
    [STEP1_CONFIRMATION_HISTORY_KEY]: history,
  }
  const { error } = await supabase
    .from('projects')
    .update({ requirements: updatedRequirements })
    .eq('id', project.id)
  if (error) throw error

  project.requirements = updatedRequirements
  return { previousValue, newValue: nextValue, changedLabel }
}

function mergeStep1Assessment(
  progress: Step1Progress,
  assessment: Step1Assessment | null
) {
  const next: Step1Progress = {
    askedSlot: null,
    slots: { ...progress.slots },
    clarificationCounts: { ...progress.clarificationCounts },
    confirmation: {
      index: progress.confirmation.index,
      asked: progress.confirmation.asked,
      reaskCounts: { ...progress.confirmation.reaskCounts },
    },
  }

  for (const key of STEP1_SUPPLEMENT_SLOT_KEYS) {
    const assessed = assessment?.slots[key]
    if (assessed?.status === 'filled' && assessed.value) {
      next.slots[key] = assessed
    } else if (assessed?.status === 'undecided') {
      next.slots[key] = { status: 'undecided', value: '미정' }
    }
  }

  if (progress.askedSlot && assessment) {
    if (assessment.userAskedForHelp || !assessment.askedSlotAnswered) {
      next.clarificationCounts[progress.askedSlot] += 1
      if (next.clarificationCounts[progress.askedSlot] >= STEP1_MAX_CLARIFICATIONS) {
        next.slots[progress.askedSlot] = { status: 'undecided', value: '미정' }
      }
    } else {
      next.clarificationCounts[progress.askedSlot] = 0
    }
  }

  return next
}

function getNextStep1SupplementSlot(progress: Step1Progress) {
  return (
    STEP1_SUPPLEMENT_SLOT_KEYS.find(
      (key) => progress.slots[key].status === 'missing'
    ) ?? null
  )
}

function buildStep1ProjectSummary(
  project: Awaited<ReturnType<typeof getProjectForUser>>,
  progress: Step1Progress
) {
  const snapshot = buildProjectStartSnapshot(project)
  const answers = progress.slots

  return [
    `현재까지 논의된 내용을 바탕으로 '${snapshot.title}'을 요약해 드릴게요.`,
    `**프로젝트명:** ${snapshot.title}`,
    `**프로젝트 목표:** ${snapshot.goal}`,
    `**제품 카테고리:** ${snapshot.category}`,
    `**예산/기간 범위:** ${snapshot.budgetAndDuration}`,
    `**예상 크기:** ${snapshot.size}`,
    `**주요 기능/특징:** ${snapshot.features}`,
    `**주요 재질:** ${answers.material.value || '미정'}`,
    `**사용 장면:** ${answers.scene.value || '미정'}`,
    `**최종 활용 목적:** ${snapshot.usage}`,
    `**색상:** ${answers.color.value || '미정'}`,
    '이 내용으로 프로젝트를 본격적으로 시작해도 괜찮을까요?',
  ].join('\n')
}

function isStep1ProjectSummaryContent(content: string) {
  return (
    /현재까지\s*논의된\s*내용을\s*바탕으로[\s\S]*요약해\s*드릴게요/i.test(
      content
    ) &&
    /프로젝트를\s*본격적으로\s*시작해도\s*괜찮을까요/i.test(content)
  )
}

function getStep1ConfirmationAnswerCount(
  messages: ChatMessageRecord[],
  summaryIndex: number
) {
  let answeredCount = 0
  let awaitingAnswer = false

  for (const [index, message] of messages.entries()) {
    if (index <= summaryIndex) continue

    if (
      message.role === 'assistant' &&
      /주된\s*목표|제품\s*카테고리|예산|기간|최종\s*활용\s*목적/i.test(message.content) &&
      /맞을까요|맞나요|적절할까요|이대로\s*진행할까요/i.test(message.content)
    ) {
      awaitingAnswer = true
      continue
    }

    if (message.role === 'user' && awaitingAnswer) {
      answeredCount += 1
      awaitingAnswer = false
    }
  }

  return Math.min(answeredCount, STEP1_CONFIRM_SLOTS.length)
}

function buildStep1FallbackQuestion({
  project,
  slot,
  confirmation = false,
  reaction = '',
}: {
  project: Awaited<ReturnType<typeof getProjectForUser>>
  slot: string
  confirmation?: boolean
  reaction?: string
}) {
  const snapshot = buildProjectStartSnapshot(project)

  if (confirmation) {
    const [budgetRange = '미정', duration = '미정'] = snapshot.budgetAndDuration
      .split('/')
      .map((value) => value.trim())
    const [minimumBudget = budgetRange, maximumBudget = minimumBudget] = budgetRange
      .split('~')
      .map((value) => value.trim())
    const normalizedDuration = normalizeStep1SurveyDisplayValue(duration)
    const question =
      slot === '프로젝트의 주된 목표'
        ? `이 프로젝트는 '${snapshot.goal}'${chooseKoreanParticle(snapshot.goal, '을', '를')} 목표로 하고 있는데, 이 방향이 맞을까요?`
        : slot === '제품 카테고리'
          ? `제품 카테고리는 '${snapshot.category}'${chooseKoreanParticle(snapshot.category, '으로', '로')} 정리되어 있는데, 이대로 진행할까요?`
          : slot === '예산·기간 범위'
            ? `예산은 ${minimumBudget}에서 ${maximumBudget}, 기간은 ${normalizedDuration}${chooseKoreanParticle(normalizedDuration, '으로', '로')} 설정되어 있는데, 이 범위가 프로젝트 진행에 적절할까요?`
            : `이 프로젝트의 최종 활용 목적은 '${snapshot.usage}'${chooseKoreanParticle(snapshot.usage, '으로', '로')} 정리되어 있는데, 이 내용도 맞을까요?`
    return reaction ? `${reaction}\n${question}` : question
  }

  return `말씀해주신 내용을 바탕으로 더 구체화해볼게요. 제품의 ${slot}에 대해 생각하고 있는 점이 있으신가요?`
}

function normalizeStep1SurveyDisplayValue(value: string) {
  return value.trim() === '1년 +' ? '1년 이상' : value.trim()
}

function buildStep1ConfirmationReaction({
  slot,
  changedValue,
  changedLabel,
  confirmedCount,
}: {
  slot: Step1ConfirmationSlotKey
  changedValue?: string | null
  changedLabel?: string | null
  confirmedCount: number
}) {
  const label =
    slot === 'goal'
      ? '목표'
      : slot === 'category'
        ? '제품 카테고리'
        : slot === 'budgetDuration'
          ? '예산과 기간'
          : '최종 활용 목적'

  if (changedValue) {
    const changedSubject = changedLabel || label
    return `네, ${changedSubject}${chooseKoreanParticle(changedSubject, '은', '는')} '${changedValue}'로 조정하겠습니다.`
  }

  return `네, ${label}${confirmedCount >= 2 ? '도' : ''} 확인되었습니다.`
}

function getLastHangulJongseong(value: string) {
  const normalized = value.trim()
  for (let index = normalized.length - 1; index >= 0; index -= 1) {
    const code = normalized.codePointAt(index)
    if (code === undefined) continue
    if (code >= 0xac00 && code <= 0xd7a3) {
      return (code - 0xac00) % 28
    }
  }
  return 0
}

function chooseKoreanParticle(value: string, withBatchim: string, withoutBatchim: string) {
  const jongseong = getLastHangulJongseong(value)
  if (withBatchim === '으로' && jongseong === 8) return withoutBatchim
  return jongseong > 0 ? withBatchim : withoutBatchim
}

function buildStep1FinalSummary(
  project: Awaited<ReturnType<typeof getProjectForUser>>
) {
  const snapshot = buildProjectStartSnapshot(project)
  const [budget = '미정', duration = '미정'] = snapshot.budgetAndDuration
    .split('/')
    .map((value) => value.trim())

  return [
    `현재까지 논의된 내용을 바탕으로 '${snapshot.title}'은 ${snapshot.goal}을 주된 목표로 하며, '${snapshot.category}' 카테고리에서 ${budget} 예산과 ${duration}의 기간 내에 개발될 예정입니다. 최종적으로는 이 프로젝트를 통해 ${snapshot.usage}을 목표로 하고 있습니다.`,
    '전체 개발 프로세스를 함께 확인해볼까요?',
    '<<AIDEE_STEP_1_COMPLETE>>',
  ].join('\n')
}

function buildProcessConfirmationResponse() {
  return [
    '저희 Aidee 팀과 함께 아이디어를 구체화하는 전체 프로세스는 다음 7단계로 진행됩니다.',
    '1. 제품 개발 조건 정리: 제품의 목표, 카테고리, 예산, 기간 등 기본적인 개발 조건을 명확히 설정합니다.',
    '2. AI 에이전트 생성: 프로젝트에 필요한 전문 AI 에이전트를 구성합니다.',
    '3. 제품 사용자 정의: 제품을 사용할 핵심 사용자(페르소나)를 구체적으로 정의합니다.',
    '4. 개발 방향 도출: 시장 분석을 통해 제품의 개발 및 포지셔닝 방향을 수립합니다.',
    '5. 디자인 컨셉 도출: 제품의 스타일과 외형 디자인 컨셉을 구체화하고 시안을 만듭니다.',
    '6. 구조 설계 방향 도출: 디자인 시안을 바탕으로 제품의 구조와 제작 방식을 계획합니다.',
    '7. 시장 진입 전략 도출: 실제 시장 출시를 위한 진입 전략과 실행 계획을 수립합니다.',
    '',
    '다음으로 STEP 2. AI 에이전트 생성 단계로 넘어가겠습니다. 이 단계에서는 함께할 AI 에이전트를 직접 커스터마이징할 예정입니다. 진행할까요?',
  ].join('\n')
}

function buildProjectCardResponse({
  project,
  referenceImages,
}: {
  project: Awaited<ReturnType<typeof getProjectForUser>>
  referenceImages: Awaited<ReturnType<typeof getReferenceImages>>
}) {
  const snapshot = buildProjectStartSnapshot(project)
  const referenceSummary =
    referenceImages.length > 0
      ? `${referenceImages.length}개 참고 이미지가 업로드되어 있습니다.`
      : '업로드된 참고 이미지는 아직 없습니다.'
  const referenceGuidelines = buildReferenceGuidelineBlock(referenceImages)
  const referenceDirection =
    referenceImages.length > 0
      ? [
          '레퍼런스 이미지에서 우선 참고해야 할 방향',
          '',
          referenceGuidelines,
          '',
          '이 요약이 현재 아이디어를 잘 담고 있나요?',
          '혹시 예상하고 있는 제품의 구체적인 모습이나 보충하고 싶은 설명이 있다면 자유롭게 말씀해주세요.',
        ]
      : [
          '레퍼런스 이미지에서 우선 참고해야 할 방향',
          '',
          '아직 업로드된 참고 이미지가 없어, 설문 내용을 기준으로 방향을 잡겠습니다.',
          '',
          '예상하고 있는 제품의 구체적인 모습이나 보충하고 싶은 설명이 있다면 자유롭게 말씀해주세요.',
        ]

  return [
    '새로운 프로젝트가 생성되었습니다.',
    "'Aidee' 팀이 사용자의 아이디어를 구체화할 수 있도록, 현재까지 저장된 내용을 먼저 요약해 드릴게요.",
    '',
    '<<AIDEE_PROJECT_DIRECTION>>',
    'Project Direction',
    '',
    '**프로젝트명**',
    snapshot.title,
    '',
    '**프로젝트 목표**',
    snapshot.goal,
    '',
    '**제품 카테고리**',
    snapshot.category,
    '',
    '**예산/기간 범위**',
    snapshot.budgetAndDuration,
    '',
    '**예상 크기**',
    snapshot.size,
    '',
    '**주요 기능**',
    snapshot.features,
    '',
    '**최종 활용 목적**',
    snapshot.usage,
    '',
    '**아이디어 정리**',
    snapshot.ideaSummary,
    '',
    '**참고 자료**',
    referenceSummary,
    '<</AIDEE_PROJECT_DIRECTION>>',
    '',
    ...referenceDirection,
  ].join('\n')
}

function buildStyleImagePrompt({
  conversation,
  projectTitle,
  requirements,
}: {
  conversation: string
  projectTitle: string
  requirements: unknown
}) {
  return [
    'Create one standalone style reference image for product design concept selection.',
    `Project title: ${projectTitle}`,
    '',
    'Project requirements:',
    JSON.stringify(requirements ?? {}, null, 2),
    '',
    'Conversation:',
    conversation,
    '',
    'Image direction:',
    '- one complete product/style concept image',
    '- no collage, no grid, no text overlay, no UI, no watermark',
    '- high quality product design style reference',
  ].join('\n')
}

function buildDesignImagePrompt({
  conversation,
  projectTitle,
  requirements,
  userRequest,
}: {
  conversation: string
  projectTitle: string
  requirements: unknown
  userRequest: string
}) {
  return [
    'Create a polished product design visualization of the actual product in this project.',
    'The output must be a newly designed product image, not a moodboard photo, stock photo, environment image, or generic object.',
    'Show one complete product per image. The product itself must be the clear subject and must be visibly usable as the project product.',
    `Project title: ${projectTitle}`,
    `User request: ${userRequest}`,
    '',
    'Project requirements:',
    JSON.stringify(requirements ?? {}, null, 2),
    '',
    'Conversation:',
    conversation,
    '',
    'Output direction:',
    '- realistic 2D product concept/render image',
    '- use the reference moodboard only for atmosphere, palette, materials, lighting, and visual language',
    '- do not reproduce the moodboard scene or replace the product with scenery, furniture, people, or abstract textures',
    '- do not create a collage, moodboard, lifestyle photo, or collection of unrelated objects',
    '- no text overlay, no UI, no watermark',
  ].join('\n')
}

function buildModelingImagePrompt({
  conversation,
  projectTitle,
  requirements,
  userRequest,
}: {
  conversation: string
  projectTitle: string
  requirements: unknown
  userRequest: string
}) {
  return [
    'Create two standalone 3D product concept images based on the selected 2D design.',
    'The output must show the actual project product in both images, never a moodboard, stock photo, environment image, or unrelated object.',
    'Keep the selected 2D form and proportions unchanged. Apply only two different CMF directions from the conversation.',
    `Project title: ${projectTitle}`,
    `User request: ${userRequest}`,
    '',
    'Project requirements:',
    JSON.stringify(requirements ?? {}, null, 2),
    '',
    'Conversation and confirmed 2D design / CMF decisions:',
    conversation,
    '',
    'Output direction:',
    '- realistic product modeling visualization, one complete product per image',
    '- show the same selected form in both images; vary only color, material, and finish',
    '- no text overlay, no UI, no watermark, no collage, no grid',
  ].join('\n')
}

async function getMoodboardReferenceImages({
  supabase,
  projectId,
  fallbackMessages,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>
  projectId: string
  fallbackMessages: Array<{
    generatedImageBlock?: {
      images: string[]
      purpose?: string
    } | null
  }>
}) {
  const { data: boardRows, error } = await supabase
    .from('moodboard_images')
    .select('url, thumb_url')
    .eq('project_id', projectId)
    .eq('phase', 'board')
    .order('created_at', { ascending: true })
    .limit(4)

  if (error) {
    console.error('[STEP 5 DESIGN DIAG] 무드보드 참조 이미지 조회 실패:', error)
  }

  const urls = (boardRows ?? [])
    .map((row) => row.url || row.thumb_url)
    .filter((url): url is string => typeof url === 'string' && url.length > 0)

  const fallbackUrls = fallbackMessages
    .filter((message) => message.generatedImageBlock?.purpose === 'moodboard_candidate')
    .flatMap((message) => message.generatedImageBlock?.images ?? [])
    .slice(0, 4)

  const sourceUrls = urls.length > 0 ? urls : fallbackUrls

  const results = await Promise.allSettled(
    sourceUrls.map(async (url) => {
      if (url.startsWith('data:image/')) return url

      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const contentType =
        response.headers.get('content-type')?.split(';')[0] || 'image/jpeg'
      const data = Buffer.from(await response.arrayBuffer()).toString('base64')
      return `data:${contentType};base64,${data}`
    })
  )

  return results.flatMap((result) =>
    result.status === 'fulfilled' ? [result.value] : []
  )
}

function getSelectedDesignReferenceImage(
  messages: Array<{
    content: string
    generatedImageBlock?: {
      images: string[]
      purpose?: string
    } | null
    role: string
  }>
) {
  const confirmation = [...messages]
    .reverse()
    .find(
      (message) =>
        (message.role === 'user' &&
          /\d+\s*번\s*(?:2D\s*)?(?:렌더링\s*)?시안을\s*최종\s*확정/i.test(
            message.content
          )) ||
        (message.role === 'system' &&
          ['design', 'modeling'].includes(
            getArtifactEvent(message.content)?.artifactType ?? ''
          ))
    )
  const event = confirmation ? getArtifactEvent(confirmation.content) : null
  const match = confirmation?.content.match(/(\d+)\s*번/)
  const selectedIndex =
    event?.artifactSelectedIndex ?? (match ? Number(match[1]) - 1 : 0)
  const designMessage = [...messages]
    .reverse()
    .find(
      (message) =>
        message.generatedImageBlock?.purpose === 'design' &&
        message.generatedImageBlock.images.length > selectedIndex
    )

  return designMessage?.generatedImageBlock?.images[selectedIndex] ?? null
}

function buildPersonaImagePrompt({
  personaCard,
  projectTitle,
}: {
  personaCard: NonNullable<
    Awaited<ReturnType<typeof getProjectMessages>>[number]['personaCardBlock']
  >
  projectTitle: string
}) {
  const sectionText = [
    `Demographic: ${personaCard.demographicInfo.slice(0, 5).join(', ')}`,
    `Story: ${personaCard.personaStory.slice(0, 1).join(' ')}`,
    `Problem needs: ${personaCard.problemNeeds.slice(0, 5).join(', ')}`,
    `Current behavior: ${personaCard.currentBehavior.slice(0, 5).join(', ')}`,
    `Lifestyle: ${personaCard.lifestyleContext.slice(0, 5).join(', ')}`,
    `Relationship: ${personaCard.relationshipKeyword.slice(0, 5).join(', ')}`,
  ].join('\n')

  return [
    'Create one polished persona portrait image for a product planning persona card.',
    `Project title: ${projectTitle}`,
    '',
    'Persona summary:',
    sectionText,
    '',
    'Image direction:',
    '- one realistic editorial portrait or lifestyle portrait of the target user',
    '- clean modern lighting, high quality, suitable for a professional design document',
    '- show the person in a relevant daily environment when useful',
    '- no text overlay, no UI, no watermark, no collage, no grid',
  ].join('\n')
}

async function generateRfp({
  apiKey,
  messages,
  project,
  referenceImages,
}: {
  apiKey: string
  messages: GeminiMessage[]
  project: NonNullable<Awaited<ReturnType<typeof getProjectForUser>>>
  referenceImages: Awaited<ReturnType<typeof getReferenceImages>>
}) {
  const rfpJsonText = await generateGeminiText({
    apiKey,
    messages: [
      {
        content: buildRfpPrompt({ messages, project, referenceImages }),
        role: 'user',
      },
    ],
    system: 'You return only valid JSON.',
  })
  const parsed = parseRfpDocument(JSON.parse(stripCodeFence(rfpJsonText)))

  if (!parsed) {
    throw new Error('Gemini returned invalid project plan JSON')
  }

  return appendRfpJsonBlock({
    rfp: parsed,
    text: '프로젝트 기획안 생성이 완료되었습니다. 프로젝트 대화 프로세스가 종료되었습니다.',
  })
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ChatRequestBody
    const projectId = typeof body.projectId === 'string' ? body.projectId : ''

    const cardDebugRequestNumber = projectId
      ? (cardDebugRequestCounts.get(projectId) ?? 0) + 1
      : 0
    if (projectId) {
      cardDebugRequestCounts.set(projectId, cardDebugRequestNumber)
    }

    // TEMP CARD DEBUG: 프로젝트별 /api/chat 호출 순번입니다.
    console.log('[CARD-DEBUG] /api/chat request', {
      projectId: projectId || null,
      requestNumber: cardDebugRequestNumber,
      time: new Date().toISOString(),
    })

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const project = await getProjectForUser({
      projectId,
      supabase,
      userId: user.id,
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const [referenceImages, existingMessages] = await Promise.all([
      getReferenceImages({ projectId, supabase }),
      getProjectMessages({ projectId, supabase }),
    ])
    const requestedStageKey = normalizeStage(body.currentStageKey)
    const requestedAction = normalizeChatAction(body.action)
    const artifactType = normalizeArtifactType(body.artifactType)
    const artifactMessageId =
      typeof body.artifactMessageId === 'string' ? body.artifactMessageId : ''
    const artifactSelectedIndex =
      typeof body.artifactSelectedIndex === 'number'
        ? body.artifactSelectedIndex
        : undefined
    const activeExpert = normalizeExpert(body.activeExpert)
    const userMessage = typeof body.message === 'string' ? body.message.trim() : ''
    const styleKeywordSelections = normalizeStyleKeywordSelections(
      body.styleKeywordSelections
    )
    const styleKeywordSelectionMessage = styleKeywordSelections
      ? buildStyleKeywordSelectionMessage(styleKeywordSelections)
      : ''
    const isForcedGeneration = Boolean(body.forceImageGeneration)
    const hasAssistantMessage = existingMessages.some(
      (message) => message.role === 'assistant'
    )
    const isInitialEntry =
      !hasAssistantMessage && !userMessage && !styleKeywordSelectionMessage

    // TEMP CARD DEBUG: 카드 분기 판정에 사용되는 실제 값입니다.
    console.log('[CARD-DEBUG] initial-entry check', {
      projectId,
      bodyMessage: typeof body.message === 'string' ? body.message : null,
      styleKeywordSelectionsPresent: Boolean(styleKeywordSelections),
      existingMessageRoles: existingMessages.map((message) => message.role),
      hasAssistantMessage,
      userMessage,
      styleKeywordSelectionMessage,
      isInitialEntry,
    })
    const step4ResearchFollowupInstruction =
      requestedStageKey === 'step_4_direction' &&
      userMessage &&
      !isDirectionResearchRequest(userMessage) &&
      hasPendingStep4ResearchQuestion(existingMessages)
        ? [
            '사용자가 방금 진행한 리서치 질문에 답했습니다.',
            '답변을 짧게 인정한 뒤, 다음 리서치를 진행할지 묻는 문장만 이어서 출력하세요.',
            '아직 진행하지 않은 리서치가 있을 때만 <<AIDEE_DIRECTION_WIDGETS>>를 출력하세요.',
            '세 가지 리서치를 모두 진행했다면 위젯을 출력하지 마세요.',
            '시각화 내용과 이전 리서치 결과를 다시 설명하지 마세요.',
          ].join('\n')
        : ''
    const directionResearchVisualizationInstruction =
      requestedAction === 'visualize_artifact' &&
      (artifactType === 'direction_market_size' ||
        artifactType === 'direction_consumption_keywords' ||
        artifactType === 'direction_brand_positioning')
        ? [
            '시각화는 시스템이 처리했습니다.',
            '시각화 내용, 이전 리서치 결과, 확정 안내를 설명하지 마세요.',
            `방금 확정한 ${
              artifactType === 'direction_market_size'
                ? '시장 규모'
                : artifactType === 'direction_consumption_keywords'
                  ? '소비 트렌드'
                  : '경쟁사'
            } 리서치 내용을 바탕으로 사용자에게 선택지가 있는 질문을 정확히 하나만 하세요.`,
            '이번 응답에서는 이 리서치에 대한 질문과 선택지만 출력하세요. 다음 리서치 진행 여부를 묻거나 위젯을 출력하지 마세요.',
            '위젯 마커의 내용 자체나 내부 처리 방식을 사용자에게 설명하지 마세요.',
          ].join('\n')
        : ''
    const messageForModel = isInitialEntry
        ? buildInitialUserPrompt(project)
      : step4ResearchFollowupInstruction ||
        userMessage ||
        styleKeywordSelectionMessage ||
        (requestedAction === 'confirm_step_2_team'
          ? 'STEP 2 팀 구성 완료 확인'
          : isForcedGeneration
            ? '시각화 생성 요청'
            : requestedAction === 'visualize_artifact' && artifactType === 'design'
              ? '2D 렌더링 시안이 확정되고 시각화되었습니다. 이제 CMF 대화를 시작하세요.'
              : requestedAction === 'visualize_artifact' && artifactType === 'form_design'
                ? 'Form Design 시각화가 완료되었습니다. 5-0-5 비례 대화를 이어가세요.'
              : requestedAction === 'visualize_artifact'
                ? directionResearchVisualizationInstruction
                  ? directionResearchVisualizationInstruction
                  : artifactType === 'keyword_relationship'
                  ? '확정된 내용을 시각화한 뒤 다음 단계 안내를 이어가세요.'
                  : artifactType === 'problem_statements' ||
                      artifactType === 'keyword_experience'
                    ? '시각화는 시스템이 처리했습니다. 시각화 내용, 이전 결과, 확정 안내를 설명하지 마세요. [STEP 3 진행 지시]에 따라 지금 구간의 첫 질문 하나만 하세요.'
                    : '확정된 내용을 시각화한 뒤 다음 단계 안내를 이어가세요.'
                : requestedAction === 'confirm_moodboard' ||
                    (requestedAction === 'confirm_artifact' &&
                      artifactType === 'moodboard')
                  ? '무드보드가 확정되었습니다. 확정된 무드보드와 STEP 5의 앞선 대화 내용을 바탕으로 2D 렌더링 시안을 생성하세요.'
                  : '')

    let hasCompletedMoodboard = false

    if (
      requestedStageKey === 'step_5_style' ||
      requestedAction === 'confirm_moodboard'
    ) {
      const { data: moodboardRows, error: moodboardStateError } = await supabase
        .from('moodboard_images')
        .select('id')
        .eq('project_id', projectId)
        .eq('phase', 'board')
        .limit(1)

      if (moodboardStateError) {
        console.error('[STEP 5] 무드보드 상태 조회 실패:', moodboardStateError)
      } else {
        hasCompletedMoodboard = (moodboardRows?.length ?? 0) > 0
      }
    }

    if (
      requestedAction === 'confirm_artifact' &&
      artifactType &&
      artifactMessageId
    ) {
      const nextSeqOrder =
        existingMessages.reduce(
          (maxSeq, message) => Math.max(maxSeq, message.seq_order),
          -1
        ) + 1
      const artifactEvent = await insertProjectMessage({
        action: 'confirm_artifact',
        content: buildArtifactEventContent({
          artifactMessageId,
          artifactSelectedIndex,
          artifactType,
        }),
        projectId,
        role: 'system',
        seqOrder: nextSeqOrder,
        stageKey: requestedStageKey,
        supabase,
        userId: user.id,
      })
      existingMessages.push(artifactEvent)

      const continuesIntoDesign =
        artifactType === 'moodboard' &&
        requestedStageKey === 'step_5_style' &&
        hasCompletedMoodboard

      if (!continuesIntoDesign) {
        // TEMP CARD DEBUG: 카드/모델 분기 전에 종료되는 조기 반환입니다.
        console.log('[CARD-DEBUG] final response branch', {
          projectId,
          branch: 'early-artifact-event-return',
          requestNumber: cardDebugRequestNumber,
        })
        return NextResponse.json({
          currentStageKey: requestedStageKey,
          message: null,
          messages: [],
          nextStageKey: requestedStageKey,
          userMessage: null,
        })
      }
    }
    const isPersonaConfirmMessage =
      !isInitialEntry && isPersonaCardConfirmRequest(messageForModel)
    const isPersonaRevisionMessage =
      !isInitialEntry && isPersonaCardRevisionRequest(messageForModel)
    const canUseStaticPersonaConfirmation =
      isPersonaConfirmMessage && requestedStageKey.startsWith('step_3')
    const canUseStaticPersonaFollowup =
      !isInitialEntry &&
      !isPersonaConfirmMessage &&
      hasPersonaFeatureCheckPrompt(existingMessages) &&
      !hasPersonaExperienceCheckPrompt(existingMessages) &&
      requestedStageKey.startsWith('step_3')
    const canUseStaticPersonaCompletion =
      !isInitialEntry &&
      !isPersonaConfirmMessage &&
      hasPersonaExperienceCheckPrompt(existingMessages) &&
      requestedStageKey.startsWith('step_3')
    const isRfpConfirmMessage =
      !isInitialEntry && isRfpConfirmRequest(messageForModel)
    const isRfpRevisionMessage =
      !isInitialEntry && isRfpRevisionRequest(messageForModel)
    const canUseStaticRfpConfirmation =
      isRfpConfirmMessage && requestedStageKey === 'step_7_rfp'

    if (!messageForModel) {
      return NextResponse.json({ error: 'message is required' }, { status: 400 })
    }

    const hasCompletedStep1 = existingMessages.some(
      (existingMessage) => existingMessage.step1Completed
    )
    const hasConfirmedProcess = existingMessages.some(
      (existingMessage) => existingMessage.action === 'confirm_process'
    )
    const canStartStep3 = existingMessages.some((existingMessage) =>
      existingMessage.availableActions?.includes('start_step_3')
    )

    if (
      requestedAction === 'confirm_process' &&
      (requestedStageKey !== 'step_1_idea' || !hasCompletedStep1)
    ) {
      return NextResponse.json(
        { error: 'STEP 1 completion is required' },
        { status: 409 }
      )
    }

    if (
      requestedAction === 'start_step_2' &&
      (requestedStageKey !== 'step_1_idea' || !hasConfirmedProcess)
    ) {
      return NextResponse.json(
        { error: 'Process confirmation is required' },
        { status: 409 }
      )
    }

    if (
      requestedAction === 'start_step_3' &&
      (requestedStageKey !== 'step_2_agent' || !canStartStep3)
    ) {
      return NextResponse.json(
        { error: 'STEP 2 team confirmation is required' },
        { status: 409 }
      )
    }

    if (
      requestedAction === 'confirm_moodboard' &&
      (requestedStageKey !== 'step_5_style' || !hasCompletedMoodboard)
    ) {
      return NextResponse.json(
        { error: 'Moodboard generation must complete before confirmation' },
        { status: 409 }
      )
    }

    const directionResearchRequest = isDirectionResearchRequest(messageForModel)
    let currentStageKey = resolveIntentStageKey({
      action: requestedAction,
      currentStageKey: directionResearchRequest
        ? 'step_4_direction'
        : requestedStageKey,
      hasCompletedDirectionResearch: hasDirectionResearch(existingMessages),
      hasCompletedDirectionFlow: hasCompletedDirectionFlow(existingMessages),
      hasCompletedStep2Research: hasAllKeywordResults(existingMessages),
      lastUserMessage: messageForModel,
    })

    if (
      requestedAction === 'confirm_form_design_summary' &&
      requestedStageKey === 'step_5_design' &&
      hasStep3ArtifactEvent(existingMessages, 'form_design', 'visualized')
    ) {
      currentStageKey = 'step_5_style'
    }

    if (
      ((requestedAction === 'confirm_artifact' && artifactType === 'moodboard') ||
        requestedAction === 'confirm_moodboard') &&
      requestedStageKey === 'step_5_style' &&
      hasCompletedMoodboard
    ) {
      currentStageKey = 'step_5_design'
    }

    if (
      requestedAction === 'visualize_artifact' &&
      artifactType === 'design' &&
      requestedStageKey === 'step_5_design' &&
      hasStep3ArtifactEvent(existingMessages, 'design', 'confirmed')
    ) {
      currentStageKey = 'step_5_cmf'
    }
    const canUseStaticStep2TeamConfirmation =
      requestedAction === 'confirm_step_2_team' &&
      currentStageKey === 'step_2_agent'
    const canUseStaticStep4Entry =
      currentStageKey === 'step_4_direction' &&
      /^STEP\s*4\s*시작할게요[.!?？]?$/i.test(messageForModel.trim())
    const canUseStaticProcessConfirmation =
      requestedAction === 'confirm_process' &&
      currentStageKey === 'step_1_idea' &&
      hasCompletedStep1
    const nextSeqOrder =
      existingMessages.reduce(
        (maxSeq, message) => Math.max(maxSeq, message.seq_order),
        -1
      ) + 1

    const savedUserMessage =
      isInitialEntry ||
      requestedAction === 'confirm_step_2_team' ||
      requestedAction === 'confirm_artifact' ||
      requestedAction === 'visualize_artifact' ||
      (isForcedGeneration && !userMessage)
      ? null
      : await insertProjectMessage({
          action: requestedAction,
          content: userMessage,
          projectId,
          role: 'user',
          seqOrder: nextSeqOrder,
          stageKey: currentStageKey,
          supabase,
          userId: user.id,
        })

    if (
      requestedAction === 'visualize_artifact' &&
      artifactType &&
      artifactMessageId &&
      (artifactType === 'form_design' ||
      !hasStep3ArtifactEvent(existingMessages, artifactType, 'visualized')
      )
    ) {
      const visualizationEvent = await insertProjectMessage({
        action: 'visualize_artifact',
        content: buildArtifactEventContent({
          artifactMessageId,
          artifactSelectedIndex,
          artifactType,
          eventType: 'visualized',
        }),
        projectId,
        role: 'system',
        seqOrder: nextSeqOrder + (savedUserMessage ? 1 : 0),
        stageKey: currentStageKey,
        supabase,
        userId: user.id,
      })
      existingMessages.push(visualizationEvent)
    }

    if (
      (requestedAction === 'confirm_artifact' || requestedAction === 'visualize_artifact') &&
      (artifactType === 'marketing_budget' || artifactType === 'development_timeline')
    ) {
      return NextResponse.json({ currentStageKey, message: null, messages: [], nextStageKey: currentStageKey, userMessage: null })
    }

    const step1ConversationMessages = [
      ...existingMessages,
      ...(savedUserMessage ? [savedUserMessage] : []),
    ]
    const hasStep1ProjectSummaryBeforeProgress = step1ConversationMessages.some(
      (message) =>
        message.role === 'assistant' && isStep1ProjectSummaryContent(message.content)
    )
    let step1Progress =
      currentStageKey === 'step_1_idea'
        ? getStep1ProgressFromProject(project) ?? initializeStep1Progress(project)
        : null
    let step1Assessment: Step1Assessment | null = null
    let step1AssessmentFailed = false

    if (step1Progress && currentStageKey === 'step_1_idea') {
      if (
        !isInitialEntry &&
        userMessage &&
        !hasStep1ProjectSummaryBeforeProgress &&
        requestedAction !== 'confirm_process'
      ) {
        const assessmentInput = {
          apiKey: MOCK_AI_ENABLED ? '' : getGeminiApiKey() ?? '',
          requirements: getSurveyRequirements(project),
          progress: step1Progress,
          userMessage,
        }
        step1Assessment = await assessStep1Progress(assessmentInput).catch(() => null)
        if (!step1Assessment) {
          console.warn('[STEP1-PROGRESS] AI assessment failed; retrying once')
          step1Assessment = await assessStep1Progress(assessmentInput).catch(() => null)
        }
        if (step1Assessment) {
          step1Progress = mergeStep1Assessment(step1Progress, step1Assessment)
        } else {
          step1AssessmentFailed = true
          console.error(
            '[STEP1-PROGRESS] AI assessment failed after retry; preserving state and forcing STEP 1 supplement flow'
          )
        }
      }

    }
    const lastStep1StartIndex = step1ConversationMessages.reduce(
      (lastIndex, message, index) =>
        message.role === 'user' &&
        message.stageKey === 'step_1_idea' &&
        /^STEP\s*1\s*시작할게요[.!?？]?$/i.test(message.content.trim())
          ? index
          : lastIndex,
      -1
    )
    const lastProjectDirectionIndex = step1ConversationMessages.reduce(
      (lastIndex, message, index) =>
        message.role === 'assistant' &&
        /<<AIDEE_PROJECT_DIRECTION>>/i.test(message.content)
          ? index
          : lastIndex,
      -1
    )
    const firstStep1UserIndex = step1ConversationMessages.findIndex(
      (message) =>
        message.role === 'user' && message.stageKey === 'step_1_idea'
    )
    const firstStep1UserAfterProjectDirectionIndex =
      lastProjectDirectionIndex >= 0
        ? step1ConversationMessages.findIndex(
            (message, index) =>
              index > lastProjectDirectionIndex &&
              message.role === 'user' &&
              message.stageKey === 'step_1_idea'
          )
        : -1
    const step1CycleStartIndex =
      lastStep1StartIndex > lastProjectDirectionIndex
        ? lastStep1StartIndex
        : firstStep1UserAfterProjectDirectionIndex >= 0
          ? firstStep1UserAfterProjectDirectionIndex
          : firstStep1UserIndex
    const step1ProjectSummaryIndex = step1ConversationMessages.reduce(
      (lastIndex, message, index) =>
        message.role === 'assistant' &&
        message.stageKey === 'step_1_idea' &&
        (step1CycleStartIndex < 0 || index > step1CycleStartIndex) &&
        isStep1ProjectSummaryContent(message.content)
          ? index
          : lastIndex,
      -1
    )
    const step1HasProjectSummary = step1ProjectSummaryIndex >= 0
    if (
      step1Progress &&
      step1HasProjectSummary &&
      !hasPersistedStep1ConfirmationProgress(project)
    ) {
      const legacyIndex = getStep1ConfirmationAnswerCount(
        step1ConversationMessages,
        step1ProjectSummaryIndex
      )
      const confirmationQuestionExists = step1ConversationMessages
        .slice(step1ProjectSummaryIndex + 1)
        .some(
          (message) =>
            message.role === 'assistant' &&
            /(?:주된\s*목표|제품\s*카테고리|예산|기간|최종\s*활용\s*목적)/i.test(
              message.content
            ) &&
            /(?:맞을까요|맞나요|적절할까요|이대로\s*진행할까요)/i.test(
              message.content
            )
        )
      step1Progress.confirmation.index = legacyIndex
      step1Progress.confirmation.asked =
        confirmationQuestionExists && legacyIndex < STEP1_CONFIRM_SLOT_KEYS.length
      console.log('[STEP1-CONFIRM] legacy state migrated', {
        index: step1Progress.confirmation.index,
        asked: step1Progress.confirmation.asked,
      })
    }
    const step1SupplementComplete = step1Progress
      ? STEP1_SUPPLEMENT_SLOT_KEYS.every(
          (key) => step1Progress?.slots[key].status !== 'missing'
        )
      : false
    const shouldRepeatStep1AskedSlot = Boolean(
      step1Progress?.askedSlot &&
        step1Assessment &&
        (step1Assessment.userAskedForHelp || !step1Assessment.askedSlotAnswered) &&
        step1Progress.slots[step1Progress.askedSlot].status === 'missing' &&
        step1Progress.clarificationCounts[step1Progress.askedSlot] < STEP1_MAX_CLARIFICATIONS
    )
    const nextStep1SupplementSlot = step1SupplementComplete
      ? null
      : shouldRepeatStep1AskedSlot
        ? step1Progress?.askedSlot ?? null
        : step1Assessment?.nextSlot ?? step1Progress?.askedSlot ?? null
    let step1ConfirmationAssessment: Step1ConfirmationAssessment | null = null
    let step1ConfirmationChange: {
      previousValue: string
      newValue: string
      changedLabel: string
    } | null = null
    let step1ConfirmationAdvanced = false

    if (
      step1Progress &&
      currentStageKey === 'step_1_idea' &&
      step1HasProjectSummary &&
      step1Progress.confirmation.asked &&
      step1Progress.confirmation.index < STEP1_CONFIRM_SLOT_KEYS.length &&
      !isInitialEntry &&
      userMessage
    ) {
      const confirmationSlot =
        STEP1_CONFIRM_SLOT_KEYS[step1Progress.confirmation.index]
      const currentValue = getStep1ConfirmationSlotValue(project, confirmationSlot)
      step1ConfirmationAssessment = await assessStep1ConfirmationReply({
        apiKey: MOCK_AI_ENABLED ? '' : getGeminiApiKey() ?? '',
        currentValue,
        slot: confirmationSlot,
        userMessage,
      }).catch(() => null)

      const needsClarification = step1ConfirmationAssessment?.needsClarification === true
      const reaskCount = step1Progress.confirmation.reaskCounts[confirmationSlot]
      if (step1ConfirmationAssessment) {
        step1ConfirmationChange = await applyStep1ConfirmationValueChange({
          assessment: step1ConfirmationAssessment,
          project,
          slot: confirmationSlot,
          supabase,
        })
      }

      if (needsClarification && reaskCount < 1) {
        step1Progress.confirmation.reaskCounts[confirmationSlot] = reaskCount + 1
      } else {
        step1Progress.confirmation.index += 1
        step1Progress.confirmation.asked = false
        step1ConfirmationAdvanced = true
      }

      console.log('[STEP1-CONFIRM]', {
        slot: confirmationSlot,
        currentValue,
        userMessage,
        needsClarification,
        reaskCountBefore: reaskCount,
        reaskCountAfter: step1Progress.confirmation.reaskCounts[confirmationSlot],
        advanced: !needsClarification || reaskCount >= 1,
        nextIndex: step1Progress.confirmation.index,
        changeConfidence: step1ConfirmationAssessment?.changeConfidence ?? 'none',
        proposedValue: step1ConfirmationAssessment?.newValue ?? null,
        proposedMinBudget: step1ConfirmationAssessment?.newMinBudget ?? null,
        proposedMaxBudget: step1ConfirmationAssessment?.newMaxBudget ?? null,
        proposedDuration: step1ConfirmationAssessment?.newDuration ?? null,
        valueChange: step1ConfirmationChange,
        assessmentFailed: !step1ConfirmationAssessment,
      })
    }
    const nextStep1ConfirmationIndex = step1HasProjectSummary
      ? step1Progress?.confirmation.index ?? 0
      : -1
    const step1TurnNumber = isInitialEntry || currentStageKey !== 'step_1_idea'
      ? 0
      : !step1HasProjectSummary
        ? step1SupplementComplete
          ? 5
          : 1
        : nextStep1ConfirmationIndex >= 0
          ? nextStep1ConfirmationIndex + 6
          : 10
    const step1SupplementLabel = nextStep1SupplementSlot
      ? STEP1_SUPPLEMENT_SLOTS[STEP1_SUPPLEMENT_SLOT_KEYS.indexOf(nextStep1SupplementSlot)]
      : null
    const step1TurnInstruction =
      !step1HasProjectSummary && step1SupplementLabel
        ? `제품의 ${step1SupplementLabel}`
        : step1TurnNumber >= 6 && step1TurnNumber <= 9
          ? `${STEP1_CONFIRM_SLOTS[step1TurnNumber - 6]} 확인`
          : step1TurnNumber === 5
            ? '프로젝트 요약'
            : step1TurnNumber >= 10
              ? '제품 개발 조건 요약 및 프로세스 확인'
            : 'STEP 1 시작 안내'

    const step1ConfirmationSlot =
      step1TurnNumber >= 6 && step1TurnNumber <= 9
        ? STEP1_CONFIRM_SLOT_KEYS[step1TurnNumber - 6]
        : null
    const step1NeedsConfirmationExplanation = Boolean(
      step1ConfirmationSlot &&
        (step1Progress?.confirmation.reaskCounts[step1ConfirmationSlot] ?? 0) > 0
    )

    // TEMP STEP 1 DEBUG: 서버가 계산한 턴과 이번 턴의 지시를 확인한다.
    if (currentStageKey === 'step_1_idea') {
      console.log(
        `[STEP 1 DEBUG] 턴 ${step1TurnNumber}: ${step1TurnInstruction}`
      )
    }

    const apiKey = isInitialEntry || MOCK_AI_ENABLED ? null : getGeminiApiKey()

    if (
      !isInitialEntry &&
      !canUseStaticStep2TeamConfirmation &&
      !canUseStaticStep4Entry &&
      !canUseStaticProcessConfirmation &&
      !canUseStaticPersonaConfirmation &&
      !canUseStaticPersonaFollowup &&
      !canUseStaticPersonaCompletion &&
      !canUseStaticRfpConfirmation &&
      !MOCK_AI_ENABLED &&
      !apiKey
    ) {
      return NextResponse.json({ error: 'Gemini API key is missing' }, { status: 500 })
    }

    const requiredApiKey = apiKey ?? ''
    let assistantContent = ''
    let responseStageKey = currentStageKey
    let step3Progress: Step3Progress | null = null
    let step3Judgement: Step3Judgement | null = null
    let step3ResultRemoved = false
    let step3RawModelText = ''
    let step3DialogueValidationFailed = false
    let step3ResultValidationFailed = false
    let step3ResultSection: 'experience' | 'relationship' | null = null
    let step4RawModelText = ''
    let step3ResponseAction: 'pass' | 'normalize' | 'regenerate' | 'fallback' = 'pass'
    let step3ResponseReasons: string[] = []
    // TEMP CARD DEBUG: 최종 응답을 만든 분기입니다.
    let cardDebugResponseBranch = 'unassigned'

    if (isInitialEntry) {
      cardDebugResponseBranch = 'project-card'
      assistantContent = buildProjectCardResponse({
        project,
        referenceImages,
      })
    } else {
      const conversationMessages = [
        ...existingMessages,
        ...(savedUserMessage ? [savedUserMessage] : []),
      ]
      if (currentStageKey.startsWith('step_3')) {
        const phase = getStep3Phase(conversationMessages)
        step3Progress = getStep3ProgressFromProject(project)
        if (!step3Progress && (phase === 'experience_dialogue' || phase === 'relationship_dialogue')) {
          step3Progress = createStep3Progress(
            phase === 'experience_dialogue' ? 'experience' : 'relationship'
          )
          await saveStep3Progress({ project, progress: step3Progress, supabase })
        }
        if (
          requestedAction === 'visualize_artifact' &&
          (artifactType === 'keyword_experience' || artifactType === 'keyword_relationship')
        ) {
          const visualizedSection =
            artifactType === 'keyword_experience' ? 'experience' : 'relationship'
          if (!step3Progress) {
            step3Progress = createStep3Progress(visualizedSection)
          }
          step3Progress = advanceStep3AfterVisualization(
            step3Progress,
            visualizedSection
          )
          await saveStep3Progress({ project, progress: step3Progress, supabase })
        }
        if (
          step3Progress?.section === 'experience' &&
          areStep3TopicsComplete(step3Progress, 'experience') &&
          phase === 'relationship_dialogue' &&
          hasStep3ArtifactEvent(conversationMessages, 'keyword_experience', 'confirmed') &&
          hasStep3ArtifactEvent(conversationMessages, 'keyword_experience', 'visualized')
        ) {
          step3Progress = {
            ...step3Progress,
            section: 'relationship',
            currentTopic: STEP3_TOPIC_ORDER.relationship[0],
          }
          await saveStep3Progress({ project, progress: step3Progress, supabase })
        }
        if (
          step3Progress &&
          savedUserMessage &&
          (step3Progress.topics[step3Progress.currentTopic].status === 'awaiting_core' ||
            step3Progress.topics[step3Progress.currentTopic].status === 'awaiting_deep')
        ) {
          const judgementStartedAt = Date.now()
          step3Judgement = await assessStep3Topic({
            apiKey: MOCK_AI_ENABLED ? '' : getGeminiApiKey() ?? '',
            progress: step3Progress,
            conversation: conversationMessages,
            userMessage: savedUserMessage.content,
          }).catch((error) => {
            console.error('[STEP3-DEBUG] AI judgement failed:', error)
            return null
          })
          if (process.env.NODE_ENV === 'development') {
            console.log('[STEP3-DEBUG] judgement timing', {
              durationMs: Date.now() - judgementStartedAt,
            })
          }
          if (step3Judgement) {
            const expectedTopic = step3Progress.currentTopic
            const expectedQuestionKind =
              step3Progress.topics[expectedTopic].pendingQuestionKind ?? 'core'
            const topicMatches = step3Judgement.currentTopic === expectedTopic
            const questionKindMatches =
              step3Judgement.questionKind === expectedQuestionKind
            const validatedJudgement = {
              ...step3Judgement,
              // 질문 종류 오판은 재질문 사유로 사용하지 않습니다. 현재 하위 주제가
              // 맞으면 사용자의 답변을 현재 상태의 질문 종류에 맞춰 그대로 반영합니다.
              questionMatches: topicMatches,
            }
            const judgementResult = applyStep3Judgement(step3Progress, validatedJudgement)
            step3Progress = judgementResult.progress
            if (
              expectedTopic === 'space' &&
              step3Progress.topics.space.status === 'complete'
            ) {
              console.log('[STEP3-PROGRESS] Experience 공간 완료 직후 상태', {
                section: step3Progress.section,
                currentTopic: step3Progress.currentTopic,
                spaceStatus: step3Progress.topics.space.status,
              })
            }
            if (!topicMatches || !questionKindMatches || !step3Judgement.questionMatches) {
              console.warn('[STEP3-DEBUG] question mismatch', {
                expectedTopic,
                expectedQuestionKind,
                actualTopic: step3Judgement.currentTopic,
                actualQuestionKind: step3Judgement.questionKind,
                modelQuestionMatches: step3Judgement.questionMatches,
                topicMatches,
                questionKindMatches,
                questionKindMismatchIgnored: topicMatches && !questionKindMatches,
                topicMismatchReasked: !topicMatches,
                reaskCount: step3Progress.topics[expectedTopic].reaskCount,
                reasked: judgementResult.reasked,
                forcedAnswerAfterLimit: judgementResult.forcedAnswerAfterLimit,
              })
            }
            await saveStep3Progress({ project, progress: step3Progress, supabase })
          } else {
            console.warn('[STEP3-DEBUG] AI judgement unavailable; treating user response as answer')
            const judgementResult = applyStep3Judgement(step3Progress, {
              currentTopic: step3Progress.currentTopic,
              responseType: 'answer',
              questionMatches: true,
              sufficient: false,
              undecided: false,
              questionKind:
                step3Progress.topics[step3Progress.currentTopic].pendingQuestionKind ?? 'core',
            })
            step3Progress = judgementResult.progress
            if (
              step3Progress.currentTopic === 'space' &&
              step3Progress.topics.space.status === 'complete'
            ) {
              console.log('[STEP3-PROGRESS] Experience 공간 완료 직후 상태', {
                section: step3Progress.section,
                currentTopic: step3Progress.currentTopic,
                spaceStatus: step3Progress.topics.space.status,
              })
            }
            await saveStep3Progress({ project, progress: step3Progress, supabase })
          }
        }
      }
      const modelConversationMessages = [
        ...conversationMessages.filter((message) => message.role !== 'system'),
        ...(styleKeywordSelectionMessage
          ? [{ content: styleKeywordSelectionMessage, role: 'user' as const }]
          : []),
        ...(requestedAction === 'visualize_artifact'
          ? [{ content: messageForModel, role: 'user' as const }]
          : []),
      ]
      const modelMessages: GeminiMessage[] =
        modelConversationMessages.length > 0
          ? modelConversationMessages.map((message) => ({
              content: message.content,
              role: message.role,
            }))
          : [{ content: messageForModel, role: 'user' }]
      const styleProgress =
        currentStageKey === 'step_5_style'
          ? getStep5StyleProgress(
              conversationMessages,
              Boolean(styleKeywordSelectionMessage)
            )
          : null
      const step3PromptPhase = getStep3Phase(conversationMessages)
      const useStep3ScopedPrompt = Boolean(
        currentStageKey === 'step_3_persona' &&
        step3Progress &&
        (step3PromptPhase === 'experience_dialogue' ||
          step3PromptPhase === 'relationship_dialogue')
      )
      const systemPrompt = useStep3ScopedPrompt
        ? buildStep3ScopedSystemPrompt({
            activeExpert,
            currentStageKey,
            topic: step3Progress!.currentTopic,
            project,
            referenceImages,
          })
        : buildSystemPrompt({
            activeExpert,
            currentAction: requestedAction,
            currentStageKey,
            additionalInstruction: '',
            project,
            referenceImages,
          })
      const step3ProgressInstruction =
        currentStageKey.startsWith('step_3')
          ? getStep3GateInstruction(conversationMessages, step3Progress)
          : ''
      const step1ProgressInstruction =
        currentStageKey === 'step_1_idea'
          ? !step1HasProjectSummary && step1AssessmentFailed
            ? [
                '[STEP 1 진행 상태 — 내부 상태 판정이 완료되지 않았습니다]',
                '이번 턴에는 기존에 정해진 내용을 바꾸지 말고, 사용자가 보충 설명을 한 가지 더 해 달라고 요청하세요.',
                '프로젝트 요약이나 requirements 확인 질문으로 넘어가지 마세요.',
              ].join('\n')
            : !step1HasProjectSummary && nextStep1SupplementSlot
            ? [
                '[STEP 1 진행 상태 — 이 지시가 다른 모든 지시보다 우선합니다]',
                `이번 턴에 물어야 할 항목: ${STEP1_SUPPLEMENT_SLOTS[STEP1_SUPPLEMENT_SLOT_KEYS.indexOf(nextStep1SupplementSlot)]}`,
                '이 항목 하나만 물으세요. 질문은 한 문장입니다.',
                '다른 항목을 함께 묻거나, 목록에 없는 질문을 덧붙이지 마세요.',
                '사용자의 직전 답변에 대한 짧은 반응 한 문장을 먼저 쓰고, 그다음 지정된 항목에 대한 질문 한 문장만 쓰세요.',
                '사용자가 해당 항목에 답하지 않고 다른 이야기를 하면 답변을 짧게 이어간 뒤 같은 항목을 다시 물으세요.',
                '프로젝트 요약, 제품 개발 조건 요약, 프로세스 확인 문구, 완료 마커를 출력하지 마세요.',
              ].join('\n')
            : step1TurnNumber === 5
              ? [
                  '[STEP 1 진행 상태 — 이 지시가 다른 모든 지시보다 우선합니다]',
                  '이번 턴에는 질문하지 말고 프로젝트 요약만 출력하세요.',
                  `"현재까지 논의된 내용을 바탕으로 '${project.title || '새 프로젝트'}'을 요약해 드릴게요."로 시작하세요.`,
                  '프로젝트명, 프로젝트 목표, 제품 카테고리, 예산/기간 범위, 예상 크기, 주요 기능/특징, 주요 재질, 사용 장면, 최종 활용 목적, 색상을 각각 한 줄에 하나씩 출력하세요.',
                  '정해지지 않은 항목은 미정으로 적으세요.',
                  '마지막 줄은 "이 내용으로 프로젝트를 본격적으로 시작해도 괜찮을까요?"로 끝내세요.',
                  '이 턴에는 추가 질문이나 제품 개발 조건 요약을 출력하지 마세요. 완료 마커를 출력하지 마세요.',
                ].join('\n')
              : !step1HasProjectSummary && !nextStep1SupplementSlot
              ? [
                  '[STEP 1 진행 상태 — 보충 질문 항목을 확인하는 중입니다]',
                  '프로젝트 요약이나 requirements 확인 질문으로 넘어가지 마세요.',
                ].join('\n')
              : step1TurnNumber <= 9
                ? [
                    '[STEP 1 진행 상태 — 이 지시가 다른 모든 지시보다 우선합니다]',
                    `이번 턴에 확인해야 할 항목: ${STEP1_CONFIRM_SLOTS[step1TurnNumber - 6]}`,
                    '이 항목 하나만 확인하세요. 질문은 한 문장입니다.',
                    '프로젝트 생성 시 입력된 값을 다시 확인하는 질문만 만드세요. 새로운 목표나 방향을 제안하거나 프로젝트를 시작할지 판단하는 표현은 사용하지 마세요.',
                    '질문은 "이 값이 맞을까요?", "이대로 진행할까요?", "이 프로젝트에 적절할까요?"와 같은 의미로 끝내세요.',
                    ...(step1NeedsConfirmationExplanation
                      ? [
                          '사용자의 질문이나 도움 요청에 먼저 짧고 쉽게 답하세요.',
                          '이 응답에서는 확인 질문을 직접 쓰지 마세요. 확인 질문은 서버가 뒤에 붙입니다.',
                        ]
                      : []),
                    '사용자의 직전 답변에 대한 짧은 반응 한 문장을 먼저 쓰고, 그다음 확인 질문 한 문장만 쓰세요.',
                    '다른 항목을 함께 묻거나, 목록에 없는 질문을 덧붙이지 마세요.',
                    '프로젝트 요약, 제품 개발 조건 요약, 프로세스 확인 문구, 완료 마커를 출력하지 마세요.',
                  ].join('\n')
                : [
                    '[STEP 1 진행 상태 — 이 지시가 다른 모든 지시보다 우선합니다]',
                    '이번 턴에는 질문하지 말고 제품 개발 조건 요약만 출력하세요.',
                    '7~10번 확인 질문에서 확인된 주된 목표, 제품 카테고리, 예산·기간 범위, 최종 활용 목적만으로 자연스러운 하나의 문단을 작성하세요. 라벨을 줄마다 나열하지 말고, 굵은 글씨·글머리 기호·구분선을 사용하지 마세요.',
                    '확인하지 않은 내용을 지어내거나 다른 항목을 추가하지 마세요.',
                    '문단 다음 줄에 "전체 개발 프로세스를 함께 확인해볼까요?"를 정확히 출력하고, 그 다음 줄에 완료 마커를 출력하세요.',
                  ].join('\n')
          : ''
      const system = [
        systemPrompt,
        step1ProgressInstruction,
        step3ProgressInstruction ? step3ProgressInstruction : '',
      ]
        .filter(Boolean)
        .join('\n\n')
      const finalSystem =
        styleProgress && currentStageKey === 'step_5_style'
          ? `${system}\n\n${buildStep5StyleProgressInstruction(styleProgress)}`
          : system
      const finalSystemWithStep3Instruction =
        currentStageKey.startsWith('step_3') && step3ProgressInstruction
          ? `${finalSystem}\n\n[STEP 3 진행 지시]\n${step3ProgressInstruction}`
          : finalSystem
      if (
        currentStageKey === 'step_1_idea' &&
        step1TurnNumber >= 6 &&
        step1TurnNumber <= 9
      ) {
        console.log(
          '[STEP 1 DIAG] 진행 상태 블록:\n' +
            (step1ProgressInstruction || '(없음)')
        )
          console.log('[STEP 1 DIAG] 최종 system prompt:\n' + finalSystemWithStep3Instruction)
      }
      const conversation = buildConversation(modelMessages)
      const hasExistingMoodboardCandidates = existingMessages.some(
        (existingMessage) =>
          existingMessage.generatedImageBlock?.purpose === 'moodboard_candidate' &&
          existingMessage.generatedImageBlock.images.length > 0
      )
      const hasExistingKeywordPicker = existingMessages.some((m) =>
        m.content.includes('<<AIDEE_STYLE_KEYWORD_PICKER>>')
      )
      const hasExistingRfp = existingMessages.some(
        (existingMessage) => Boolean(extractRfpJsonBlock(existingMessage.content).rfp)
      )
      const hasExistingDesignImages = existingMessages.some(
        (existingMessage) =>
          existingMessage.generatedImageBlock?.purpose === 'design' &&
          existingMessage.generatedImageBlock.images.length > 0
      )
      const hasExistingModelingImages = existingMessages.some(
        (existingMessage) =>
          existingMessage.generatedImageBlock?.purpose === 'modeling' &&
          existingMessage.generatedImageBlock.images.length > 0
      )
      const shouldGeneratePersonaCardImage =
        body.forceImageGeneration === 'persona_card' ||
        isPersonaCardVisualizationRequest(messageForModel)
      const shouldGenerateStyleImages =
        (currentStageKey !== 'step_5_cmf' &&
          body.forceImageGeneration === 'style_reference' &&
          !hasStyleReferenceSelection(messageForModel)) ||
        (currentStageKey !== 'step_5_cmf' &&
          currentStageKey === 'step_5_style' &&
          styleProgress?.phase === 'mood_options' &&
          isExplicitStep4ProceedRequest(messageForModel) &&
          !hasExistingMoodboardCandidates)
      const shouldGenerateDesignImages =
        currentStageKey !== 'step_5_cmf' &&
          (body.forceImageGeneration === 'initial_design' ||
          body.forceImageGeneration === 'design_revision' ||
          (currentStageKey === 'step_5_design' &&
            !hasExistingDesignImages))
      const shouldGenerateModelingImages =
        currentStageKey === 'step_5_3d' && !hasExistingModelingImages
      const shouldGenerateRfp =
        currentStageKey === 'step_7_rfp' &&
        (!hasExistingRfp || isRfpRevisionMessage)

      if (currentStageKey === 'step_5_design') {
        console.log('[STEP 5 DESIGN DIAG] 이미지 생성 조건:', {
          currentStageKey,
          requestedStageKey,
          forceImageGeneration: body.forceImageGeneration ?? null,
          hasExistingDesignImages,
          isImageRequest: isImageRequest(messageForModel),
          shouldGenerateDesignImages,
          messageForModel,
        })
      }

      if (canUseStaticStep4Entry) {
        cardDebugResponseBranch = 'static-step-4-entry'
        assistantContent = buildStep4EntryPrompt()
        responseStageKey = currentStageKey
      } else if (canUseStaticProcessConfirmation) {
        cardDebugResponseBranch = 'static-process-confirmation'
        assistantContent = buildProcessConfirmationResponse()
        responseStageKey = currentStageKey
      } else if (canUseStaticStep2TeamConfirmation) {
        cardDebugResponseBranch = 'static-step-2-team-confirmation'
        assistantContent = buildStep2TeamCompletedPrompt()
        responseStageKey = 'step_2_agent'
      } else if (canUseStaticPersonaConfirmation) {
        cardDebugResponseBranch = 'static-persona-confirmation'
        assistantContent = buildPersonaFinalCheckPrompt()
        responseStageKey = currentStageKey
      } else if (canUseStaticPersonaFollowup) {
        cardDebugResponseBranch = 'static-persona-followup'
        assistantContent = buildPersonaExperienceCheckPrompt()
        responseStageKey = currentStageKey
      } else if (canUseStaticPersonaCompletion) {
        cardDebugResponseBranch = 'static-persona-completion'
        assistantContent = buildPersonaConfirmedPrompt()
        responseStageKey = 'step_3_research'
      } else if (canUseStaticRfpConfirmation) {
        cardDebugResponseBranch = 'static-rfp-confirmation'
        assistantContent = buildRfpConfirmedPrompt()
        responseStageKey = 'step_7_rfp'
      } else if (MOCK_AI_ENABLED) {
        cardDebugResponseBranch = 'mock'
        assistantContent = buildMockStageResponse({
          currentStageKey,
          forceImageGeneration: body.forceImageGeneration,
          message: messageForModel,
          projectTitle: project.title || 'Mock Aidee Project',
          step1UserTurnCount: existingMessages.filter(
            (existingMessage) =>
              existingMessage.role === 'user' &&
              existingMessage.stageKey === 'step_1_idea'
          ).length,
        })
        responseStageKey = currentStageKey
      } else if (shouldGeneratePersonaCardImage) {
        cardDebugResponseBranch = 'persona-image-generation'
        const personaCard = getLatestPersonaCard(conversationMessages)

        if (!personaCard) {
          return NextResponse.json(
            { error: 'Persona card data is missing' },
            { status: 400 }
          )
        }

        const personaImageBlock = await generateGeminiImages({
          apiKey: requiredApiKey,
          aspectRatio: '3:4',
          count: 1,
          prompt: buildPersonaImagePrompt({
            personaCard,
            projectTitle: project.title || 'Untitled project',
          }),
          purpose: 'persona',
        })

        assistantContent = appendPersonaCardBlock({
          data: {
            ...personaCard,
            imageUrl: personaImageBlock.images[0] ?? personaCard.imageUrl ?? null,
          },
          text: '',
        })
        responseStageKey = currentStageKey
      } else if (shouldGenerateRfp) {
        cardDebugResponseBranch = 'rfp-generation'
        assistantContent = await generateRfp({
          apiKey: requiredApiKey,
          messages: modelMessages,
          project,
          referenceImages,
        })
      } else {
        cardDebugResponseBranch = 'model-or-image-generation'
        let imageBlock = null

        if (shouldGenerateStyleImages) {
          const unsplashKey = getUnsplashAccessKey()
          let candidates: UnsplashImageMeta[] = []
          let searchQuery = 'minimal elegant product design'

          if (unsplashKey) {
            searchQuery = await generateUnsplashSearchQuery({
              apiKey: requiredApiKey,
              conversation,
            })
            candidates = await searchUnsplashPhotos({
              accessKey: unsplashKey,
              query: searchQuery,
              perPage: 3,
            }).catch((error) => {
              console.error('[STEP 5] 무드보드 후보 Unsplash 검색 실패:', error)
              return []
            })
          }

          if (candidates.length === 0) {
            // fallback: empty block so the chat still responds
            imageBlock = null
          } else {
            // Save candidates to DB
            await supabase.from('moodboard_images').insert(
              candidates.map((img) => ({
                is_selected: false,
                phase: 'candidate',
                photographer_name: img.photographer_name,
                photographer_url: img.photographer_url,
                project_id: projectId,
                search_query: searchQuery,
                thumb_url: img.thumb_url,
                unsplash_id: img.id,
                unsplash_page_url: img.unsplash_page_url,
                url: img.url,
              }))
            )

            imageBlock = {
              images: candidates.map((c) => c.url),
              model: 'unsplash',
              prompt: searchQuery,
              purpose: 'moodboard_candidate' as const,
              selectedImageIndex: null,
              unsplashMeta: candidates,
            }
          }
        } else if (shouldGenerateDesignImages) {
          try {
            const moodboardReferenceImages = await getMoodboardReferenceImages({
              supabase,
              projectId,
              fallbackMessages: existingMessages,
            })
            console.log('[STEP 5 DESIGN DIAG] generateGeminiImages 호출', {
              referenceImageCount: moodboardReferenceImages.length,
              referenceSource: moodboardReferenceImages.length > 0 ? 'moodboard' : 'none',
            })
            imageBlock = await generateGeminiImages({
              apiKey: requiredApiKey,
              count: body.forceImageGeneration === 'design_revision' ? 1 : 3,
              prompt: buildDesignImagePrompt({
                conversation,
                projectTitle: project.title || 'Untitled project',
                requirements: project.requirements,
                userRequest: messageForModel,
              }),
              purpose: 'design',
              referenceImages: moodboardReferenceImages,
            })
            console.log('[STEP 5 DESIGN DIAG] 이미지 생성 성공:', {
              count: imageBlock.images.length,
              model: imageBlock.model ?? null,
              purpose: imageBlock.purpose ?? null,
              referenceImageCount: moodboardReferenceImages.length,
            })
          } catch (err) {
            console.error('Design image generation failed:', err)
            throw new Error('디자인 시안 이미지 생성에 실패했습니다. 다시 시도해 주세요.')
          }
        } else if (shouldGenerateModelingImages) {
          try {
            imageBlock = await generateGeminiImages({
              apiKey: requiredApiKey,
              count: 2,
              prompt: buildModelingImagePrompt({
                conversation,
                projectTitle: project.title || 'Untitled project',
                requirements: project.requirements,
                userRequest: messageForModel,
              }),
              purpose: 'modeling',
              referenceImages: [getSelectedDesignReferenceImage(existingMessages)].filter(
                (image): image is string => Boolean(image)
              ),
            })
          } catch (err) {
            console.error('3D modeling image generation failed:', err)
            throw new Error('3D 모델링 시안 이미지 생성에 실패했습니다. 다시 시도해 주세요.')
          }
        }

        const modelGenerationStartedAt = Date.now()
        let rawModelText: string
        try {
          rawModelText = await generateGeminiText({
            apiKey: requiredApiKey,
            messages: modelMessages,
            system: finalSystemWithStep3Instruction,
          })
        } finally {
          if (currentStageKey.startsWith('step_3') && process.env.NODE_ENV === 'development') {
            console.log('[STEP3-DEBUG] response generation timing', {
              durationMs: Date.now() - modelGenerationStartedAt,
            })
          }
        }
        step3RawModelText = rawModelText
        step4RawModelText = currentStageKey === 'step_4_direction' ? rawModelText : ''
        const hasRemainingDirectionResearch = DIRECTION_RESEARCH_ARTIFACT_TYPES.some(
          (directionArtifactType) =>
            !hasStep3ArtifactEvent(
              existingMessages,
              directionArtifactType,
              'confirmed'
            )
        )
        const hasPendingResearchQuestion = hasPendingStep4ResearchQuestion(
          existingMessages
        )
        const allowStep4ResearchWidgets =
          currentStageKey === 'step_4_direction' &&
          (canUseStaticStep4Entry ||
            (hasPendingResearchQuestion &&
              !isDirectionResearchRequest(messageForModel) &&
              hasRemainingDirectionResearch))
        if (
          currentStageKey === 'step_4_direction' &&
          !shouldKeepStep4ResearchWidgets({
            allowWidgets: allowStep4ResearchWidgets,
            text: rawModelText,
            messages: existingMessages,
          })
        ) {
          rawModelText = removeStep4ResearchWidgets(rawModelText)
        }
        if (
          currentStageKey.startsWith('step_3') &&
          process.env.NODE_ENV === 'development'
        ) {
          console.log('[STEP3-DEBUG] rawModelText:', JSON.stringify(rawModelText))
        }
        if (currentStageKey === 'step_5_design') {
          console.log('[STEP 5 DESIGN DIAG] 모델 텍스트 raw:', JSON.stringify(rawModelText))
        }
        const step3Phase = getStep3Phase(conversationMessages)
        const isStep3DialogueTurn = Boolean(
          step3Progress &&
          (step3Phase === 'experience_dialogue' || step3Phase === 'relationship_dialogue') &&
          !areStep3TopicsComplete(step3Progress, step3Progress.section)
        )
        const isStep3ResultTurn = Boolean(
          step3Progress &&
          (step3Phase === 'experience_dialogue' || step3Phase === 'relationship_dialogue') &&
          areStep3TopicsComplete(step3Progress, step3Progress.section)
        )
        if (isStep3ResultTurn && step3Progress) {
          step3ResultSection = step3Progress.section
        }

        let validatedStep3Text = rawModelText
        if (isStep3DialogueTurn) {
          const normalizedText = normalizeStep3DialogueResponse(rawModelText)
          if (normalizedText !== rawModelText.trim()) {
            step3ResponseAction = 'normalize'
          }
          const dialogueReasons: string[] = []
          if (!hasStep3Question(normalizedText)) dialogueReasons.push('question-missing')
          if (hasStep3ForbiddenDialogueContent(normalizedText)) dialogueReasons.push('forbidden-content')
          if (getStep3QuestionEndIndexes(normalizedText).length > 1) dialogueReasons.push('multiple-questions')

          if (isValidStep3DialogueResponse(normalizedText)) {
            validatedStep3Text = normalizedText
          } else {
            step3ResponseReasons = dialogueReasons
            step3ResponseAction = 'regenerate'
            step3DialogueValidationFailed = true
            console.warn('[STEP3-DEBUG] dialogue response validation failed; regenerating with original prompt context', {
              reasons: dialogueReasons,
            })
            const previousAssistantQuestion = getStep3PreviousAssistantQuestion(conversationMessages)
            const retrySystem = `${finalSystemWithStep3Instruction}\n\n[STEP 3 응답 재생성 사유]\n${dialogueReasons.join(', ') || '사용자에게 보여줄 수 없는 형식'}\n원래 대화 기록과 현재 진행 지시를 유지하고, 위 문제만 고쳐 현재 하위 주제의 질문 하나를 작성하세요. 직전 질문과 같은 문장을 반복하지 말고 다른 표현으로 작성하세요. 직전 질문은 다음과 같습니다: ${previousAssistantQuestion}\n질문 다음 줄의 A~D 힌트는 prompt.ts 형식에 맞으면 유지할 수 있습니다. ${STEP3_NO_PROGRESS_LANGUAGE_RULE}`
            const regeneratedQuestion = await generateGeminiText({
              apiKey: requiredApiKey,
              messages: modelMessages,
              system: retrySystem,
            })
            const normalizedRegeneratedQuestion = normalizeStep3DialogueResponse(regeneratedQuestion)
            if (isValidStep3DialogueResponse(normalizedRegeneratedQuestion)) {
              validatedStep3Text = normalizedRegeneratedQuestion
            } else {
              step3ResponseAction = 'fallback'
              step3ResponseReasons = [
                ...dialogueReasons,
                'regenerated-response-invalid',
              ]
              const lastUserMessage = [...conversationMessages]
                .reverse()
                .find((message) => message.role === 'user')?.content ?? ''
              validatedStep3Text = buildStep3ContextualFallbackQuestion({
                progress: step3Progress!,
                project,
                lastUserMessage,
              })
            }
          }
        } else if (
          isStep3ResultTurn &&
          step3Progress &&
          !isValidStep3ResultFormat(
            rawModelText,
            step3Progress.section === 'experience' ? 'experience' : 'relationship'
          )
        ) {
          step3ResponseAction = 'regenerate'
          step3ResponseReasons = getStep3ResultValidationReasons(
            rawModelText,
            step3Progress.section === 'experience' ? 'experience' : 'relationship'
          )
          step3ResultValidationFailed = true
          console.warn('[STEP3-DEBUG] result format validation failed; regenerating result', {
            reasons: step3ResponseReasons,
          })
          const resultKind = step3Progress.section === 'experience' ? 'experience' : 'relationship'
          const expectedCount = resultKind === 'experience' ? 10 : 5
          const resultRetryInstruction = `${finalSystemWithStep3Instruction}\n\n[STEP 3 결과 재생성 사유]\n${step3ResponseReasons.join(', ')}\n현재는 결과 출력 차례입니다. 질문·반응·설명을 출력하지 말고 키워드 블록만 작성하세요. Experience는 감정·행동·공간을 각각 10개, Relationship은 여섯 관계 항목을 각각 5개 작성하세요. 부족하거나 초과한 항목은 정확한 개수로 맞추세요. 각 키워드 항목은 2~10자의 짧은 명사구로 쓰고, 키워드 블록 뒤에는 아무것도 붙이지 마세요.`
          const resultCandidates = [rawModelText]
          let regeneratedResult = await generateGeminiText({
            apiKey: requiredApiKey,
            messages: modelMessages,
            system: resultRetryInstruction,
          })
          resultCandidates.push(regeneratedResult)
          if (!isValidStep3ResultFormat(regeneratedResult, resultKind)) {
            const retryReasons = getStep3ResultValidationReasons(regeneratedResult, resultKind)
            console.warn('[STEP3-DEBUG] regenerated result format failed; retrying with item counts', {
              reasons: retryReasons,
            })
            regeneratedResult = await generateGeminiText({
              apiKey: requiredApiKey,
              messages: modelMessages,
              system: `${resultRetryInstruction}\n구체적인 항목별 오류: ${retryReasons.join(', ')}`,
            })
            resultCandidates.push(regeneratedResult)
          }

          if (isValidStep3ResultFormat(regeneratedResult, resultKind)) {
            validatedStep3Text = regeneratedResult
          } else {
            const candidateBlocks = resultCandidates
              .map((candidate) => extractStep3KeywordBlock(candidate, resultKind))
              .filter((candidate): candidate is NonNullable<ReturnType<typeof extractStep3KeywordBlock>> => Boolean(candidate))
              .sort((left, right) => right.score - left.score)

            if (candidateBlocks.length > 0) {
              const bestCandidate = candidateBlocks[0]
              validatedStep3Text = bestCandidate.text
              step3ResponseReasons = [
                ...step3ResponseReasons,
                `selected-keyword-candidate:${bestCandidate.foundLabels}/${bestCandidate.expectedLabels}`,
              ]
              console.warn('[STEP3-DEBUG] using closest extractable keyword block after result retries failed', {
                resultKind,
                expectedCount,
                candidateCount: candidateBlocks.length,
                selectedScore: bestCandidate.score,
              })
            } else {
              const finalResultOnlyInstruction = `${resultRetryInstruction}\n\n[STEP 3 결과 최종 재생성]\n앞선 출력에서 키워드 블록을 추출할 수 없었습니다. 지금은 결과만 작성하세요. 질문, 반응, 설명, 대화 안내, 다음 단계 안내를 절대 포함하지 마세요. Experience는 감정·행동·공간 각 10개, Relationship은 여섯 관계 각 5개의 줄만 출력하세요.`
              const finalResultOnly = await generateGeminiText({
                apiKey: requiredApiKey,
                messages: modelMessages,
                system: finalResultOnlyInstruction,
              })
              resultCandidates.push(finalResultOnly)
              const finalCandidate = extractStep3KeywordBlock(finalResultOnly, resultKind)
              if (finalCandidate) {
                validatedStep3Text = finalCandidate.text
                step3ResponseReasons = [
                  ...step3ResponseReasons,
                  'selected-final-keyword-candidate',
                ]
                console.warn('[STEP3-DEBUG] final result-only regeneration produced an extractable keyword block', {
                  resultKind,
                  expectedCount,
                  selectedScore: finalCandidate.score,
                })
              } else {
                validatedStep3Text = buildStep3EmergencyResult(resultKind)
                step3ResponseAction = 'fallback'
                step3ResponseReasons = [
                  ...step3ResponseReasons,
                  'result-block-unavailable',
                ]
                console.error('[STEP3-DEBUG] no extractable result block after all retries; using emergency result card', {
                  resultKind,
                  expectedCount,
                  candidateCount: resultCandidates.length,
                })
              }
            }
          }
        }

        let text = isUnrenderableStructuredResponse(
          validatedStep3Text,
          styleProgress?.phase === 'mood_options'
        )
          ? '생성된 시안 이미지와 프로젝트 맥락을 바탕으로 디자인 방향을 준비했습니다.'
          : validatedStep3Text

        if (currentStageKey === 'step_3_persona') {
          text = sanitizeStep3Response({
            messages: conversationMessages,
            phase: getStep3Phase(conversationMessages),
            text,
            progress: step3Progress,
            onResultRemoved: () => {
              step3ResultRemoved = true
            },
          })
          if (step3ResultRemoved && step3Progress && !step3ResultValidationFailed) {
            if (isStep3ResultTurn) {
              const resultKind =
                step3Progress.section === 'experience' ? 'experience' : 'relationship'
              const regeneratedResult = await generateGeminiText({
                apiKey: requiredApiKey,
                messages: modelMessages,
                system: `${finalSystemWithStep3Instruction}\n\n[STEP 3 결과 재생성]\n현재는 결과 출력 차례입니다. 원래 대화 기록과 진행 지시를 유지하고, 결과 형식만 정확히 다시 작성하세요. 키워드 블록 뒤에는 어떤 질문이나 설명도 붙이지 마세요.`,
              })
              if (isValidStep3ResultFormat(regeneratedResult, resultKind)) {
                text = regeneratedResult
                step3ResponseAction = 'regenerate'
              } else {
                console.error('[STEP3-DEBUG] result remained invalid after sanitizer regeneration')
              }
            } else if (
              getStep3Phase(conversationMessages) === 'experience_dialogue' ||
              getStep3Phase(conversationMessages) === 'relationship_dialogue'
            ) {
              const lastUserMessage = [...conversationMessages]
                .reverse()
                .find((message) => message.role === 'user')?.content ?? ''
              text = buildStep3ContextualFallbackQuestion({
                progress: step3Progress,
                project,
                lastUserMessage,
              })
            }
          }
        }

        const shouldAutoCreatePersonaSummary =
          currentStageKey.startsWith('step_3') &&
          hasConfirmedStep3Artifacts(conversationMessages) &&
          hasPersonaDetailAnswer(conversationMessages) &&
          !hasPersonaSummaryText(text) &&
          !hasPersonaCard(conversationMessages)

        if (shouldAutoCreatePersonaSummary) {
          const enrichedText = await enrichPersonaSummary({
            apiKey: requiredApiKey,
            conversation,
            draft: text,
          }).catch((error) => {
            console.error('[STEP 3] Persona Summary 자동 생성 실패:', error)
            return ''
          })

          if (enrichedText && hasPersonaSummaryText(enrichedText)) {
            text = enrichedText
          }
        }
        if (
          currentStageKey === 'step_1_idea' &&
          step1TurnNumber >= 6 &&
          step1TurnNumber <= 9
        ) {
          console.log('[STEP 1 DIAG] 모델 raw 응답:', JSON.stringify(text))
        }
        const styleMoodWidgets =
          currentStageKey === 'step_5_style' &&
          styleProgress?.phase === 'mood_options'
            ? parseStyleMoodWidgets(text)
            : []

        if (!imageBlock && styleMoodWidgets.length > 0) {
          const unsplashKey = getUnsplashAccessKey()

          if (unsplashKey) {
            const widgetImages = await Promise.all(
              styleMoodWidgets.map(async (widget) => {
                const query = getStyleWidgetSearchQuery(widget)
                const [image] = await searchUnsplashPhotos({
                  accessKey: unsplashKey,
                  orientation: 'landscape',
                  perPage: 1,
                  query,
                }).catch((error) => {
                  console.error('[STEP 5] 스타일 분위기 Unsplash 검색 실패:', error)
                  return []
                })

                return image ? { image, query } : null
              })
            )
            const availableImages = widgetImages.filter(
              (result): result is NonNullable<typeof result> => Boolean(result)
            )

            if (availableImages.length > 0) {
              imageBlock = {
                images: availableImages.map(({ image }) => image.url),
                model: 'unsplash',
                prompt: availableImages.map(({ query }) => query).join(' | '),
                purpose: 'style_reference' as const,
                selectedImageIndex: null,
                unsplashMeta: availableImages.map(({ image }) => image),
              }
            }
          }
        }
        assistantContent = appendImageBlockIfPresent({
          imageBlock,
          text,
        })
        const stageMeta = inferStageMetaFromText({
          currentStageKey,
          text: assistantContent,
        })
        const createPersonaCard =
          hasConfirmedStep3Artifacts(conversationMessages) &&
          shouldCreatePersonaCard({
            allowReplacement: isPersonaRevisionMessage,
            currentStageKey,
            hasExistingPersonaCard: hasPersonaCard(conversationMessages),
            text: assistantContent,
          })

        if (createPersonaCard) {
          let personaText = removePrematureStep3Transition(assistantContent)
          let personaData = buildPersonaCardDataFromText(personaText)

          if (!hasDensePersonaCardData(personaData)) {
            const enrichedText = await enrichPersonaSummary({
              apiKey: requiredApiKey,
              conversation,
              draft: personaText,
            }).catch(() => '')
            const enrichedData = enrichedText
              ? buildPersonaCardDataFromText(enrichedText)
              : null

            if (enrichedData && hasDensePersonaCardData(enrichedData)) {
              personaText = enrichedText
              personaData = enrichedData
            }
          }

          assistantContent = appendPersonaCardBlock({
            data: personaData,
            text: [
              personaText,
              '',
              buildPostPersonaKeywordPrompt(),
            ]
              .filter(Boolean)
              .join('\n'),
          })
          responseStageKey = currentStageKey
        } else {
          responseStageKey = directionResearchRequest
            ? 'step_4_direction'
            : stageMeta.transition
              ? stageMeta.nextStageKey
              : stageMeta.currentStageKey
        }
      }

      if (
        currentStageKey === 'step_3_persona' &&
        getStep3Phase(conversationMessages) !== 'persona_followup'
      ) {
        responseStageKey = currentStageKey
      }

      // If the AI included direction widget markers, force stay in step 3
      // (inferStageMetaFromText can falsely detect "STEP 4" in appendDirectionCompletionPrompt)
      if (
        currentStageKey.startsWith('step_3') &&
        /<<AIDEE_DIRECTION_WIDGETS>>/.test(assistantContent)
      ) {
        responseStageKey = 'step_4_direction'
      }

      // Inject style keyword picker only on genuine step_5 entry
      // Guard with currentStageKey to prevent injection during step 3 direction research
      if (
        responseStageKey === 'step_5_style' &&
        currentStageKey === 'step_5_style' &&
        assistantContent.includes('<<AIDEE_KEYWORD_READY>>') &&
        !hasExistingKeywordPicker &&
        !hasStyleKeywordPicker(assistantContent)
      ) {
        const keywords = await generateStyleKeywords(requiredApiKey, conversation)
        assistantContent = assistantContent.replace('<<AIDEE_KEYWORD_READY>>', '').trim()
        assistantContent =
          assistantContent +
          `\n\n<<AIDEE_STYLE_KEYWORD_PICKER>>\n${JSON.stringify(keywords)}\n<</AIDEE_STYLE_KEYWORD_PICKER>>`
      }

      if (
        currentStageKey === 'step_5_cmf' &&
        assistantContent.includes('<<AIDEE_CMF_READY>>')
      ) {
        assistantContent = assistantContent
          .replace('<<AIDEE_CMF_READY>>', '')
          .trim()
        responseStageKey = 'step_5_3d'

        try {
          const modelingImageBlock = MOCK_AI_ENABLED
            ? {
                images: Array.from({ length: 2 }, () => MOCK_IMAGE_URL),
                model: 'mock-ai',
                prompt: 'Mock AI placeholder',
                purpose: 'modeling' as const,
                selectedImageIndex: null,
              }
            : await generateGeminiImages({
                apiKey: requiredApiKey,
                count: 2,
                prompt: buildModelingImagePrompt({
                  conversation,
                  projectTitle: project.title || 'Untitled project',
                  requirements: project.requirements,
                  userRequest: messageForModel,
                }),
                purpose: 'modeling',
                referenceImages: [getSelectedDesignReferenceImage(existingMessages)].filter(
                  (image): image is string => Boolean(image)
                ),
              })
          assistantContent = appendImageBlockIfPresent({
            imageBlock: modelingImageBlock,
            text: assistantContent,
          })
        } catch (err) {
          console.error('3D modeling image generation failed:', err)
          throw new Error('3D 모델링 시안 이미지 생성에 실패했습니다. 다시 시도해 주세요.')
        }
      }
    }

    if (
      step1AssessmentFailed &&
      currentStageKey === 'step_1_idea' &&
      !isInitialEntry &&
      /<<AIDEE_PROJECT_DIRECTION>>|Project Direction|프로젝트\s*Direction/i.test(
        assistantContent
      )
    ) {
      assistantContent =
        'STEP 1 보충 질문을 이어가겠습니다.\n\n제품의 구체적인 모습이나 추가 설명 중 아직 정해지지 않은 내용을 한 가지 알려주세요.'
    }

    if (currentStageKey === 'step_1_idea' && step1TurnNumber === 5 && step1Progress) {
      assistantContent = buildStep1ProjectSummary(project, step1Progress)
    } else if (
      currentStageKey === 'step_1_idea' &&
      step1TurnNumber >= 10 &&
      !hasCompletedStep1 &&
      !canUseStaticProcessConfirmation
    ) {
      assistantContent = buildStep1FinalSummary(project)
    }

    if (
      currentStageKey === 'step_1_idea' &&
      step1TurnNumber >= 6 &&
      step1TurnNumber <= 9
    ) {
      const previousSlot =
        step1ConfirmationAdvanced && step1Progress && step1Progress.confirmation.index > 0
          ? STEP1_CONFIRM_SLOT_KEYS[step1Progress.confirmation.index - 1]
          : null
      const reaction =
        previousSlot && step1Progress
          ? buildStep1ConfirmationReaction({
              slot: previousSlot,
              changedValue: step1ConfirmationChange?.newValue,
              changedLabel: step1ConfirmationChange?.changedLabel,
              confirmedCount: step1Progress.confirmation.index,
            })
          : ''
      const confirmationQuestion = buildStep1FallbackQuestion({
        confirmation: true,
        project,
        slot: STEP1_CONFIRM_SLOTS[step1TurnNumber - 6],
        reaction,
      })
      assistantContent = step1NeedsConfirmationExplanation && assistantContent.trim()
        ? `${assistantContent.trim()}\n\n${confirmationQuestion}`
        : confirmationQuestion
    }

    if (currentStageKey === 'step_1_idea' && step1TurnNumber !== 5 && step1TurnNumber < 10) {
      assistantContent = assistantContent
        .replace(/\s*<<AIDEE_STEP_1_COMPLETE>>\s*/gi, '\n')
        .replace(
          /전체\s*개발\s*프로세스를\s*함께\s*확인해볼까요[?？]?/gi,
          ''
        )
        .trim()
    }

    if (
      currentStageKey === 'step_1_idea' &&
      step1TurnNumber >= 6 &&
      step1TurnNumber <= 9 &&
      isStep1CompletionContent(assistantContent)
    ) {
      assistantContent = buildStep1FallbackQuestion({
        confirmation: true,
        project,
        slot: STEP1_CONFIRM_SLOTS[step1TurnNumber - 6],
        reaction: '',
      })
    }

    if (currentStageKey === 'step_1_idea') {
      assistantContent = assistantContent
        .replace(/\s*<<AIDEE_PROJECT_SUMMARY>>\s*/gi, '\n')
        .trim()
    }

    if (currentStageKey.startsWith('step_3')) {
      if (
        step3Progress &&
        step3Progress.topics[step3Progress.currentTopic].status === 'pending' &&
        !areStep3TopicsComplete(step3Progress, step3Progress.section)
      ) {
        step3Progress = markStep3QuestionIssued(step3Progress)
        await saveStep3Progress({ project, progress: step3Progress, supabase })
      }
      if (process.env.NODE_ENV === 'development') {
        console.log('[STEP3-DEBUG]', {
          currentSubtopic: step3Progress
            ? `${step3Progress.section}.${step3Progress.currentTopic}`
            : null,
          topicProgress: step3Progress?.topics ?? null,
          aiJudgement: step3Judgement,
          responseType: step3Judgement?.responseType ?? null,
          questionMatches: step3Judgement?.questionMatches ?? null,
          responseAction: step3ResponseAction,
          responseValidationReasons: step3ResponseReasons,
          dialogueValidationFailed: step3DialogueValidationFailed,
          resultValidationFailed: step3ResultValidationFailed,
          pendingQuestionKind: step3Progress?.topics[step3Progress.currentTopic].pendingQuestionKind ?? null,
          reaskCount: step3Progress?.topics[step3Progress.currentTopic].reaskCount ?? null,
          rawModelText: step3RawModelText,
          processedText: assistantContent,
          resultBlockRemoved: step3ResultRemoved,
        })
      }
    }

    if (step1Progress && currentStageKey === 'step_1_idea') {
      const responseKind = isInitialEntry
        ? 'card'
        : step1TurnNumber === 5
          ? 'summary'
          : step1TurnNumber >= 1 && step1TurnNumber <= 4
            ? 'supplement-question'
            : null

      step1Progress.askedSlot =
        responseKind === 'supplement-question'
          ? nextStep1SupplementSlot
          : null
      if (responseKind === 'summary') {
        step1Progress.confirmation.index = 0
        step1Progress.confirmation.asked = false
      } else if (
        currentStageKey === 'step_1_idea' &&
        step1TurnNumber >= 6 &&
        step1TurnNumber <= 9
      ) {
        step1Progress.confirmation.asked = true
      } else if (step1TurnNumber >= 10) {
        step1Progress.confirmation.index = STEP1_CONFIRM_SLOT_KEYS.length
        step1Progress.confirmation.asked = false
      }

      await saveStep1Progress({
        project,
        progress: step1Progress,
        supabase,
      })

      console.log('[STEP1-PROGRESS]', {
        responseKind: responseKind ?? 'other',
        askedSlot: step1Progress.askedSlot,
        judgedNextSlot: step1Assessment?.nextSlot ?? null,
        assessmentFailed: step1AssessmentFailed,
        slots: step1Progress.slots,
        confirmation: step1Progress.confirmation,
      })
    }

    if (currentStageKey.startsWith('step_5')) {
      assistantContent = stripStep6InternalNotes(assistantContent)
    }

    if (currentStageKey === 'step_5_style') {
      const step5WidgetKind = shouldShowStep5Widget({
        currentStageKey,
        messages: [
          ...existingMessages,
          ...(savedUserMessage ? [savedUserMessage] : []),
        ],
        text: assistantContent,
      })

      if (
        step5WidgetKind &&
        !assistantContent.includes(STEP5_WIDGET_MARKERS[step5WidgetKind])
      ) {
        assistantContent = `${assistantContent.trim()}\n\n${STEP5_WIDGET_MARKERS[step5WidgetKind]}`
      }
    }

    if (styleKeywordSelections) {
      assistantContent = `${assistantContent.trim()}\n\n<<AIDEE_STYLE_KEYWORDS_SELECTED>>\n${JSON.stringify(styleKeywordSelections)}\n<</AIDEE_STYLE_KEYWORDS_SELECTED>>`
    }

    if (currentStageKey === 'step_4_direction' && process.env.NODE_ENV === 'development') {
      const displayText = assistantContent
        .replace(/\n?<<AIDEE_DIRECTION_WIDGETS>>[\s\S]*?<<\/AIDEE_DIRECTION_WIDGETS>>/gi, '')
        .trim()
      console.log('[STEP4-DEBUG]', {
        rawModelText: step4RawModelText || null,
        displayText,
        responseStageKey,
      })
    }

    // TEMP CARD DEBUG: 저장 직전 최종 응답 분기와 내용 길이입니다.
    console.log('[CARD-DEBUG] final response branch', {
      projectId,
      requestNumber: cardDebugRequestNumber,
      branch: cardDebugResponseBranch,
      isInitialEntry,
      currentStageKey,
      responseStageKey,
      contentLength: assistantContent.length,
      hasProjectDirectionMarker: /<<AIDEE_PROJECT_DIRECTION>>/i.test(
        assistantContent
      ),
    })

    if (
      currentStageKey === 'step_1_idea' &&
      step1TurnNumber >= 6 &&
      step1TurnNumber <= 9
    ) {
      console.log(
        '[STEP 1 DIAG] 저장 직전 응답:',
        JSON.stringify(assistantContent)
      )
    }

    const step4ResearchSplit = currentStageKey === 'step_4_direction'
      ? splitStep4ResearchResponse(assistantContent)
      : null
    if (step4ResearchSplit && process.env.NODE_ENV === 'development') {
      console.log('[STEP4-DEBUG] response split', {
        intro: step4ResearchSplit.intro,
        result: step4ResearchSplit.result,
        followUp: step4ResearchSplit.followUp,
      })
    }

    const splitResult = step3ResultSection
      ? splitStep3ResultResponse(assistantContent, step3ResultSection)
      : null
    const assistantParts = splitResult
      ? [splitResult.reaction, splitResult.result].filter(Boolean)
      : step4ResearchSplit
        ? [
            step4ResearchSplit.intro,
            step4ResearchSplit.result,
            step4ResearchSplit.followUp,
          ].filter(Boolean)
      : assistantContent
          .split(/<<AIDEE_MESSAGE_BREAK>>/i)
          .map((part) => part.trim())
          .filter(Boolean)
    const contentsToSave = assistantParts.length > 0
      ? assistantParts
      : assistantContent.trim()
        ? [assistantContent]
        : []
    const assistantMessages = []

    for (const [index, content] of contentsToSave.entries()) {
      assistantMessages.push(
        await insertProjectMessage({
          availableActions:
            currentStageKey === 'step_1_idea' &&
            step1TurnNumber >= 10 &&
            isStep1CompletionContent(content)
              ? ['confirm_process']
              : requestedAction === 'confirm_process' &&
            index === contentsToSave.length - 1
              ? ['start_step_2', 'stay_in_step_1']
              : requestedAction === 'confirm_step_2_team' &&
                  index === contentsToSave.length - 1
                ? ['start_step_3', 'stay_in_step_2']
              : undefined,
          content,
          projectId,
          role: 'assistant',
          seqOrder: nextSeqOrder + (savedUserMessage ? 1 : 0) + index,
          stageKey: responseStageKey,
          supabase,
          userId: user.id,
        })
      )
    }

    const assistantMessage = assistantMessages.at(-1) ?? null

    return NextResponse.json({
      currentStageKey,
      message: assistantMessage,
      messages: assistantMessages,
      nextStageKey: responseStageKey,
      userMessage: savedUserMessage,
    })
  } catch (error) {
    const message = getErrorMessage(error)
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
