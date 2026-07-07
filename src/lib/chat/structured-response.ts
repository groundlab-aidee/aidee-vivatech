export const CHAT_STAGE_VALUES = [
  'STEP_0_START',
  'STEP_1_IDEA',
  'STEP_2_PERSONA',
  'STEP_2_RESEARCH',
  'STEP_3_DIRECTION',
  'STEP_4_STYLE',
  'STEP_5_DESIGN',
  'STEP_6_RFP',
  'STEP_7_COMPANY',
] as const

export type ChatStage = (typeof CHAT_STAGE_VALUES)[number]

export const CHAT_INTENT_VALUES = [
  'PRESENT_PROJECT_DIRECTION',
  'REQUEST_PROJECT_DETAILS',
  'SHOW_PROCESS_CONFIRMATION',
  'REVIEW_DEVELOPMENT_PROCESS',
  'REQUEST_STEP_1_START',
  'START_STEP_1',
  'ASK_STEP_1_REQUIREMENT',
  'PRESENT_STEP_1_SUMMARY',
  'REQUEST_STEP_2_TRANSITION',
  'CONTINUE_TO_STEP_2',
  'ADD_PROJECT_CONTEXT',
  'ADD_STEP_1_CONTEXT',
  'GENERAL_RESPONSE',
] as const

export type ChatIntent = (typeof CHAT_INTENT_VALUES)[number]

export function parseChatIntent(value: unknown): ChatIntent | null {
  return isEnumValue(CHAT_INTENT_VALUES, value) ? value : null
}

export const CHAT_ACTION_VALUES = [
  'SHOW_PROJECT_DIRECTION',
  'SHOW_REVIEW_PROCESS_BUTTON',
  'SHOW_STAGE_PROCEED_BUTTONS',
  'SHOW_HINT_BUTTON',
] as const

export type ChatAction = (typeof CHAT_ACTION_VALUES)[number]

export type ProjectDirectionMetadata = {
  budgetAndDuration: string
  category: string
  features: string
  goal: string
  ideaSummary: string
  referenceSummary: string
  size: string
  title: string
  usage: string
}

export type StructuredChatMetadata = {
  projectDirection?: ProjectDirectionMetadata
}

export type StructuredChatResponse = {
  actions: ChatAction[]
  intent: ChatIntent
  message: string
  metadata: StructuredChatMetadata
  stage: ChatStage
}

export type LegacyStageKey =
  | 'step_0_start'
  | 'step_1_idea'
  | 'step_2_persona'
  | 'step_2_research'
  | 'step_3_direction'
  | 'step_4_style'
  | 'step_5_design'
  | 'step_6_rfp'
  | 'step_6_company'

const STRUCTURED_RESPONSE_BLOCK = 'AIDEE_STRUCTURED_RESPONSE'

const STAGE_TO_LEGACY: Record<ChatStage, LegacyStageKey> = {
  STEP_0_START: 'step_0_start',
  STEP_1_IDEA: 'step_1_idea',
  STEP_2_PERSONA: 'step_2_persona',
  STEP_2_RESEARCH: 'step_2_research',
  STEP_3_DIRECTION: 'step_3_direction',
  STEP_4_STYLE: 'step_4_style',
  STEP_5_DESIGN: 'step_5_design',
  STEP_6_RFP: 'step_6_rfp',
  STEP_7_COMPANY: 'step_6_company',
}

const LEGACY_TO_STAGE = Object.fromEntries(
  Object.entries(STAGE_TO_LEGACY).map(([stage, legacy]) => [legacy, stage])
) as Record<LegacyStageKey, ChatStage>

export const STEP_0_1_RESPONSE_JSON_SCHEMA = {
  type: 'object',
  properties: {
    message: { type: 'string' },
    stage: { type: 'string', enum: ['STEP_0_START', 'STEP_1_IDEA'] },
    intent: {
      type: 'string',
      enum: [
        'REQUEST_PROJECT_DETAILS',
        'SHOW_PROCESS_CONFIRMATION',
        'REVIEW_DEVELOPMENT_PROCESS',
        'REQUEST_STEP_1_START',
        'START_STEP_1',
        'ASK_STEP_1_REQUIREMENT',
        'PRESENT_STEP_1_SUMMARY',
        'REQUEST_STEP_2_TRANSITION',
        'ADD_PROJECT_CONTEXT',
        'ADD_STEP_1_CONTEXT',
        'GENERAL_RESPONSE',
      ],
    },
    actions: {
      type: 'array',
      items: {
        type: 'string',
        enum: [
          'SHOW_REVIEW_PROCESS_BUTTON',
          'SHOW_STAGE_PROCEED_BUTTONS',
          'SHOW_HINT_BUTTON',
        ],
      },
    },
    metadata: { type: 'object', properties: {} },
  },
  required: ['message', 'stage', 'intent', 'actions', 'metadata'],
} as const

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function isEnumValue<T extends readonly string[]>(
  values: T,
  value: unknown
): value is T[number] {
  return typeof value === 'string' && values.includes(value)
}

function parseProjectDirectionMetadata(
  value: unknown
): ProjectDirectionMetadata | undefined {
  if (!isRecord(value)) return undefined
  const fields: Array<keyof ProjectDirectionMetadata> = [
    'budgetAndDuration',
    'category',
    'features',
    'goal',
    'ideaSummary',
    'referenceSummary',
    'size',
    'title',
    'usage',
  ]
  if (!fields.every((field) => typeof value[field] === 'string')) {
    return undefined
  }

  return Object.fromEntries(
    fields.map((field) => [field, value[field]])
  ) as ProjectDirectionMetadata
}

export function parseStructuredChatResponse(
  value: unknown
): StructuredChatResponse | null {
  if (!isRecord(value)) return null
  if (typeof value.message !== 'string' || !value.message.trim()) return null
  if (!isEnumValue(CHAT_STAGE_VALUES, value.stage)) return null
  if (!isEnumValue(CHAT_INTENT_VALUES, value.intent)) return null
  if (
    !Array.isArray(value.actions) ||
    !value.actions.every((action) => isEnumValue(CHAT_ACTION_VALUES, action))
  ) {
    return null
  }

  const rawMetadata = isRecord(value.metadata) ? value.metadata : {}
  const projectDirection = parseProjectDirectionMetadata(
    rawMetadata.projectDirection
  )

  return {
    actions: [...new Set(value.actions)],
    intent: value.intent,
    message: value.message.trim(),
    metadata: projectDirection ? { projectDirection } : {},
    stage: value.stage,
  }
}

export function appendStructuredResponseBlock(
  response: StructuredChatResponse
) {
  return `${response.message}\n\n<<${STRUCTURED_RESPONSE_BLOCK}>>\n${JSON.stringify(response)}\n<</${STRUCTURED_RESPONSE_BLOCK}>>`
}

export function extractStructuredResponseBlock(text: string) {
  const expression = new RegExp(
    `<<${STRUCTURED_RESPONSE_BLOCK}>>\\s*([\\s\\S]*?)\\s*<</${STRUCTURED_RESPONSE_BLOCK}>>`,
    'i'
  )
  const match = text.match(expression)

  if (!match) {
    return { cleanedText: text.trim(), response: null }
  }

  let response: StructuredChatResponse | null = null
  try {
    response = parseStructuredChatResponse(JSON.parse(match[1]))
  } catch {
    response = null
  }

  return {
    cleanedText: text.replace(expression, '').trim(),
    response,
  }
}

export function toLegacyStageKey(stage: ChatStage): LegacyStageKey {
  return STAGE_TO_LEGACY[stage]
}

export function toChatStage(stage: LegacyStageKey): ChatStage {
  return LEGACY_TO_STAGE[stage]
}

export function resolveStageFromClientIntent({
  clientIntent,
  currentStage,
}: {
  clientIntent: ChatIntent | null
  currentStage: LegacyStageKey
}): LegacyStageKey {
  if (clientIntent === 'START_STEP_1') return 'step_1_idea'
  if (clientIntent === 'CONTINUE_TO_STEP_2') return 'step_2_persona'
  return currentStage
}

export function deriveLegacyStructuredResponse({
  currentStage,
  message,
}: {
  currentStage: LegacyStageKey
  message: string
}): StructuredChatResponse {
  const normalized = message.replace(/\s+/g, ' ').trim()
  const actions: ChatAction[] = []
  let intent: ChatIntent = 'GENERAL_RESPONSE'

  if (
    /프로세스|process/i.test(normalized) &&
    /확인하기|확인해\s*볼까요|확인할까요|review|check|walk through|go through|look at/i.test(
      normalized
    )
  ) {
    intent = 'SHOW_PROCESS_CONFIRMATION'
    actions.push('SHOW_REVIEW_PROCESS_BUTTON')
  } else if (
    /STEP\s*1/i.test(normalized) &&
    /진행할까요|시작할까요|넘어가겠습니다|start|begin|proceed|move/i.test(
      normalized
    )
  ) {
    intent = 'REQUEST_STEP_1_START'
    actions.push('SHOW_STAGE_PROCEED_BUTTONS')
  } else if (
    currentStage === 'step_1_idea' &&
    /핵심\s*아이디어와\s*개발\s*조건이\s*정리|core idea and development requirements/i.test(
      normalized
    )
  ) {
    intent = 'REQUEST_STEP_2_TRANSITION'
    actions.push('SHOW_STAGE_PROCEED_BUTTONS')
  } else if (/[?？]\s*$/.test(normalized)) {
    intent = currentStage === 'step_1_idea'
      ? 'ASK_STEP_1_REQUIREMENT'
      : 'REQUEST_PROJECT_DETAILS'
    actions.push('SHOW_HINT_BUTTON')
  }

  return {
    actions,
    intent,
    message: message.trim(),
    metadata: {},
    stage: toChatStage(currentStage),
  }
}

export function isStepZeroOrOne(stage: LegacyStageKey) {
  return stage === 'step_0_start' || stage === 'step_1_idea'
}
