import { NextResponse } from 'next/server'

import { buildInitialUserPrompt, buildSystemPrompt } from '@/lib/chat/context'
import { isExpertKey, type ExpertKey } from '@/lib/chat/experts'
import {
  appendImageBlockIfPresent,
  generateGeminiImages,
  generateGeminiText,
  getGeminiApiKey,
  type GeminiMessage,
} from '@/lib/chat/gemini'
import { appendRfpJsonBlock, buildRfpPrompt, parseRfpDocument, stripCodeFence } from '@/lib/chat/rfp'
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
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 60

type ChatRequestBody = {
  activeExpert?: unknown
  currentStageKey?: unknown
  forceImageGeneration?: 'design_revision' | 'initial_design' | 'style_reference'
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

  if (idea.length <= 180) {
    return idea
  }

  return `${idea.slice(0, 180).trim()}...`
}

function buildProjectStartSnapshot(
  project: Awaited<ReturnType<typeof getProjectForUser>>
) {
  const requirements = getSurveyRequirements(project)
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
    ideaSummary: summarizeIdeaText(requirements),
    size: getRequirementString(requirements, 'size'),
    title: project?.title || '새 프로젝트',
    usage: getRequirementString(requirements, 'usage'),
  }
}

function buildProjectCardResponse({
  project,
  referenceCount,
}: {
  project: Awaited<ReturnType<typeof getProjectForUser>>
  referenceCount: number
}) {
  const snapshot = buildProjectStartSnapshot(project)
  const referenceSummary =
    referenceCount > 0
      ? `${referenceCount}개 참고 이미지가 업로드되어 있습니다.`
      : '업로드된 참고 이미지는 아직 없습니다.'

  return [
    "새로운 프로젝트가 시작되었네요! 'Aidee'팀과 함께 아이디어를 구체화해보아요.",
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
    '제품의 구체적인 모습이나 추가 설명이 있다면 편하게 알려주세요.',
    '형태, 색감, 재질, 사용 장면, 꼭 들어갔으면 하는 디테일처럼 떠오르는 내용만 적어주셔도 좋아요.',
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
    throw new Error('Gemini returned invalid RFP JSON')
  }

  return appendRfpJsonBlock({
    rfp: parsed,
    text: [
      '# 제품 제안요청서',
      '',
      `프로젝트명: ${parsed.projectName}`,
      `한 줄 정의: ${parsed.oneLineDefinition}`,
      `프로젝트 목표: ${parsed.projectGoal}`,
      '',
      'RFP 문서 데이터가 생성되었습니다.',
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
    const hasAssistantMessage = existingMessages.some(
      (message) => message.role === 'assistant'
    )
    const isInitialEntry = !hasAssistantMessage && !userMessage
    const messageForModel = isInitialEntry ? buildInitialUserPrompt(project) : userMessage

    if (!messageForModel) {
      return NextResponse.json({ error: 'message is required' }, { status: 400 })
    }

    const currentStageKey = resolveIntentStageKey({
      currentStageKey: requestedStageKey,
      lastUserMessage: messageForModel,
    })
    const nextSeqOrder =
      existingMessages.reduce(
        (maxSeq, message) => Math.max(maxSeq, message.seq_order),
        -1
      ) + 1

    const savedUserMessage = isInitialEntry
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

    if (!isInitialEntry && !apiKey) {
      return NextResponse.json({ error: 'Gemini API key is missing' }, { status: 500 })
    }

    const requiredApiKey = apiKey ?? ''
    let assistantContent = ''
    let responseStageKey = currentStageKey

    if (isInitialEntry) {
      assistantContent = buildProjectCardResponse({
        project,
        referenceCount: referenceImages.length,
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
      const shouldGenerateStyleImages =
        (body.forceImageGeneration === 'style_reference' ||
          currentStageKey === 'step_4_style') &&
        !hasStyleReferenceSelection(messageForModel)
      const shouldGenerateDesignImages =
        body.forceImageGeneration === 'initial_design' ||
        body.forceImageGeneration === 'design_revision' ||
        (currentStageKey === 'step_5_design' && isImageRequest(messageForModel))
      const shouldGenerateRfp = currentStageKey === 'step_6_rfp'

      if (shouldGenerateRfp) {
        assistantContent = await generateRfp({
          apiKey: requiredApiKey,
          messages: modelMessages,
          project,
          referenceImages,
        })
      } else {
        let imageBlock = null

        if (shouldGenerateStyleImages) {
          imageBlock = await generateGeminiImages({
            apiKey: requiredApiKey,
            count: 3,
            prompt: buildStyleImagePrompt({
              conversation,
              projectTitle: project.title || 'Untitled project',
              requirements: project.requirements,
            }),
            purpose: 'style_reference',
          })
        } else if (shouldGenerateDesignImages) {
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
          })
        }

        const text = await generateGeminiText({
          apiKey: requiredApiKey,
          messages: modelMessages,
          system,
        })
        assistantContent = appendImageBlockIfPresent({ imageBlock, text })
        const stageMeta = inferStageMetaFromText({
          currentStageKey,
          text: assistantContent,
        })
        responseStageKey = stageMeta.transition
          ? stageMeta.nextStageKey
          : stageMeta.currentStageKey
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
