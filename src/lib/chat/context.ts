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
      return [
        '지금은 STEP 1입니다. 저장된 requirements를 기준으로 제품의 역할, 사용 맥락, 핵심 제약만 짧게 정리하세요.',
        '디자인 취향, 스타일 컨셉, 상세 기능 우선순위, 브랜드 감성처럼 이후 단계에서 다룰 내용은 깊게 묻지 마세요.',
        '제품이 누구의 어떤 상황에서 어떤 역할을 하는지 정도가 확인되면 STEP 2 사용자 명확화로 넘어갈지 물어보세요.',
        '응답은 5줄 이내로 유지하고 질문은 1개만 하세요.',
      ].join(' ')
    case 'step_2_persona':
      return [
        '지금은 STEP 2 페르소나 정리입니다. 타겟 사용자, 사용 장면, 불편함, 선택 기준을 확인하고 부족하면 질문 1개만 하세요.',
        'STEP 3로 넘어가기 전에는 반드시 Persona Summary를 아래 6개 항목으로 정리해야 합니다.',
        'Demographic Info: 이름/나이, 상태, 주요 환경, 생활 패턴, 핵심 특징 5줄.',
        'Persona Story: 사용자가 겪는 상황과 제품 기대 역할이 드러나는 2문장, 120자 이내.',
        'Problem & Needs: 문제와 니즈 4개, 각 40자 이내.',
        'Current Behavior: 현재 행동/대안/반복 패턴 4개, 각 44자 이내.',
        'Lifestyle Context: 자주 쓰는 도구, 머무는 공간, 책상/생활 물건, 선호 취향 4개, 각 48자 이내.',
        'Relationship Keyword: 기존 방해 요소, 공간, 자기관리, 제품 기대 역할과의 관계 4개, 각 48자 이내.',
        '별표(*)/말줄임표/이미지 URL/placeholder/마크다운 코드블록은 쓰지 마세요. Persona Card 생성/확정 전에는 STEP 3 또는 다음 단계 진행을 언급하지 마세요.',
      ].join(' ')
    case 'step_2_research':
      return [
        '지금은 STEP 2의 페르소나 이후 키워드 도출 구간입니다. Persona Card가 생성되지 않았다면 STEP 3로 넘어가지 말고 Persona Summary 6개 항목을 먼저 정리하세요.',
        'Persona Card가 생성된 뒤에는 확정 절차를 요구하지 말고 바로 Keywords: Experience와 Keywords: Relationship을 순서대로 도출하세요.',
        '먼저 Keywords: Experience를 도출합니다. 감정, 행동, 공간 키워드를 각각 2~4개로 정리하기 위해 한 번에 질문 1개만 하세요.',
        'Keywords: Experience가 충분히 정리되면 반드시 "## Keywords: Experience" 제목으로 텍스트 결과를 출력하세요.',
        '그 다음 Keywords: Relationship을 도출합니다. 기존 방해 요소와의 관계, 제품이 놓이는 공간과의 관계, 집중/휴식/사용 시간과의 관계를 정리하세요.',
        'Keywords: Relationship이 충분히 정리되면 반드시 "## Keywords: Relationship" 제목으로 텍스트 결과를 출력하세요.',
        '두 키워드 결과는 각각 시각화 배지 생성 대상입니다. 본문에는 "시각화하기 버튼" 같은 UI 안내 문구를 쓰지 마세요.',
        'Keywords: Experience와 Keywords: Relationship이 모두 정리되기 전에는 STEP 3 또는 다음 단계 진행을 언급하지 마세요.',
        '두 키워드 결과가 모두 정리된 뒤에만 다음 STEP 3. 디자인/개발 방향성 도출로 넘어갈지 물어보세요.',
      ].join(' ')
    case 'step_3_direction':
      return [
        '지금은 STEP 3 디자인/개발 방향성 도출입니다. 이 단계는 시장 근거를 바탕으로 방향성을 잡는 단계입니다.',
        'STEP 3에 처음 진입했거나 사용자가 "다음 단계로" 진행한다고 답했다면, 긴 설명을 하지 말고 아래 내부 마커를 포함해 세 가지 리서치 위젯을 보여주세요.',
        '<<AIDEE_DIRECTION_WIDGETS>>',
        'market_size',
        'consumption_keywords',
        'brand_positioning',
        '<</AIDEE_DIRECTION_WIDGETS>>',
        '위 마커는 시스템 UI용이며, 마커 내용 자체를 설명하지 마세요.',
        '사용자가 "시장 규모 리서치 보기"를 선택하면 "## 시장 규모 리서치" 제목으로 TAM/SAM/SOM 관점의 텍스트 리서치를 작성하세요.',
        '사용자가 "소비 트렌드 리서치 보기"를 선택하면 "## 소비 트렌드 리서치" 제목으로 구매 동기와 소비 키워드 중심의 텍스트 리서치를 작성하세요.',
        '사용자가 "경쟁사 리서치 보기"를 선택하면 "## 경쟁사 리서치" 제목으로 경쟁 구도와 브랜드 포지션 중심의 텍스트 리서치를 작성하세요.',
        '한 번에 선택되지 않은 다른 리서치까지 함께 작성하지 마세요.',
        '각 리서치 아래에는 시스템이 별도로 시각화 버튼을 붙일 수 있으므로 버튼 문구를 본문에 쓰지 마세요.',
        '시장 규모, 소비 트렌드, 경쟁사 리서치가 모두 완료되기 전에는 STEP 4 진행을 제안하지 마세요.',
        '세 리서치가 모두 완료되면 STEP 4 스타일 컨셉 도출로 넘어갈지 질문하세요.',
      ].join(' ')
    case 'step_4_style':
      return '지금은 STEP 4 스타일 컨셉 도출입니다. 스타일 레퍼런스 선택으로 이어지도록 무드, 색감, 재질, 형태 기준을 정리하세요.'
    case 'step_5_design':
      return '지금은 STEP 5 디자인 제안입니다. 선택된 스타일 방향을 바탕으로 디자인 제안, 수정, 최종 확정을 관리하세요.'
    case 'step_6_rfp':
      return '지금은 STEP 6 RFP 문서 생성입니다. 확정된 요구사항을 구조화하고 다운로드 가능한 RFP 데이터로 이어질 수 있게 작성하세요. RFP 생성 후에는 STEP 7 협력업체 연결로 넘어갈지 질문하세요.'
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
