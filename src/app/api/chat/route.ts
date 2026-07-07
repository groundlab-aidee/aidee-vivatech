import { NextResponse } from 'next/server'

import {
  buildInitialUserPrompt,
  buildReferenceGuidelineBlock,
  buildSystemPrompt,
} from '@/lib/chat/context'
import { isExpertKey, type ExpertKey } from '@/lib/chat/experts'
import {
  appendImageBlockIfPresent,
  generateGeminiImages,
  generateGeminiJson,
  generateGeminiText,
  getGeminiApiKey,
  type GeminiMessage,
} from '@/lib/chat/gemini'
import {
  appendRfpJsonBlock,
  buildRfpPrompt,
  extractRfpJsonBlock,
  formatRfpMarkdown,
  parseRfpDocument,
  stripCodeFence,
} from '@/lib/chat/rfp'
import {
  DEFAULT_STAGE_KEY,
  hasStyleReferenceSelection,
  inferStageMetaFromText,
  isKnownStageKey,
  resolveIntentStageKey,
  type StageKey,
} from '@/lib/chat/stages'
import {
  getProjectForUser,
  getProjectMessages,
  getReferenceImages,
  insertProjectMessage,
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
import {
  isEnglishChat,
  normalizeChatLanguage,
  type ChatLanguage,
} from '@/lib/chat/language'
import { buildStepZeroOnePrompt } from '@/lib/chat/prompts/step-0-1'
import {
  appendStructuredResponseBlock,
  deriveLegacyStructuredResponse,
  isStepZeroOrOne,
  parseChatIntent,
  parseStructuredChatResponse,
  resolveStageFromClientIntent,
  STEP_0_1_RESPONSE_JSON_SCHEMA,
  toChatStage,
  type StructuredChatResponse,
} from '@/lib/chat/structured-response'

export const maxDuration = 60

type ChatRequestBody = {
  activeExpert?: unknown
  clientIntent?: unknown
  currentStageKey?: unknown
  forceImageGeneration?:
    | 'design_revision'
    | 'initial_design'
    | 'persona_card'
    | 'style_reference'
  message?: unknown
  language?: unknown
  projectId?: unknown
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

function authorizeClientIntent({
  currentStage,
  messages,
  requestedIntent,
}: {
  currentStage: StageKey
  messages: Awaited<ReturnType<typeof getProjectMessages>>
  requestedIntent: ReturnType<typeof parseChatIntent>
}) {
  if (!requestedIntent) return null

  const latestAssistant = [...messages]
    .reverse()
    .find((message) => message.role === 'assistant')
  if (!latestAssistant) return null

  const response =
    latestAssistant.structuredResponse ??
    deriveLegacyStructuredResponse({
      currentStage,
      message: latestAssistant.content,
    })

  if (
    requestedIntent === 'REVIEW_DEVELOPMENT_PROCESS' &&
    response.actions.includes('SHOW_REVIEW_PROCESS_BUTTON')
  ) {
    return requestedIntent
  }

  if (
    (requestedIntent === 'START_STEP_1' ||
      requestedIntent === 'ADD_PROJECT_CONTEXT') &&
    response.intent === 'REQUEST_STEP_1_START' &&
    response.actions.includes('SHOW_STAGE_PROCEED_BUTTONS')
  ) {
    return requestedIntent
  }

  if (
    (requestedIntent === 'CONTINUE_TO_STEP_2' ||
      requestedIntent === 'ADD_STEP_1_CONTEXT') &&
    response.intent === 'REQUEST_STEP_2_TRANSITION' &&
    response.actions.includes('SHOW_STAGE_PROCEED_BUTTONS')
  ) {
    return requestedIntent
  }

  return null
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

function isPersonaCardVisualizationRequest(text: string) {
  return (
    /페르소나|persona/i.test(text) &&
    /시각화|이미지|visuali[sz]e|image|그려|보여줘/i.test(text)
  )
}

function isPersonaCardConfirmRequest(text: string) {
  return /페르소나\s*카드.*확정|persona\s*card.*confirm|confirm.*persona\s*card/i.test(text)
}

function isPersonaCardRevisionRequest(text: string) {
  return /페르소나\s*카드\s*(?:수정|다시\s*생성|재생성)|persona\s*card\s*(?:edit|revise|regenerate)|(?:edit|revise|regenerate).*persona\s*card/i.test(
    text
  )
}

function isRfpConfirmRequest(text: string) {
  return /(?:프로젝트\s*)?기획안.*확정|project\s*(?:plan|report).*confirm|confirm.*project\s*(?:plan|report)/i.test(
    text
  )
}

function isRfpRevisionRequest(text: string) {
  return /(?:프로젝트\s*)?기획안.*(?:수정|다시\s*생성|재생성)|project\s*(?:plan|report).*(?:edit|revise|regenerate)|(?:edit|revise|regenerate).*project\s*(?:plan|report)/i.test(
    text
  )
}

function buildPostPersonaKeywordPrompt(language: ChatLanguage) {
  return isEnglishChat(language) ? [
    'The Persona Card has been generated.', '',
    'Review it, then regenerate or confirm it.',
    'Visualization becomes available after confirmation.',
  ].join('\n') : [
    'Persona Card를 생성했습니다.',
    '',
    '내용을 확인한 뒤 다시 생성하거나 확정할 수 있습니다.',
    '확정하면 시각화하기가 활성화됩니다.',
  ].join('\n')
}

function buildPersonaConfirmedPrompt(language: ChatLanguage) {
  return isEnglishChat(language) ? [
    'The Persona Card has been confirmed.', '',
    'STEP 2 is complete: Problem Statements, Keywords: Experience, Keywords: Relationship, and Persona Card.',
    'You are ready to move to STEP 3: Development Direction.',
  ].join('\n') : [
    '페르소나 카드를 확정했습니다.',
    '',
    'STEP 2의 모든 과정(Problem Statements, Keywords: Experience, Keywords: Relationship, Persona Card)이 완료되었습니다.',
    'STEP 3 개발 방향성 도출로 넘어갈 준비가 되었습니다.',
  ].join('\n')
}

function buildRfpConfirmedPrompt(language: ChatLanguage) {
  return isEnglishChat(language) ? [
    'The project plan has been confirmed.', '',
    'You can now visualize the confirmed content as a Project Report.',
  ].join('\n') : [
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

function hasCompletedStep1(messages: Array<{ content: string }>) {
  return messages.some((m) =>
    /핵심\s*아이디어와\s*개발\s*조건이\s*정리되었습니다|STEP\s*2\.\s*사용자\s*명확화\s*단계로\s*넘어가겠습니다|core idea and development requirements have been organized|move (?:on )?to STEP\s*2/i.test(
      m.content
    )
  )
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
  ].some((pattern) => pattern.test(content))
}

function isDirectionResearchRequest(text: string) {
  return /(?:시장\s*규모|소비\s*트렌드|경쟁사)\s*리서치\s*(?:보기|다시\s*생성하기)|(?:(?:view|open|regenerate)\s*)?(?:market sizing|consumer trends?|competitor)(?:\s*research)?|(?:market sizing|consumer trends?|competitor)(?:\s*research)?\s*(?:view|open|regenerate)/i.test(
    text
  )
}

function isExplicitStep4ProceedRequest(text: string) {
  // Triggers Unsplash moodboard_candidate search — only when user explicitly selects a style mood
  return /스타일\s*분위기를\s*선택했어요|I selected (?:a|the) style mood/i.test(text)
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

const STYLE_KEYWORD_FALLBACKS_EN = {
  emotional: [
    'Calm', 'Comforting', 'Stable', 'Warm', 'Serene', 'Fresh', 'Playful', 'Organized',
    'Energetic', 'Immersive', 'Delicate', 'Soft', 'Refined', 'Trustworthy', 'Friendly',
    'Sensory', 'Reassuring', 'Empowering', 'Distinctive', 'Inspiring',
  ],
  color: [
    'Clear', 'Warm', 'Cool', 'Neutral', 'Vivid', 'Subtle', 'Deep', 'Transparent',
    'Natural', 'Modern', 'Vintage', 'Pop', 'Dark', 'Bright', 'Earthy', 'Metallic',
    'Pastel', 'Monochrome', 'Primary', 'Gradient',
  ],
  structure: [
    'Simple', 'Linear', 'Curved', 'Geometric', 'Asymmetric', 'Symmetric', 'Minimal',
    'Structural', 'Organic', 'Angular', 'Rounded', 'Sharp', 'Bold', 'Slim', 'Layered',
    'Modular', 'Compact', 'Open', 'Enclosed', 'Robust',
  ],
  texture: [
    'Soft', 'Rough', 'Smooth', 'Warm', 'Cool', 'Matte', 'Glossy', 'Natural',
    'Synthetic', 'Metallic', 'Woodgrain', 'Rubberized', 'Textile', 'Foam-like',
    'Crystalline', 'Weighty', 'Lightweight', 'Elastic', 'Rigid', 'Flexible',
  ],
} as const

async function generateStyleKeywords(
  apiKey: string,
  conversation: string,
  language: ChatLanguage
): Promise<{
  emotional: string[]
  color: string[]
  structure: string[]
  texture: string[]
}> {
  const source = isEnglishChat(language)
    ? STYLE_KEYWORD_FALLBACKS_EN
    : STYLE_KEYWORD_FALLBACKS
  const fallback = {
    emotional: [...source.emotional],
    color: [...source.color],
    structure: [...source.structure],
    texture: [...source.texture],
  }

  if (!apiKey) return fallback

  const prompt = isEnglishChat(language) ? [
    'You are a product-design style consultant.',
    'Analyze the project conversation and generate exactly 20 concise English adjective keywords for each style category.',
    '',
    'Return only valid JSON in this exact shape:',
    '{"emotional":["keyword1",...],"color":[...],"structure":[...],"texture":[...]}',
    '',
    'Use one- or two-word English descriptors. Include a varied, project-relevant spectrum.',
    '',
    'Project conversation:',
    conversation.slice(0, 2500),
  ].join('\n') : [
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

function appendDirectionCompletionPrompt(text: string, language: ChatLanguage) {
  if (/STEP\s*4|스타일\s*컨셉.*(?:넘어|진행)|진행할까요|style concept.*(?:proceed|move)|shall we proceed/i.test(text)) {
    return text
  }

  return isEnglishChat(language) ? [
    text,
    '',
    'The selected research is complete.',
    'You can review another direction-research area, or move to STEP 4: Style Concept if you have enough information. Would you like to continue?',
  ].join('\n') : [
    text,
    '',
    '선택한 리서치가 완료되었습니다.',
    '다른 개발 방향성 리서치도 확인할 수 있습니다. 현재 정보가 충분하다면 다음 STEP 4. 스타일 컨셉 도출 단계로 진행할까요?',
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
    !currentStageKey.startsWith('step_2')
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
  language,
}: {
  apiKey: string
  conversation: string
  draft: string
  language: ChatLanguage
}) {
  const english = isEnglishChat(language)
  return generateGeminiText({
    apiKey,
    messages: [
      {
        role: 'user',
        content: english ? [
          'Rewrite the persona summary below for a product-planning persona card using the conversation and draft.',
          'Preserve user-provided facts and infer only plausible missing details from the product and usage context.',
          'Do not include placeholders, empty items, questions, UI instructions, or next-step guidance.',
          '',
          'Use exactly these headings: Demographic Info, Persona Story, Problem & Needs, Current Behavior, Lifestyle Context, Relationship Keyword.',
          'Demographic Info must have 5 bullet points. Persona Story must be a substantial 3–4 line paragraph. Every remaining section must have 5 distinct bullet points.',
          '',
          `Conversation:\n${conversation.slice(-10000)}`,
          '',
          `Current draft:\n${draft}`,
        ].join('\n') : [
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
    system: english
      ? 'You are a user researcher who structures conversations into concise, professional English persona-card content. Output only the requested format.'
      : '당신은 사용자 대화를 제품 기획용 페르소나 카드 문구로 구조화하는 사용자 리서처입니다. 지정된 형식만 출력합니다.',
  })
}

function removePrematureStep3Transition(text: string) {
  if (!/STEP\s*3|다음\s*단계|넘어가|next step|move (?:on )?to/i.test(text)) {
    return text
  }

  return text
    .split('\n')
    .filter(
      (line) =>
        !/STEP\s*3|다음\s*단계|넘어가겠습니다|넘어갈지|진행할까요|next step|move (?:on )?to|shall we proceed/i.test(line)
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

const REQUIREMENT_VALUE_EN: Record<string, string> = {
  '아이디어 구체화': 'Refine the idea',
  '2D·3D 시각화': '2D / 3D visualization',
  '시제품 제작 및 사업화': 'Prototype development and commercialization',
  조명: 'Lighting',
  '인테리어 소품': 'Home decor',
  가구: 'Furniture',
  '패션·악세서리': 'Fashion & accessories',
  '디지털 기기': 'Digital devices',
  '단순 구조물': 'Simple structure',
  '빛·색 변화': 'Light or color changes',
  '센서 감지': 'Sensor detection',
  '조립·분해 가능': 'Easy assembly and disassembly',
  'IoT / 스마트 기능': 'IoT / smart features',
  '손바닥 크기 (10cm 이내)': 'Palm-sized (within 10 cm)',
  '소형 (10~50cm)': 'Small (10–50 cm)',
  '중형 (50~100cm)': 'Medium (50–100 cm)',
  '대형 (100cm 이상)': 'Large (over 100 cm)',
  '아직 못 정했어요': 'Not decided yet',
  '개인 소장 및 전시용': 'Personal use or display',
  '대량 판매': 'Mass-market sales',
  '크라우드 펀딩': 'Crowdfunding',
  '브랜드 런칭': 'Brand launch',
  '1주': '1 week',
  '2주': '2 weeks',
  '1개월': '1 month',
  '3개월': '3 months',
  '6개월': '6 months',
  '1년': '1 year',
  '1년 +': 'More than 1 year',
}

function localizeRequirementValue(value: string, language: ChatLanguage) {
  return isEnglishChat(language) ? REQUIREMENT_VALUE_EN[value] ?? value : value
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

function formatRequirementList(
  requirements: Record<string, unknown>,
  key: string,
  otherKey?: string,
  language: ChatLanguage = 'KOR'
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

  const localized = values.map((item) => localizeRequirementValue(item, language))
  return localized.length > 0
    ? localized.join(', ')
    : otherValue || (isEnglishChat(language) ? 'Not decided' : '미정')
}

function formatBudgetValue(value: unknown, language: ChatLanguage) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return null
  }

  if (value >= 10000) {
    return isEnglishChat(language) ? '₩100M+' : '1억 원'
  }

  return isEnglishChat(language)
    ? `₩${value / 100}M`
    : `${value.toLocaleString('ko-KR')}만 원`
}

function formatBudgetRange(
  requirements: Record<string, unknown>,
  language: ChatLanguage
) {
  const minBudget = formatBudgetValue(requirements.minBudget, language)
  const maxBudget = formatBudgetValue(requirements.maxBudget, language)

  if (minBudget && maxBudget) {
    return `${minBudget} ~ ${maxBudget}`
  }

  return minBudget || maxBudget || (isEnglishChat(language) ? 'Not decided' : '미정')
}

function summarizeIdeaText(
  requirements: Record<string, unknown>,
  language: ChatLanguage
) {
  const idea = cleanSingleLineText(getRequirementString(requirements, 'idea', ''))

  if (!idea) {
    return isEnglishChat(language)
      ? 'The product idea has not been described in enough detail yet.'
      : '아직 아이디어 텍스트가 충분히 입력되지 않았습니다.'
  }

  if (isEnglishChat(language)) {
    return idea
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
  project: Awaited<ReturnType<typeof getProjectForUser>>,
  language: ChatLanguage
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
  const generatedSummaryRaw = getRequirementString(generated, 'summary', '')
  // The generated summary is produced in Korean at project-creation time, so
  // skip it in English mode when it still contains Hangul and fall back to the
  // language-aware summary instead.
  const generatedSummary =
    isEnglishChat(language) && /[가-힣]/.test(generatedSummaryRaw)
      ? ''
      : generatedSummaryRaw
  const undecided = isEnglishChat(language) ? 'Not decided' : '미정'
  const budgetRange = formatBudgetRange(requirements, language)
  const duration = localizeRequirementValue(
    getRequirementString(requirements, 'duration', undecided),
    language
  )
  const budgetAndDuration =
    budgetRange === undecided && duration === undecided
      ? undecided
      : `${budgetRange} / ${duration}`

  return {
    budgetAndDuration,
    category: formatRequirementList(requirements, 'categories', 'otherCategory', language),
    features: formatRequirementList(requirements, 'features', 'otherFeature', language),
    goal: localizeRequirementValue(getRequirementString(requirements, 'goal', undecided), language),
    ideaSummary: generatedSummary || summarizeIdeaText(requirements, language),
    size: localizeRequirementValue(getRequirementString(requirements, 'size', undecided), language),
    title: project?.title || (isEnglishChat(language) ? 'New Project' : '새 프로젝트'),
    usage: localizeRequirementValue(getRequirementString(requirements, 'usage', undecided), language),
  }
}

function buildProjectCardResponse({
  language,
  project,
  referenceImages,
}: {
  language: ChatLanguage
  project: Awaited<ReturnType<typeof getProjectForUser>>
  referenceImages: Awaited<ReturnType<typeof getReferenceImages>>
}) {
  const snapshot = buildProjectStartSnapshot(project, language)
  const english = isEnglishChat(language)
  const referenceSummary =
    referenceImages.length > 0
      ? english
        ? `${referenceImages.length} reference image${referenceImages.length === 1 ? ' has' : 's have'} been uploaded.`
        : `${referenceImages.length}개 참고 이미지가 업로드되어 있습니다.`
      : english
        ? 'No reference images have been uploaded yet.'
        : '업로드된 참고 이미지는 아직 없습니다.'
  const referenceGuidelines = buildReferenceGuidelineBlock(referenceImages, language)
  const referenceDirection =
    referenceImages.length > 0
      ? english ? [
          'Priority directions from the reference images', '', referenceGuidelines, '',
          'Does this summary capture your current idea?',
          'Please describe any specific form, color, material, usage scene, or other detail you already have in mind.',
        ] : [
          '레퍼런스 이미지에서 우선 참고해야 할 방향',
          '',
          referenceGuidelines,
          '',
          '이 요약이 현재 아이디어를 잘 담고 있나요?',
          '혹시 예상하고 있는 제품의 구체적인 모습이나 보충하고 싶은 설명이 있다면 자유롭게 말씀해주세요.',
        ]
      : english ? [
          'Priority directions from the reference images', '',
          'There are no uploaded reference images yet, so we will use your survey responses as the starting point.', '',
          'Please describe any specific form, color, material, usage scene, or other detail you already have in mind.',
        ] : [
          '레퍼런스 이미지에서 우선 참고해야 할 방향',
          '',
          '아직 업로드된 참고 이미지가 없어, 설문 내용을 기준으로 방향을 잡겠습니다.',
          '',
          '예상하고 있는 제품의 구체적인 모습이나 보충하고 싶은 설명이 있다면 자유롭게 말씀해주세요.',
        ]

  const message = english
    ? [
      'A new project has been created.',
      "The Aidee team summarized the information saved so far to help develop your idea.", '',
      '<<AIDEE_PROJECT_DIRECTION>>', 'Project Direction', '',
      '**Project Name**', snapshot.title, '', '**Project Goal**', snapshot.goal, '',
      '**Product Category**', snapshot.category, '', '**Budget / Timeline**', snapshot.budgetAndDuration, '',
      '**Estimated Size**', snapshot.size, '', '**Key Features**', snapshot.features, '',
      '**Final Purpose**', snapshot.usage, '', '**Idea Summary**', snapshot.ideaSummary, '',
      '**References**', referenceSummary, '<</AIDEE_PROJECT_DIRECTION>>', '', ...referenceDirection,
    ].join('\n')
    : [
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

  return {
    actions: ['SHOW_PROJECT_DIRECTION', 'SHOW_HINT_BUTTON'],
    intent: 'REQUEST_PROJECT_DETAILS',
    message,
    metadata: {
      projectDirection: { ...snapshot, referenceSummary },
    },
    stage: 'STEP_0_START',
  } satisfies StructuredChatResponse
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
    'Create a polished product design visualization.',
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
    '- realistic product concept/render image',
    '- no text overlay, no UI, no watermark',
  ].join('\n')
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
  language,
  messages,
  project,
  referenceImages,
}: {
  apiKey: string
  language: ChatLanguage
  messages: GeminiMessage[]
  project: NonNullable<Awaited<ReturnType<typeof getProjectForUser>>>
  referenceImages: Awaited<ReturnType<typeof getReferenceImages>>
}) {
  const rfpJsonText = await generateGeminiText({
    apiKey,
    messages: [
      {
        content: buildRfpPrompt({ language, messages, project, referenceImages }),
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
    text: [
      isEnglishChat(language)
        ? 'STEP 6. Evaluation and Product Development Plan'
        : 'STEP 6. 평가 및 제품개발 기획안 생성',
      '',
      formatRfpMarkdown(parsed, language).replace(
        isEnglishChat(language) ? /^# Project Plan\n+/ : /^# 프로젝트 기획안\n+/,
        ''
      ),
    ].join('\n'),
  })
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ChatRequestBody
    const language = normalizeChatLanguage(body.language)
    const projectId = typeof body.projectId === 'string' ? body.projectId : ''

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
    const activeExpert = normalizeExpert(body.activeExpert)
    const clientIntent = authorizeClientIntent({
      currentStage: requestedStageKey,
      messages: existingMessages,
      requestedIntent: parseChatIntent(body.clientIntent),
    })
    const userMessage = typeof body.message === 'string' ? body.message.trim() : ''
    const isForcedGeneration = Boolean(body.forceImageGeneration)
    const hasAssistantMessage = existingMessages.some(
      (message) => message.role === 'assistant'
    )
    const isInitialEntry = !hasAssistantMessage && !userMessage
    const messageForModel = isInitialEntry
      ? buildInitialUserPrompt(project, language)
      : userMessage || (isForcedGeneration
          ? isEnglishChat(language) ? 'Generate visualization' : '시각화 생성 요청'
          : '')
    const isPersonaConfirmMessage =
      !isInitialEntry && isPersonaCardConfirmRequest(messageForModel)
    const isPersonaRevisionMessage =
      !isInitialEntry && isPersonaCardRevisionRequest(messageForModel)
    const canUseStaticPersonaConfirmation =
      isPersonaConfirmMessage && requestedStageKey.startsWith('step_2')
    const isRfpConfirmMessage =
      !isInitialEntry && isRfpConfirmRequest(messageForModel)
    const isRfpRevisionMessage =
      !isInitialEntry && isRfpRevisionRequest(messageForModel)
    const canUseStaticRfpConfirmation =
      isRfpConfirmMessage && requestedStageKey === 'step_6_rfp'

    if (!messageForModel) {
      return NextResponse.json({ error: 'message is required' }, { status: 400 })
    }

    const directionResearchRequest = isDirectionResearchRequest(messageForModel)
    const legacyResolvedStageKey = resolveIntentStageKey({
      currentStageKey: directionResearchRequest
        ? 'step_3_direction'
        : requestedStageKey,
      hasCompletedDirectionResearch: hasDirectionResearch(existingMessages),
      hasCompletedStep1: hasCompletedStep1(existingMessages),
      hasCompletedStep2Research: hasAllKeywordResults(existingMessages),
      lastUserMessage: messageForModel,
    })
    const currentStageKey = resolveStageFromClientIntent({
      clientIntent,
      currentStage: legacyResolvedStageKey,
    }) as StageKey
    const nextSeqOrder =
      existingMessages.reduce(
        (maxSeq, message) => Math.max(maxSeq, message.seq_order),
        -1
      ) + 1

    const savedUserMessage = isInitialEntry || (isForcedGeneration && !userMessage)
      ? null
      : await insertProjectMessage({
          content: userMessage,
          projectId,
          role: 'user',
          seqOrder: nextSeqOrder,
          stageKey: currentStageKey,
          supabase,
          userId: user.id,
        })

    const apiKey = isInitialEntry ? null : getGeminiApiKey()

    if (
      !isInitialEntry &&
      !canUseStaticPersonaConfirmation &&
      !canUseStaticRfpConfirmation &&
      !apiKey
    ) {
      return NextResponse.json({ error: 'Gemini API key is missing' }, { status: 500 })
    }

    const requiredApiKey = apiKey ?? ''
    let assistantContent = ''
    let responseStageKey = currentStageKey

    if (isInitialEntry) {
      const initialResponse = buildProjectCardResponse({
        language,
        project,
        referenceImages,
      })
      assistantContent = appendStructuredResponseBlock(initialResponse)
    } else {
      const conversationMessages = [
        ...existingMessages,
        ...(savedUserMessage ? [savedUserMessage] : []),
      ]
      const modelMessages: GeminiMessage[] =
        conversationMessages.length > 0
          ? conversationMessages.map((message) => ({
              content: message.content,
              role: message.role,
            }))
          : [{ content: messageForModel, role: 'user' }]
      const system = buildSystemPrompt({
        activeExpert,
        currentStageKey,
        language,
        project,
        referenceImages,
      })
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
      const shouldGeneratePersonaCardImage =
        body.forceImageGeneration === 'persona_card' ||
        isPersonaCardVisualizationRequest(messageForModel)
      const shouldGenerateStyleImages =
        (body.forceImageGeneration === 'style_reference' &&
          !hasStyleReferenceSelection(messageForModel)) ||
        (currentStageKey === 'step_4_style' &&
          isExplicitStep4ProceedRequest(messageForModel) &&
          !hasExistingMoodboardCandidates)
      const shouldGenerateDesignImages =
        body.forceImageGeneration === 'initial_design' ||
        body.forceImageGeneration === 'design_revision' ||
        (currentStageKey === 'step_5_design' && isImageRequest(messageForModel))
      const shouldGenerateRfp =
        currentStageKey === 'step_6_rfp' &&
        (!hasExistingRfp || isRfpRevisionMessage)

      if (isStepZeroOrOne(currentStageKey)) {
        const structuredSystem = buildStepZeroOnePrompt({
          clientIntent,
          currentStage: currentStageKey,
          language,
          projectContext: JSON.stringify(
            {
              projectTitle: project.title,
              referenceGuidelines: buildReferenceGuidelineBlock(
                referenceImages,
                language
              ),
              requirements: project.requirements,
            },
            null,
            2
          ),
        })

        try {
          const rawResponse = await generateGeminiJson({
            apiKey: requiredApiKey,
            messages: modelMessages,
            responseSchema: STEP_0_1_RESPONSE_JSON_SCHEMA,
            system: structuredSystem,
          })
          const structuredResponse = parseStructuredChatResponse(rawResponse)

          if (!structuredResponse) {
            throw new Error('Gemini structured response failed validation')
          }

          const normalizedResponse = {
            ...structuredResponse,
            stage: toChatStage(currentStageKey),
          }
          assistantContent = appendStructuredResponseBlock(normalizedResponse)
          responseStageKey = currentStageKey
        } catch (structuredError) {
          console.warn(
            '[chat] STEP 0~1 structured output failed; using legacy text fallback.',
            structuredError
          )
          const fallbackText = await generateGeminiText({
            apiKey: requiredApiKey,
            messages: modelMessages,
            system,
          })
          assistantContent = fallbackText
          const fallbackStage = inferStageMetaFromText({
            currentStageKey,
            text: fallbackText,
          })
          responseStageKey = fallbackStage.transition
            ? fallbackStage.nextStageKey
            : fallbackStage.currentStageKey
        }
      } else if (canUseStaticPersonaConfirmation) {
        assistantContent = buildPersonaConfirmedPrompt(language)
        responseStageKey = 'step_2_research'
      } else if (canUseStaticRfpConfirmation) {
        assistantContent = buildRfpConfirmedPrompt(language)
        responseStageKey = 'step_6_rfp'
      } else if (shouldGeneratePersonaCardImage) {
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
        assistantContent = await generateRfp({
          apiKey: requiredApiKey,
          language,
          messages: modelMessages,
          project,
          referenceImages,
        })
      } else {
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
            }).catch(() => [])
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
            imageBlock = await generateGeminiImages({
              apiKey: requiredApiKey,
              count: body.forceImageGeneration === 'design_revision' ? 1 : 4,
              prompt: buildDesignImagePrompt({
                conversation,
                projectTitle: project.title || 'Untitled project',
                requirements: project.requirements,
                userRequest: messageForModel,
              }),
              purpose: 'design',
            })
          } catch (err) {
            console.error('Design image generation failed:', err)
            imageBlock = null
          }
        }

        const text = await generateGeminiText({
          apiKey: requiredApiKey,
          messages: modelMessages,
          system,
        })
        const styleMoodWidgets =
          currentStageKey === 'step_4_style' ? parseStyleMoodWidgets(text) : []

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
                }).catch(() => [])

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
        const completedDirectionResearch =
          currentStageKey === 'step_3_direction' &&
          hasDirectionResearch(conversationMessages, text)
        const responseText = completedDirectionResearch
          ? appendDirectionCompletionPrompt(text, language)
          : text
        assistantContent = appendImageBlockIfPresent({
          imageBlock,
          text: responseText,
        })
        const stageMeta = inferStageMetaFromText({
          currentStageKey,
          text: assistantContent,
        })
        const createPersonaCard = shouldCreatePersonaCard({
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
              language,
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
              buildPostPersonaKeywordPrompt(language),
            ]
              .filter(Boolean)
              .join('\n'),
          })
          responseStageKey = currentStageKey
        } else {
          responseStageKey = directionResearchRequest
            ? 'step_3_direction'
            : stageMeta.transition
              ? stageMeta.nextStageKey
              : stageMeta.currentStageKey
        }
      }

      // If the AI included direction widget markers, force stay in step 3
      // (inferStageMetaFromText can falsely detect "STEP 4" in appendDirectionCompletionPrompt)
      if (/<<AIDEE_DIRECTION_WIDGETS>>/.test(assistantContent)) {
        responseStageKey = 'step_3_direction'
      }

      // Inject style keyword picker only on genuine step_4 entry
      // Guard with currentStageKey to prevent injection during step 3 direction research
      if (
        responseStageKey === 'step_4_style' &&
        currentStageKey === 'step_4_style' &&
        !hasExistingKeywordPicker
      ) {
        const keywords = await generateStyleKeywords(
          requiredApiKey,
          conversation,
          language
        )
        assistantContent =
          assistantContent +
          `\n\n<<AIDEE_STYLE_KEYWORD_PICKER>>\n${JSON.stringify(keywords)}\n<</AIDEE_STYLE_KEYWORD_PICKER>>`
      }
    }

    const assistantMessage = await insertProjectMessage({
      content: assistantContent,
      projectId,
      role: 'assistant',
      seqOrder: nextSeqOrder + (savedUserMessage ? 1 : 0),
      stageKey: responseStageKey,
      supabase,
      userId: user.id,
    })

    return NextResponse.json({
      currentStageKey,
      message: assistantMessage,
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
