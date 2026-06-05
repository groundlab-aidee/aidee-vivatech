import {
  appendGeneratedImagesBlock,
  type GeneratedImageBlock,
} from '@/lib/chat/image-blocks'

export type GeminiMessage = {
  content: string
  role: 'assistant' | 'system' | 'user'
}

const DEFAULT_TEXT_MODEL = 'gemini-2.5-flash'
const DEFAULT_IMAGE_MODEL = 'gemini-2.5-flash-image'

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
  messages,
  model = DEFAULT_TEXT_MODEL,
  system,
}: {
  apiKey: string
  messages: GeminiMessage[]
  model?: string
  system: string
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
        systemInstruction: {
          parts: [{ text: system }],
        },
      }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    }
  )

  const payload = (await response.json().catch(() => null)) as unknown

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

async function generateSingleImage({
  apiKey,
  model,
  prompt,
}: {
  apiKey: string
  model: string
  prompt: string
}) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseModalities: ['TEXT', 'IMAGE'],
        },
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
    throw new Error('Gemini image generation failed')
  }

  const image = extractInlineImages(payload)[0]

  if (!image) {
    throw new Error('Gemini returned no image')
  }

  return image
}

export async function generateGeminiImages({
  apiKey,
  count = 1,
  model = DEFAULT_IMAGE_MODEL,
  prompt,
  purpose,
}: {
  apiKey: string
  count?: number
  model?: string
  prompt: string
  purpose: GeneratedImageBlock['purpose']
}) {
  const images: string[] = []

  for (let index = 0; index < count; index += 1) {
    const image = await generateSingleImage({
      apiKey,
      model,
      prompt: [
        prompt,
        '',
        `Generate exactly one standalone image. Variation ${index + 1} of ${count}.`,
        'No collage, no grid, no text overlay, no watermark.',
      ].join('\n'),
    })

    images.push(image)
  }

  return {
    images,
    model,
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
