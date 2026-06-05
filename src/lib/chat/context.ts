import type { StageKey } from '@/lib/chat/stages'
import { getExpertPrompt, type ExpertKey } from '@/lib/chat/experts'

export type ProjectContextRecord = {
  id: string
  is_favorite?: boolean | null
  requirements: Record<string, unknown> | null
  title: string | null
}

export type ReferenceImageContextRecord = {
  analysis_json: unknown
  analysis_status?: string | null
  analysis_text: string | null
  file_name: string | null
  image_url?: string | null
}

type ReferenceAnalysis = {
  category?: string
  colorKeywords?: string[]
  designDirection?: string[]
  detailPoints?: string[]
  materialKeywords?: string[]
  moodKeywords?: string[]
  shapeKeywords?: string[]
  summary?: string
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

function extractReferenceAnalysis(analysisJson: unknown): ReferenceAnalysis | null {
  if (!analysisJson || typeof analysisJson !== 'object') {
    return null
  }

  const source =
    'analysis' in analysisJson &&
    analysisJson.analysis &&
    typeof analysisJson.analysis === 'object'
      ? analysisJson.analysis
      : analysisJson

  if (!source || typeof source !== 'object') {
    return null
  }

  const candidate = source as Record<string, unknown>

  return {
    category: typeof candidate.category === 'string' ? candidate.category : undefined,
    colorKeywords: isStringArray(candidate.colorKeywords)
      ? candidate.colorKeywords
      : undefined,
    designDirection: isStringArray(candidate.designDirection)
      ? candidate.designDirection
      : undefined,
    detailPoints: isStringArray(candidate.detailPoints)
      ? candidate.detailPoints
      : undefined,
    materialKeywords: isStringArray(candidate.materialKeywords)
      ? candidate.materialKeywords
      : undefined,
    moodKeywords: isStringArray(candidate.moodKeywords)
      ? candidate.moodKeywords
      : undefined,
    shapeKeywords: isStringArray(candidate.shapeKeywords)
      ? candidate.shapeKeywords
      : undefined,
    summary: typeof candidate.summary === 'string' ? candidate.summary : undefined,
  }
}

export function buildReferenceContext(referenceImages: ReferenceImageContextRecord[]) {
  if (referenceImages.length === 0) {
    return '레퍼런스 이미지 분석 결과 없음'
  }

  return referenceImages
    .map((item, index) => {
      const analysisJson = item.analysis_json
        ? JSON.stringify(item.analysis_json)
        : ''

      return [
        `레퍼런스 이미지 ${index + 1}: ${item.file_name || '이름 없음'}`,
        item.analysis_status ? `- 상태: ${item.analysis_status}` : null,
        item.analysis_text ? `- 분석 텍스트: ${item.analysis_text}` : null,
        analysisJson ? `- 분석 JSON: ${analysisJson}` : null,
      ]
        .filter(Boolean)
        .join('\n')
    })
    .join('\n\n')
}

export function buildReferenceGuidelineBlock(
  referenceImages: ReferenceImageContextRecord[]
) {
  const parsedAnalyses = referenceImages
    .map((item) => ({
      analysis: extractReferenceAnalysis(item.analysis_json),
      fileName: item.file_name || '이름 없음',
    }))
    .filter(
      (
        item
      ): item is {
        analysis: ReferenceAnalysis
        fileName: string
      } => Boolean(item.analysis)
    )

  if (parsedAnalyses.length === 0) {
    return '레퍼런스 기반 가이드라인 없음'
  }

  return parsedAnalyses
    .map(({ analysis, fileName }, index) =>
      [
        `가이드라인 ${index + 1} (${fileName})`,
        analysis.summary ? `- 요약: ${analysis.summary}` : null,
        analysis.category ? `- 유형: ${analysis.category}` : null,
        analysis.moodKeywords?.length
          ? `- 무드 키워드: ${analysis.moodKeywords.join(', ')}`
          : null,
        analysis.colorKeywords?.length
          ? `- 색상 키워드: ${analysis.colorKeywords.join(', ')}`
          : null,
        analysis.materialKeywords?.length
          ? `- 재질 키워드: ${analysis.materialKeywords.join(', ')}`
          : null,
        analysis.shapeKeywords?.length
          ? `- 형태 키워드: ${analysis.shapeKeywords.join(', ')}`
          : null,
        analysis.detailPoints?.length
          ? `- 참고 디테일: ${analysis.detailPoints.join(' / ')}`
          : null,
        analysis.designDirection?.length
          ? `- 디자인 방향: ${analysis.designDirection.join(' / ')}`
          : null,
      ]
        .filter(Boolean)
        .join('\n')
    )
    .join('\n\n')
}

function getStageInstruction(stageKey: StageKey) {
  switch (stageKey) {
    case 'step_0_start':
      return '지금은 STEP 0 프로젝트 시작 구간입니다. 저장된 requirements를 기준으로 Project Direction을 정리하고, 제품의 구체적인 모습이나 추가 설명이 있는지 질문 1개로 마무리하세요.'
    case 'step_1_idea':
      return '지금은 STEP 1입니다. 저장된 requirements를 기준으로 제품 아이디어와 개발 조건을 정리하고, 부족한 결정 요소를 질문 1개로 좁히세요.'
    case 'step_2_persona':
      return '지금은 STEP 2 페르소나 정리입니다. 타겟 사용자, 사용 장면, 불편함, 선택 기준을 확인하고 부족하면 질문 1개만 하세요. STEP 3로 넘어가기 전에는 반드시 Persona Summary를 Demographic Info, Persona Story, Problem & Needs, Current Behavior, Lifestyle Context, Relationship Keyword 6개 항목으로 정리해야 합니다. Persona Card 생성/확정 전에는 STEP 3 또는 다음 단계 진행을 언급하지 마세요.'
    case 'step_2_research':
      return '지금은 STEP 2 리서치입니다. 페르소나와 시장/경쟁 맥락을 바탕으로 인사이트를 정리하세요. Persona Card가 생성되지 않았다면 STEP 3로 넘어가지 말고 Persona Summary 6개 항목을 먼저 정리하세요.'
    case 'step_3_direction':
      return '지금은 STEP 3입니다. 감성, 기능, 심미 우선순위와 핵심 가치, 제외할 방향을 정리하세요.'
    case 'step_4_style':
      return '지금은 STEP 4 스타일 컨셉 도출입니다. 스타일 레퍼런스 선택으로 이어지도록 무드, 색감, 재질, 형태 기준을 정리하세요.'
    case 'step_5_design':
      return '지금은 STEP 5 디자인 제안입니다. 선택된 스타일 방향을 바탕으로 디자인 제안, 수정, 최종 확정을 관리하세요.'
    case 'step_6_rfp':
      return '지금은 STEP 6 RFP 문서 생성입니다. 확정된 요구사항을 구조화하고 다운로드 가능한 RFP 데이터로 이어질 수 있게 작성하세요.'
    case 'step_6_company':
      return '지금은 협력업체 연결 단계입니다. 필요한 협력 유형과 업체 선별 기준을 제안하세요.'
  }
}

export function buildSystemPrompt({
  activeExpert = 'aidee',
  currentStageKey,
  project,
  referenceImages,
}: {
  activeExpert?: ExpertKey
  currentStageKey: StageKey
  project: ProjectContextRecord | null
  referenceImages: ReferenceImageContextRecord[]
}) {
  return `
당신은 Aidee의 제품 디자인 전문 AI 매니저입니다.
사용자의 막연한 아이디어를 실제 제품 기획안, 디자인 방향, RFP까지 단계적으로 구조화합니다.

[대화 규칙]
- 한국어로 답하세요.
- 한 턴에는 가장 중요한 질문 1개만 하세요.
- 정보가 부족하면 지어내지 말고 물어보세요.
- 내부 단계 key는 사용자에게 노출하지 마세요.
- 레퍼런스 이미지 분석이 있으면 무드, 색상, 재질, 형태, 디테일을 실제 디자인 기준으로 반영하세요.
- RFP/PDF는 시스템이 별도로 처리할 수 있으므로 "파일로 제공할 수 없다" 같은 제한 문구를 쓰지 마세요.

[현재 단계]
${currentStageKey}
${getStageInstruction(currentStageKey)}

[프로젝트 정보]
- 프로젝트명: ${project?.title || '제목 없음'}
- requirements:
${JSON.stringify(project?.requirements ?? {}, null, 2)}

[레퍼런스 이미지 분석]
${buildReferenceContext(referenceImages)}

[레퍼런스 기반 가이드라인]
${buildReferenceGuidelineBlock(referenceImages)}

${getExpertPrompt(activeExpert)}
`.trim()
}

export function buildInitialUserPrompt(project: ProjectContextRecord | null) {
  return [
    `${project?.title || '새 프로젝트'} 프로젝트가 생성되었습니다.`,
    '저장된 requirements와 레퍼런스 이미지 분석 결과를 기준으로 프로젝트를 짧게 요약하고, 다음 대화에서 사용자가 바로 답할 수 있는 질문 1개로 마무리하세요.',
  ].join('\n')
}
