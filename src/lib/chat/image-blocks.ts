export type GeneratedImagePurpose =
  | 'persona'
  | 'style_reference'
  | 'moodboard_candidate'
  | 'design'
  | 'thumbnail'

export type UnsplashImageMeta = {
  id: string
  url: string
  thumb_url: string
  photographer_name: string
  photographer_url: string
  unsplash_page_url: string
}

export type GeneratedImageBlock = {
  images: string[]
  model: string
  prompt: string
  purpose?: GeneratedImagePurpose
  selectedImageIndex?: number | null
  unsplashMeta?: UnsplashImageMeta[]
}

export function appendGeneratedImagesBlock({
  payload,
  text,
}: {
  payload: GeneratedImageBlock
  text: string
}) {
  return `${text}

<<AIDEE_IMAGES>>
${JSON.stringify(payload)}
<</AIDEE_IMAGES>>`
}

export function extractGeneratedImagesBlock(text: string) {
  const match = text.match(
    /<<\s*AIDEE[-_ ]?IMAGES\s*>>[\s\n]*([\s\S]*?)[\s\n]*<<\s*\/\s*AIDEE[-_ ]?IMAGES\s*>>/i
  )

  if (!match) {
    const fallbackImages =
      text.match(/data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+/g) ?? []

    return {
      cleanedText: text.trim(),
      imageBlock:
        fallbackImages.length > 0
          ? ({
              images: fallbackImages,
              model: 'inline-data',
              prompt: '',
            } satisfies GeneratedImageBlock)
          : null,
    }
  }

  const cleanedText = text
    .replace(
      /\n?<<\s*AIDEE[-_ ]?IMAGES\s*>>[\s\S]*?<<\s*\/\s*AIDEE[-_ ]?IMAGES\s*>>\s*$/i,
      ''
    )
    .trim()

  try {
    const parsed = JSON.parse(match[1]) as Partial<GeneratedImageBlock>

    if (
      !Array.isArray(parsed.images) ||
      !parsed.images.every((image) => typeof image === 'string')
    ) {
      return { cleanedText, imageBlock: null }
    }

    return {
      cleanedText,
      imageBlock: {
        images: parsed.images,
        model: typeof parsed.model === 'string' ? parsed.model : 'unknown',
        prompt: typeof parsed.prompt === 'string' ? parsed.prompt : '',
        purpose: parsed.purpose,
        selectedImageIndex:
          typeof parsed.selectedImageIndex === 'number'
            ? parsed.selectedImageIndex
            : null,
        unsplashMeta: Array.isArray(parsed.unsplashMeta)
          ? (parsed.unsplashMeta as UnsplashImageMeta[])
          : undefined,
      } satisfies GeneratedImageBlock,
    }
  } catch {
    return { cleanedText, imageBlock: null }
  }
}
