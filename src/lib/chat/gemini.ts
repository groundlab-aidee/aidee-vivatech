import {
  appendGeneratedImagesBlock,
  type GeneratedImageBlock,
} from '@/lib/chat/image-blocks'

export type GeminiMessage = {
  content: string
  role: 'assistant' | 'system' | 'user'
}

const DEFAULT_TEXT_MODEL = 'gemini-2.5-flash'
const DEFAULT_IMAGE_MODEL = 'gemini-3.1-flash-image'
const FALLBACK_IMAGE_MODELS = [
  DEFAULT_IMAGE_MODEL,
  'gemini-2.5-flash-image',
  'gemini-2.5-flash-image-preview',
]

export function getGeminiApiKey() {
  return process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? process.env.GEMINI_API_KEY
}

function getTextFromGeminiPayload(payload: unknown) {
  if (!payload || typeof payload !== 'object') {
    return ''
  }

  const candidates = (payload as { candidates?: unknown }).candidates

  if (!Array.isArray(candidates)) {
    return ''
  }

  return candidates
    .flatMap((candidate) => {
      if (!candidate || typeof candidate !== 'object') {
        return []
      }

      const content = (candidate as { content?: unknown }).content
      if (!content || typeof content !== 'object') {
        return []
      }

      const parts = (content as { parts?: unknown }).parts
      if (!Array.isArray(parts)) {
        return []
      }

      return parts
        .map((part) =>
          part && typeof part === 'object' && 'text' in part
            ? (part as { text?: unknown }).text
            : null
        )
        .filter((text): text is string => typeof text === 'string')
    })
    .join('\n')
}

export async function generateGeminiText({
  apiKey,
  maxOutputTokens,
  messages,
  model = DEFAULT_TEXT_MODEL,
  rejectTruncated = false,
  system,
  onUsage,
}: {
  apiKey: string
  maxOutputTokens?: number
  messages: GeminiMessage[]
  model?: string
  rejectTruncated?: boolean
  system: string
  onUsage?: (usage: { inputTokens: number; outputTokens: number }) => void
}) {
  const contents = messages
    .filter((message) => message.role !== 'system')
    .map((message) => ({
      parts: [{ text: message.content }],
      role: message.role === 'assistant' ? 'model' : 'user',
    }))

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      body: JSON.stringify({
        contents,
        ...(maxOutputTokens
          ? { generationConfig: { maxOutputTokens } }
          : {}),
        systemInstruction: {
          parts: [{ text: system }],
        },
      }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    }
  )

  const payload = (await response.json().catch(() => null)) as unknown

  if (onUsage && payload && typeof payload === 'object') {
    const usageMetadata =
      'usageMetadata' in payload &&
      payload.usageMetadata &&
      typeof payload.usageMetadata === 'object'
        ? payload.usageMetadata
        : null
    const inputTokens =
      usageMetadata &&
      'promptTokenCount' in usageMetadata &&
      typeof usageMetadata.promptTokenCount === 'number'
        ? usageMetadata.promptTokenCount
        : 0
    const outputTokens =
      usageMetadata &&
      'candidatesTokenCount' in usageMetadata &&
      typeof usageMetadata.candidatesTokenCount === 'number'
        ? usageMetadata.candidatesTokenCount
        : 0
    onUsage({ inputTokens, outputTokens })
  }

  if (!response.ok) {
    const message =
      payload &&
      typeof payload === 'object' &&
      'error' in payload &&
      payload.error &&
      typeof payload.error === 'object' &&
      'message' in payload.error &&
      typeof payload.error.message === 'string'
        ? payload.error.message
        : 'Gemini text generation failed'

    throw new Error(message)
  }

  const finishReasons =
    payload && typeof payload === 'object' && 'candidates' in payload
      ? ((payload as { candidates?: unknown }).candidates ?? [])
      : []
  const wasTruncated =
    Array.isArray(finishReasons) &&
    finishReasons.some((candidate) => {
      if (!candidate || typeof candidate !== 'object') return false

      const finishReason =
        'finishReason' in candidate
          ? candidate.finishReason
          : 'finish_reason' in candidate
            ? candidate.finish_reason
            : null

      return (
        typeof finishReason === 'string' &&
        ['MAX_TOKENS', 'LENGTH'].includes(finishReason.toUpperCase())
      )
    })

  if (rejectTruncated && wasTruncated) {
    throw new Error('Gemini response was truncated by the output token limit')
  }

  const text = getTextFromGeminiPayload(payload).trim()

  if (!text) {
    throw new Error('Gemini returned empty text')
  }

  return text
}

function extractInlineImages(payload: unknown) {
  if (!payload || typeof payload !== 'object') {
    return []
  }

  const candidates = (payload as { candidates?: unknown }).candidates

  if (!Array.isArray(candidates)) {
    return []
  }

  return candidates.flatMap((candidate) => {
    const content =
      candidate && typeof candidate === 'object'
        ? (candidate as { content?: unknown }).content
        : null
    const parts =
      content && typeof content === 'object'
        ? (content as { parts?: unknown }).parts
        : null

    if (!Array.isArray(parts)) {
      return []
    }

    return parts
      .map((part) => {
        const inlineData =
          part && typeof part === 'object' && 'inlineData' in part
            ? (part as { inlineData?: unknown }).inlineData
            : part && typeof part === 'object' && 'inline_data' in part
              ? (part as { inline_data?: unknown }).inline_data
              : null

        if (
          !inlineData ||
          typeof inlineData !== 'object' ||
          !('data' in inlineData) ||
          typeof inlineData.data !== 'string'
        ) {
          return null
        }

        const mimeType =
          'mimeType' in inlineData && typeof inlineData.mimeType === 'string'
            ? inlineData.mimeType
            : 'mime_type' in inlineData &&
                typeof inlineData.mime_type === 'string'
              ? inlineData.mime_type
              : 'image/png'

        return `data:${mimeType};base64,${inlineData.data}`
      })
      .filter((image): image is string => Boolean(image))
  })
}

function getGeminiImageFailureDetail(payload: unknown) {
  const text = getTextFromGeminiPayload(payload).trim()

  if (text) {
    return `Gemini returned text instead of an image: ${text.slice(0, 240)}`
  }

  if (!payload || typeof payload !== 'object') {
    return 'Gemini returned no image'
  }

  const candidates = (payload as { candidates?: unknown }).candidates

  if (Array.isArray(candidates) && candidates.length > 0) {
    const finishReasons = candidates
      .map((candidate) =>
        candidate && typeof candidate === 'object' && 'finishReason' in candidate
          ? (candidate as { finishReason?: unknown }).finishReason
          : null
      )
      .filter(Boolean)
      .join(', ')

    return finishReasons
      ? `Gemini returned no image. finishReason: ${finishReasons}`
      : 'Gemini returned no image'
  }

  return 'Gemini returned no image'
}

function getGeminiApiErrorMessage({
  model,
  payload,
  status,
}: {
  model: string
  payload: unknown
  status: number
}) {
  if (
    payload &&
    typeof payload === 'object' &&
    'error' in payload &&
    payload.error &&
    typeof payload.error === 'object'
  ) {
    const error = payload.error as {
      code?: unknown
      message?: unknown
      status?: unknown
    }
    const message =
      typeof error.message === 'string' ? error.message : 'Unknown Gemini error'
    const code = typeof error.code === 'number' ? `code ${error.code}` : null
    const errorStatus =
      typeof error.status === 'string' ? error.status : `HTTP ${status}`

    return `Gemini image generation failed with ${model}: ${[
      errorStatus,
      code,
      message,
    ]
      .filter(Boolean)
      .join(' - ')}`
  }

  return `Gemini image generation failed with ${model}: HTTP ${status}`
}

async function generateSingleImage({
  apiKey,
  model,
  prompt,
  referenceImages = [],
}: {
  apiKey: string
  model: string
  prompt: string
  referenceImages?: string[]
}) {
  const referenceParts = referenceImages.flatMap((image) => {
    const match = image.match(/^data:([^;]+);base64,([\s\S]+)$/)
    return match
      ? [{ inlineData: { data: match[2], mimeType: match[1] } }]
      : []
  })

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent`,
    {
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }, ...referenceParts] }],
      }),
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      method: 'POST',
    }
  )
  const payload = (await response.json().catch(() => null)) as unknown

  if (!response.ok) {
    throw new Error(
      getGeminiApiErrorMessage({
        model,
        payload,
        status: response.status,
      })
    )
  }

  const image = extractInlineImages(payload)[0]

  if (!image) {
    throw new Error(getGeminiImageFailureDetail(payload))
  }

  return image
}

async function generateSingleImageWithFallback({
  apiKey,
  models,
  prompt,
  referenceImages = [],
}: {
  apiKey: string
  models: string[]
  prompt: string
  referenceImages?: string[]
}) {
  const errors: string[] = []

  for (const model of models) {
    try {
      return {
        image: await generateSingleImage({
          apiKey,
          model,
          prompt,
          referenceImages,
        }),
        model,
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error))
    }
  }

  throw new Error(errors.join('\n'))
}

export async function generateGeminiImages({
  aspectRatio,
  apiKey,
  count = 1,
  model = process.env.GEMINI_IMAGE_MODEL ?? DEFAULT_IMAGE_MODEL,
  prompt,
  purpose,
  referenceImages = [],
}: {
  aspectRatio?: string
  apiKey: string
  count?: number
  model?: string
  prompt: string
  purpose: GeneratedImageBlock['purpose']
  referenceImages?: string[]
}) {
  const images: string[] = []
  const models = [
    model,
    ...FALLBACK_IMAGE_MODELS.filter((fallbackModel) => fallbackModel !== model),
  ]
  let usedModel = model

  for (let index = 0; index < count; index += 1) {
    const generated = await generateSingleImageWithFallback({
      apiKey,
      models,
      prompt: [
        prompt,
        '',
        `Generate exactly one standalone image. Variation ${index + 1} of ${count}.`,
        aspectRatio ? `Preferred aspect ratio: ${aspectRatio}.` : '',
        'No collage, no grid, no text overlay, no watermark.',
      ]
        .filter(Boolean)
        .join('\n'),
      referenceImages,
    })

    usedModel = generated.model
    images.push(generated.image)
  }

  return {
    images,
    model: usedModel,
    prompt,
    purpose,
    selectedImageIndex: null,
  } satisfies GeneratedImageBlock
}

export function appendImageBlockIfPresent({
  imageBlock,
  text,
}: {
  imageBlock: GeneratedImageBlock | null
  text: string
}) {
  return imageBlock
    ? appendGeneratedImagesBlock({ payload: imageBlock, text })
    : text
}
