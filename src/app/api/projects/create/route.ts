import { NextResponse } from 'next/server'

import { insertProjectMessage } from '@/lib/chat/persistence'
import { DEFAULT_STAGE_KEY } from '@/lib/chat/stages'
import { createClient } from '@/lib/supabase/server'

type SurveyData = {
  categories?: string[]
  duration?: string
  features?: string[]
  goal?: string
  idea?: string
  maxBudget?: number
  minBudget?: number
  otherCategory?: string
  otherFeature?: string
  size?: string
  usage?: string
}

type GeminiProjectInfo = {
  title: string
  summary: string
  goal: string
  keyRequirements: string[]
  recommendedStage: string
  initialContext: string
}

type ReferenceImageRow = {
  analysis_json: {
    file_path: string
    file_size: number
    mime_type: string
  }
  analysis_status: 'pending'
  file_name: string
  image_url: string
  project_id: string
}

function getGeminiApiKey() {
  return process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? process.env.GEMINI_API_KEY
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

function fallbackProjectInfo(survey: SurveyData): GeminiProjectInfo {
  const idea = typeof survey.idea === 'string' ? survey.idea.trim() : ''
  const title = idea.length > 15 ? `${idea.slice(0, 15)}...` : idea || '새 프로젝트'

  return {
    title,
    summary: idea || '사용자 설문 기반 신규 제품 디자인 프로젝트',
    goal: survey.goal || '아이디어 구체화',
    keyRequirements: [
      ...(survey.categories ?? []),
      ...(survey.features ?? []),
      survey.size ? `크기: ${survey.size}` : '',
      survey.duration ? `기간: ${survey.duration}` : '',
      survey.usage ? `사용 맥락: ${survey.usage}` : '',
    ].filter(Boolean),
    recommendedStage: 'step_1_idea',
    initialContext: JSON.stringify(survey, null, 2),
  }
}

function normalizeProjectInfo(value: unknown, survey: SurveyData): GeminiProjectInfo {
  const fallback = fallbackProjectInfo(survey)

  if (!value || typeof value !== 'object') {
    return fallback
  }

  const candidate = value as Record<string, unknown>

  return {
    title: typeof candidate.title === 'string' && candidate.title.trim()
      ? candidate.title.trim()
      : fallback.title,
    summary: typeof candidate.summary === 'string' && candidate.summary.trim()
      ? candidate.summary.trim()
      : fallback.summary,
    goal: typeof candidate.goal === 'string' && candidate.goal.trim()
      ? candidate.goal.trim()
      : fallback.goal,
    keyRequirements:
      Array.isArray(candidate.keyRequirements) &&
      candidate.keyRequirements.every((item) => typeof item === 'string')
        ? candidate.keyRequirements
        : fallback.keyRequirements,
    recommendedStage:
      typeof candidate.recommendedStage === 'string' &&
      candidate.recommendedStage.trim()
        ? candidate.recommendedStage.trim()
        : fallback.recommendedStage,
    initialContext:
      typeof candidate.initialContext === 'string' &&
      candidate.initialContext.trim()
        ? candidate.initialContext.trim()
        : fallback.initialContext,
  }
}

async function generateProjectInfo(survey: SurveyData) {
  const apiKey = getGeminiApiKey()

  if (!apiKey) {
    return fallbackProjectInfo(survey)
  }

  const prompt = [
    '아래 설문 정보를 바탕으로 제품 디자인 프로젝트 초기 정보를 한국어 JSON으로 정리하세요.',
    '마크다운 코드블록 없이 JSON 객체만 반환하세요.',
    '',
    '반환 스키마:',
    '{',
    '  "title": "프로젝트 제목 20자 이내",',
    '  "summary": "사용자의 아이디어를 제품 개발 관점의 자연스럽고 공식적인 한 문장으로 정리. 반드시 ~ 개발이 목표입니다. 형태로 작성",',
    '  "goal": "프로젝트 목표",',
    '  "keyRequirements": ["주요 요구사항"],',
    '  "recommendedStage": "추천 진행 단계",',
    '  "initialContext": "초기 채팅 컨텍스트로 사용할 설명"',
    '}',
    '',
    '설문 정보:',
    JSON.stringify(survey, null, 2),
  ].join('\n')

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }],
          },
        ],
      }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    }
  )

  const result = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
    error?: { message?: string }
  }

  if (!response.ok) {
    throw new Error(result.error?.message || 'Gemini project generation failed')
  }

  const text =
    result.candidates?.[0]?.content?.parts
      ?.map((part) => part.text)
      .filter((value): value is string => typeof value === 'string')
      .join('\n') ?? ''

  if (!text) {
    throw new Error('Gemini returned empty project generation')
  }

  try {
    return normalizeProjectInfo(JSON.parse(stripCodeFence(text)), survey)
  } catch (error) {
    console.error('[project create] Gemini JSON parse failed:', error)
    return fallbackProjectInfo(survey)
  }
}

async function uploadReferenceImages(projectId: string, files: File[]) {
  const supabase = await createClient()
  const rows: ReferenceImageRow[] = []

  for (const file of files) {
    const extension = file.name.split('.').pop() || 'png'
    const filePath = `projects/${projectId}/references/${crypto.randomUUID()}.${extension}`
    const { error: uploadError } = await supabase.storage
      .from('project-reference-images')
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      throw uploadError
    }

    const { data: publicUrlData } = supabase.storage
      .from('project-reference-images')
      .getPublicUrl(filePath)

    rows.push({
      analysis_json: {
        file_path: filePath,
        file_size: file.size,
        mime_type: file.type,
      },
      analysis_status: 'pending',
      file_name: file.name,
      image_url: publicUrlData.publicUrl,
      project_id: projectId,
    })
  }

  return rows
}

async function triggerReferenceImageAnalysis(projectId: string, request: Request) {
  const response = await fetch(new URL('/api/reference-images/analyze', request.url), {
    body: JSON.stringify({ projectId }),
    headers: {
      Cookie: request.headers.get('cookie') ?? '',
      'Content-Type': 'application/json',
    },
    method: 'POST',
  })

  if (!response.ok) {
    const result = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(result?.error || '참고 이미지 분석 요청에 실패했습니다.')
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const surveyRaw = formData.get('survey')

    if (typeof surveyRaw !== 'string') {
      return NextResponse.json({ error: 'survey is required' }, { status: 400 })
    }

    const survey = JSON.parse(surveyRaw) as SurveyData
    const files = formData
      .getAll('referenceImages')
      .filter((value): value is File => value instanceof File)
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const generated = await generateProjectInfo(survey)
    const requirements = {
      generated,
      source: 'workspace_survey',
      survey,
    }

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({
        requirements,
        title: generated.title,
        user_id: user.id,
      })
      .select('id, title, created_at, requirements')
      .single()

    if (projectError) {
      throw projectError
    }

    if (!project?.id) {
      throw new Error('projects insert succeeded without returning an id')
    }

    try {
      await insertProjectMessage({
        content: generated.initialContext,
        projectId: project.id,
        role: 'system',
        seqOrder: 0,
        stageKey: DEFAULT_STAGE_KEY,
        supabase,
        userId: user.id,
      })
    } catch (error) {
      console.error('[project create] context message insert failed:', error)
    }

    if (survey.idea?.trim()) {
      try {
        await insertProjectMessage({
          content: survey.idea.trim(),
          projectId: project.id,
          role: 'user',
          seqOrder: 1,
          stageKey: DEFAULT_STAGE_KEY,
          supabase,
          userId: user.id,
        })
      } catch (error) {
        console.error('[project create] initial user message insert failed:', error)
      }
    }

    if (files.length > 0) {
      const rows = await uploadReferenceImages(project.id, files)
      const { error: imageInsertError } = await supabase
        .from('project_reference_images')
        .insert(rows)

      if (imageInsertError) {
        throw imageInsertError
      }

      void triggerReferenceImageAnalysis(project.id, request).catch((error) => {
        console.error('[project create] reference image analysis failed:', error)
      })
    }

    return NextResponse.json({
      project,
      success: true,
    })
  } catch (error) {
    console.error('Project create error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to create project',
        success: false,
      },
      { status: 500 }
    )
  }
}
