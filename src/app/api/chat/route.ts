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

export const maxDuration = 60

type ChatRequestBody = {
  activeExpert?: unknown
  currentStageKey?: unknown
  forceImageGeneration?:
    | 'design_revision'
    | 'initial_design'
    | 'persona_card'
    | 'style_reference'
  message?: unknown
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
  return /페르소나\s*카드.*확정|persona\s*card.*confirm/i.test(text)
}

function isPersonaCardRevisionRequest(text: string) {
  return /페르소나\s*카드\s*(?:수정|다시\s*생성|재생성)|persona\s*card\s*(?:edit|revise|regenerate)/i.test(
    text
  )
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
    '페르소나 카드를 확정했습니다.',
    '',
    'STEP 2의 모든 과정(Problem Statements, Keywords: Experience, Keywords: Relationship, Persona Card)이 완료되었습니다.',
    'STEP 3 개발 방향성 도출로 넘어갈 준비가 되었습니다.',
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

function hasCompletedStep1(messages: Array<{ content: string }>) {
  return messages.some((m) =>
    /핵심\s*아이디어와\s*개발\s*조건이\s*정리되었습니다|STEP\s*2\.\s*사용자\s*명확화\s*단계로\s*넘어가겠습니다/i.test(
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

function appendDirectionCompletionPrompt(text: string) {
  if (/STEP\s*4|스타일\s*컨셉.*(?:넘어|진행)|진행할까요/i.test(text)) {
    return text
  }

  return [
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
  transitionToStep3,
}: {
  allowReplacement: boolean
  currentStageKey: StageKey
  hasExistingPersonaCard: boolean
  text: string
  transitionToStep3: boolean
}) {
  if (
    (!allowReplacement && hasExistingPersonaCard) ||
    !currentStageKey.startsWith('step_2')
  ) {
    return false
  }

  return (
    transitionToStep3 ||
    /persona\s*summary|persona\s*card|페르소나\s*(?:요약|카드)|demographic\s*info|problem\s*&?\s*needs?|relationship\s*keyword/i.test(
      text
    )
  )
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
    text: [
      'STEP 6. 평가 및 제품개발 기획안 생성',
      '',
      formatRfpMarkdown(parsed).replace(/^# 프로젝트 기획안\n+/, ''),
    ].join('\n'),
  })
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ChatRequestBody
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
    const userMessage = typeof body.message === 'string' ? body.message.trim() : ''
    const isForcedGeneration = Boolean(body.forceImageGeneration)
    const hasAssistantMessage = existingMessages.some(
      (message) => message.role === 'assistant'
    )
    const isInitialEntry = !hasAssistantMessage && !userMessage
    const messageForModel = isInitialEntry
      ? buildInitialUserPrompt(project)
      : userMessage || (isForcedGeneration ? '시각화 생성 요청' : '')
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

    const currentStageKey = resolveIntentStageKey({
      currentStageKey: requestedStageKey,
      hasCompletedDirectionResearch: hasDirectionResearch(existingMessages),
      hasCompletedStep1: hasCompletedStep1(existingMessages),
      hasCompletedStep2Research: hasAllKeywordResults(existingMessages),
      lastUserMessage: messageForModel,
    })
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
      assistantContent = buildProjectCardResponse({
        project,
        referenceImages,
      })
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
        project,
        referenceImages,
      })
      const conversation = buildConversation(modelMessages)
      const hasExistingStyleImages = existingMessages.some(
        (existingMessage) =>
          (existingMessage.generatedImageBlock?.purpose === 'style_reference' ||
            existingMessage.generatedImageBlock?.purpose === 'moodboard_candidate') &&
          existingMessage.generatedImageBlock.images.length > 0
      )
      const hasExistingRfp = existingMessages.some(
        (existingMessage) => Boolean(extractRfpJsonBlock(existingMessage.content).rfp)
      )
      const shouldGeneratePersonaCardImage =
        body.forceImageGeneration === 'persona_card' ||
        isPersonaCardVisualizationRequest(messageForModel)
      const shouldGenerateStyleImages =
        (body.forceImageGeneration === 'style_reference' ||
          (currentStageKey === 'step_4_style' && !hasExistingStyleImages)) &&
        !hasStyleReferenceSelection(messageForModel)
      const shouldGenerateDesignImages =
        body.forceImageGeneration === 'initial_design' ||
        body.forceImageGeneration === 'design_revision' ||
        (requestedStageKey === 'step_4_style' &&
          currentStageKey === 'step_5_design') ||
        (currentStageKey === 'step_5_design' && isImageRequest(messageForModel))
      const shouldGenerateRfp =
        currentStageKey === 'step_6_rfp' &&
        (!hasExistingRfp || isRfpRevisionMessage)

      if (canUseStaticPersonaConfirmation) {
        assistantContent = buildPersonaConfirmedPrompt()
        responseStageKey = 'step_2_research'
      } else if (canUseStaticRfpConfirmation) {
        assistantContent = buildRfpConfirmedPrompt()
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
        }

        const text = await generateGeminiText({
          apiKey: requiredApiKey,
          messages: modelMessages,
          system,
        })
        const completedDirectionResearch =
          currentStageKey === 'step_3_direction' &&
          hasDirectionResearch(conversationMessages, text)
        const responseText = completedDirectionResearch
          ? appendDirectionCompletionPrompt(text)
          : text
        assistantContent = appendImageBlockIfPresent({
          imageBlock,
          text: responseText,
        })
        const stageMeta = inferStageMetaFromText({
          currentStageKey,
          text: assistantContent,
        })
        const transitionToStep3 =
          stageMeta.transition && stageMeta.nextStageKey === 'step_3_direction'
        const createPersonaCard = shouldCreatePersonaCard({
          allowReplacement: isPersonaRevisionMessage,
          currentStageKey,
          hasExistingPersonaCard: hasPersonaCard(conversationMessages),
          text: assistantContent,
          transitionToStep3,
        })

        if (createPersonaCard) {
          const personaText = removePrematureStep3Transition(assistantContent)
          assistantContent = appendPersonaCardBlock({
            data: buildPersonaCardDataFromText(assistantContent),
            text: [
              personaText,
              '',
              buildPostPersonaKeywordPrompt(),
            ]
              .filter(Boolean)
              .join('\n'),
          })
          responseStageKey = 'step_2_research'
        } else {
          responseStageKey = stageMeta.transition
            ? stageMeta.nextStageKey
            : stageMeta.currentStageKey
        }
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
