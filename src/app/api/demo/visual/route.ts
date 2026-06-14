import { NextResponse } from 'next/server'

import { generateGeminiImages, getGeminiApiKey } from '@/lib/chat/gemini'
import type { GeneratedImageBlock } from '@/lib/chat/image-blocks'
import { createImageTo3DTask } from '@/lib/chat/meshy'
import {
  getUnsplashAccessKey,
  searchUnsplashPhotos,
  type UnsplashImageMeta,
} from '@/lib/chat/unsplash'

export const maxDuration = 60

// Demo-only visual generator. Keeps /api/chat completely untouched: the demo
// player calls THIS endpoint to produce the live visuals (Unsplash moodboard,
// Nano Banana rendering, Meshy 3D) and attaches the result to a demo message as
// a normal GeneratedImageBlock, so all existing renderers work unchanged.
// POST { visualType, prompt, count? } -> { imageBlock, meshyTaskId? }

type DemoVisualType =
  | 'moodboard'
  | 'design_rendering'
  | 'design_modeling'
  | 'persona'

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      visualType?: DemoVisualType
      prompt?: string
      count?: number
    }
    const visualType = body.visualType
    const prompt = typeof body.prompt === 'string' ? body.prompt : ''

    if (!visualType || !prompt) {
      return NextResponse.json(
        { error: 'visualType and prompt are required' },
        { status: 400 }
      )
    }

    // Mood board -> Unsplash (same source as the real flow).
    if (visualType === 'moodboard') {
      const accessKey = getUnsplashAccessKey()
      if (!accessKey) {
        return NextResponse.json(
          { error: 'Unsplash access key is missing' },
          { status: 500 }
        )
      }
      const candidates: UnsplashImageMeta[] = await searchUnsplashPhotos({
        accessKey,
        query: prompt,
        perPage: body.count ?? 3,
      }).catch(() => [])

      const imageBlock: GeneratedImageBlock = {
        images: candidates.map((c) => c.url),
        model: 'unsplash',
        prompt,
        purpose: 'moodboard_candidate',
        selectedImageIndex: null,
        unsplashMeta: candidates,
      }
      return NextResponse.json({ imageBlock })
    }

    // Rendering / modeling / persona source -> Nano Banana (Gemini image).
    const apiKey = getGeminiApiKey()
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Gemini API key is missing' },
        { status: 500 }
      )
    }

    // Persona portrait -> single Nano Banana image returned as a flat URL so the
    // demo player can attach it to the persona card's imageUrl field.
    if (visualType === 'persona') {
      const personaBlock = await generateGeminiImages({
        apiKey,
        count: 1,
        prompt,
        purpose: 'persona',
      })
      return NextResponse.json({
        imageBlock: personaBlock,
        imageUrl: personaBlock.images[0] ?? null,
      })
    }

    const imageBlock = await generateGeminiImages({
      apiKey,
      count: visualType === 'design_rendering' ? body.count ?? 4 : 1,
      prompt,
      purpose: visualType === 'design_rendering' ? 'design' : 'thumbnail',
    })

    // For modeling, kick off Meshy image-to-3D from the generated image.
    if (visualType === 'design_modeling') {
      const sourceImage = imageBlock.images[0]
      if (!sourceImage) {
        return NextResponse.json(
          { error: 'No source image generated for 3D modeling' },
          { status: 502 }
        )
      }
      let meshyTaskId: string | null = null
      try {
        const { result } = await createImageTo3DTask(sourceImage)
        meshyTaskId = result
      } catch (err) {
        console.error('[demo/visual] meshy task failed', err)
      }
      return NextResponse.json({ imageBlock, meshyTaskId })
    }

    return NextResponse.json({ imageBlock })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[demo/visual] failed', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
