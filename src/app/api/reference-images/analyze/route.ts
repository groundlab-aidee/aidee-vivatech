import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const ANALYSIS_PROMPT = `
이 이미지는 사용자가 업로드한 프로젝트 레퍼런스 이미지입니다.
이 이미지를 제품/공간/스타일 레퍼런스로 보고 한국어로 분석해주세요.

반드시 아래 JSON 형식으로만 응답하세요. 코드블록 마크다운은 사용하지 마세요.
{
  "summary": "이미지 한 줄 요약",
  "category": "이미지 유형 또는 오브제 유형",
  "moodKeywords": ["키워드1", "키워드2", "키워드3"],
  "colorKeywords": ["색상1", "색상2"],
  "materialKeywords": ["재질1", "재질2"],
  "shapeKeywords": ["형태1", "형태2"],
  "detailPoints": ["디테일 포인트 1", "디테일 포인트 2"],
  "designDirection": ["디자인 방향 1", "디자인 방향 2"]
}
`.trim()

type ReferenceImageRow = {
  id: string
  project_id: string
  file_name: string | null
  image_url: string
  analysis_status: string
  analysis_text: string | null
  analysis_json: Record<string, unknown> | null
}

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is missing')
  }

  const key = serviceRoleKey || anonKey
  if (!key) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY is missing')
  }

  return createClient(supabaseUrl, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

function getGeminiApiKey() {
  const value =
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? process.env.GEMINI_API_KEY

  if (!value) {
    throw new Error('GOOGLE_GENERATIVE_AI_API_KEY or GEMINI_API_KEY is missing')
  }

  return value
}

function stripCodeFence(text: string) {
  const trimmed = text.trim()
  if (!trimmed.startsWith('```')) {
    return trimmed
  }

  return trimmed
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim()
}

function safeParseAnalysis(text: string) {
  try {
    return JSON.parse(stripCodeFence(text)) as Record<string, unknown>
  } catch {
    return null
  }
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  return Buffer.from(buffer).toString('base64')
}

async function analyzeSingleImage(image: ReferenceImageRow) {
  const imageResponse = await fetch(image.image_url)
  if (!imageResponse.ok) {
    throw new Error(`Failed to fetch image: ${image.file_name ?? image.id}`)
  }

  const mimeType =
    typeof image.analysis_json?.mime_type === 'string'
      ? image.analysis_json.mime_type
      : imageResponse.headers.get('content-type') || 'image/png'

  const imageBase64 = arrayBufferToBase64(await imageResponse.arrayBuffer())
  const apiKey = getGeminiApiKey()
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              { text: ANALYSIS_PROMPT },
              {
                inline_data: {
                  mime_type: mimeType,
                  data: imageBase64,
                },
              },
            ],
          },
        ],
      }),
    }
  )

  const result = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
    error?: { message?: string }
  }

  if (!response.ok) {
    throw new Error(result.error?.message || 'Gemini image analysis failed')
  }

  const text =
    result.candidates?.[0]?.content?.parts
      ?.map((part) => part.text)
      .filter((value): value is string => typeof value === 'string')
      .join('\n') ?? ''

  if (!text) {
    throw new Error('Gemini returned empty analysis')
  }

  return {
    analysisJson: safeParseAnalysis(text),
    analysisText: text,
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { projectId?: string }
    const projectId = typeof body.projectId === 'string' ? body.projectId : ''

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('project_reference_images')
      .select('id, project_id, file_name, image_url, analysis_status, analysis_text, analysis_json')
      .eq('project_id', projectId)
      .eq('analysis_status', 'pending')

    if (error) {
      throw error
    }

    const images = (data ?? []) as ReferenceImageRow[]
    const results: Array<{ id: string; status: 'completed' | 'failed'; error?: string }> = []

    for (const image of images) {
      try {
        const analysis = await analyzeSingleImage(image)
        const { error: updateError } = await supabase
          .from('project_reference_images')
          .update({
            analysis_status: 'completed',
            analysis_text: analysis.analysisText,
            analysis_json: {
              ...(image.analysis_json ?? {}),
              analysis: analysis.analysisJson,
            },
          })
          .eq('id', image.id)

        if (updateError) {
          throw updateError
        }

        results.push({ id: image.id, status: 'completed' })
      } catch (imageError) {
        const message =
          imageError instanceof Error ? imageError.message : 'Unknown image analysis error'

        await supabase
          .from('project_reference_images')
          .update({
            analysis_status: 'failed',
            analysis_text: message,
          })
          .eq('id', image.id)

        results.push({ id: image.id, status: 'failed', error: message })
      }
    }

    return NextResponse.json({
      success: true,
      projectId,
      analyzedCount: results.filter((item) => item.status === 'completed').length,
      failedCount: results.filter((item) => item.status === 'failed').length,
      results,
    })
  } catch (error) {
    console.error('Reference image analysis error:', error)
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to analyze reference images',
      },
      { status: 500 }
    )
  }
}
