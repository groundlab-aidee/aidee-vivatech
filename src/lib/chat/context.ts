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
        '지금은 STEP 1 개발 조건 정리입니다. 저장된 requirements를 기준으로 제품의 역할, 사용 맥락, 핵심 제약만 짧게 정리하세요.',
        '디자인 취향, 스타일 컨셉, 상세 기능 우선순위, 브랜드 감성처럼 이후 단계에서 다룰 내용은 깊게 묻지 마세요.',
        '제품이 누구의 어떤 상황에서 어떤 역할을 하는지 정도가 확인되면 STEP 2 사용자 명확화로 넘어갈지 물어보세요.',
        '응답은 5줄 이내로 유지하고 질문은 1개만 하세요.',
      ].join(' ')
    case 'step_2_persona':
      return [
        '지금은 STEP 2 사용자 명확화입니다. 타겟 사용자, 사용 장면, 불편함, 선택 기준을 확인하고 부족하면 질문 1개만 하세요.',
        '사용자가 겪는 문제는 현재 상황 → 불편함 → 근본적 니즈 순서로 정리하세요.',
        'STEP 3로 넘어가기 전에는 반드시 Persona Summary를 아래 6개 항목으로 정리해야 합니다.',
        'Demographic Info: 이름/나이, 상태, 주요 환경, 생활 패턴, 핵심 특징 5줄.',
        'Persona Story: 사용자가 겪는 상황과 제품 기대 역할이 드러나는 2문장, 120자 이내.',
        'Problem & Needs: 문제와 니즈 4개, 각 40자 이내.',
        'Current Behavior: 현재 행동/대안/반복 패턴 4개, 각 44자 이내.',
        'Lifestyle Context: 자주 쓰는 도구, 머무는 공간, 책상/생활 물건, 선호 취향 4개, 각 48자 이내.',
        'Relationship Keyword: 기존 방해 요소, 공간, 자기관리, 제품 기대 역할과의 관계 4개, 각 48자 이내.',
        'Problem Statements, Keywords: Experience, Keywords: Relationship, Persona Summary는 텍스트로 먼저 정리하며 시스템이 각 결과에 시각화하기 버튼을 제공합니다.',
        '별표(*)/말줄임표/이미지 URL/placeholder/마크다운 코드블록은 쓰지 마세요. Persona Card 생성/확정 전에는 STEP 3 또는 다음 단계 진행을 언급하지 마세요.',
      ].join(' ')
    case 'step_2_research':
      return [
        '지금은 STEP 2의 페르소나 이후 키워드 도출 구간입니다. Persona Card가 생성되지 않았다면 STEP 3로 넘어가지 말고 Persona Summary 6개 항목을 먼저 정리하세요.',
        'Persona Card가 생성된 뒤에는 폐기된 페르소나 리서치 템플릿을 출력하지 말고 Keywords: Experience와 Keywords: Relationship을 순서대로 도출하세요.',
        '먼저 Keywords: Experience를 도출합니다. 감정은 평온함/개운함/성취감/안정감, 행동은 루틴 형성/재몰입/시간 인식/자기조절, 공간은 책상 위 오브제/정돈된 분위기/조용한 존재감과 같은 구체적 방향으로 정리하세요.',
        'Keywords: Experience가 충분히 정리되면 반드시 "## Keywords: Experience" 제목으로 텍스트 결과를 출력하세요.',
        '그 다음 Keywords: Relationship을 도출합니다. 기존 방해 요소와의 관계, 제품이 놓이는 공간과의 관계, 집중/휴식/사용 시간과의 관계를 정리하세요.',
        'Keywords: Relationship이 충분히 정리되면 반드시 "## Keywords: Relationship" 제목으로 텍스트 결과를 출력하세요.',
        '두 키워드 결과는 각각 시각화 배지 생성 대상입니다. 본문에는 "시각화하기 버튼" 같은 UI 안내 문구를 쓰지 마세요.',
        'Keywords: Experience와 Keywords: Relationship이 모두 정리되기 전에는 STEP 3 또는 다음 단계 진행을 언급하지 마세요.',
        '두 키워드 결과가 모두 정리된 뒤에만 다음 STEP 3. 개발 방향성 도출로 넘어갈지 물어보세요.',
      ].join(' ')
    case 'step_3_direction':
      return [
        '지금은 STEP 3 개발 방향성 도출입니다. 이 단계는 시장 근거를 바탕으로 방향성을 잡는 단계입니다.',
        'STEP 3에 처음 진입했거나 사용자가 "다음 단계로" 진행한다고 답했다면, 긴 설명을 하지 말고 아래 내부 마커를 포함해 세 가지 리서치 위젯을 보여주세요.',
        '<<AIDEE_DIRECTION_WIDGETS>>',
        'market_size',
        'consumption_keywords',
        'brand_positioning',
        '<</AIDEE_DIRECTION_WIDGETS>>',
        '위 마커는 시스템 UI용이며, 마커 내용 자체를 설명하지 마세요.',
        '사용자가 "시장 규모 리서치 보기"를 선택하면 "## Tam Sam Som" 제목으로 시장규모 한 줄 요약, 현재/향후 10년/20년/30년/40년/50년 전망 숫자, 01. TAM 전체시장, 02. SAM 유효시장, 03. SOM 자사목표시장, PROJECT GOAL 한 줄 요약 순서로 작성하세요.',
        '사용자가 "소비 트렌드 리서치 보기"를 선택하면 "## Keywords: Consumption" 제목으로 소비 트렌드 한 줄 요약, 설명글, 10자 이내 키워드 33개 순서로 작성하세요.',
        '사용자가 "경쟁사 리서치 보기"를 선택하면 "## Positioning Map: Brand" 제목으로 경쟁 구도와 브랜드 포지션을 작성하세요. X축은 프리미엄 가격 ↔ 합리적 가격, Y축은 기능 중심 ↔ 라이프스타일 중심입니다.',
        '경쟁사는 합리적 기능형, 프리미엄 기능형, 합리적 라이프스타일형, 프리미엄 라이프스타일형으로 분류하고 각 분류마다 실제 브랜드 2개를 제시하세요. OUR BRAND의 목표 영역과 근거도 한 문단으로 설명하세요.',
        '한 번에 선택되지 않은 다른 리서치까지 함께 작성하지 마세요.',
        '각 리서치 아래에는 시스템이 별도로 시각화 버튼을 붙일 수 있으므로 버튼 문구를 본문에 쓰지 마세요.',
        '선택한 리서치가 끝나면 다른 개발 방향성 리서치도 위젯으로 확인할 수 있다고 안내하세요.',
        '사용자가 현재 정보로 충분하다고 판단하거나 다음 단계를 요청하면 STEP 4 스타일 컨셉 도출로 넘어갈지 질문하세요.',
      ].join(' ')
    case 'step_4_style':
      return '지금은 STEP 4 스타일 컨셉 도출입니다. 감정, 색감, 형태, 촉감 키워드를 구체적인 CMF와 비례 언어로 변환하세요. 스타일 분위기 위젯 3개를 제안하고 사용자가 하나를 선택하면 선택한 스타일 레퍼런스를 텍스트로 정리하세요. 시스템의 시각화하기 버튼으로 무드보드를 생성하므로 버튼 안내를 본문에 쓰지 마세요.'
    case 'step_5_design':
      return '지금은 STEP 5 디자인 시안 확정입니다. 초기 디자인 시안 4개 세트는 프로젝트당 1회만 제시하고, 사용자가 1안을 선택한 뒤에는 선택안의 발전·부분 수정·최종 확정만 진행하세요. 후속 이미지는 선택된 1안의 개선 렌더 1장만 생성하며 사용자가 명시적으로 새 대안 4개를 요청한 경우만 예외로 합니다. 시안 설명에는 디자인 의도, 가치 우선순위 연결, 기능 구조, 구현 난이도를 포함하세요.'
    case 'step_6_rfp':
      return '지금은 STEP 6 프로젝트 기획안 생성입니다. 이전 단계에서 확정된 정보만 사용해 프로젝트 개요, 페르소나, 타겟 리서치, 가치 다이어그램, 확정 디자인 시안, AI 에이전트 종합 피드백을 구조화하세요. 시스템이 다운로드 가능한 JSON/PDF를 별도로 생성합니다. 완료 후 STEP 7 협력 파트너 매칭으로 넘어갈지 질문하세요.'
    case 'step_6_company':
      return '지금은 STEP 7 협력 파트너 매칭입니다. 확정된 프로젝트 정보를 기준으로 디자인 고도화, 브랜드·런칭·시장 검증, 시제품 제작 중 현재 필요한 협력 유형을 먼저 판단하고 근거를 2~3줄로 설명하세요. 가상의 업체나 불확실한 연락처는 만들지 마세요.'
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
사용자의 막연한 아이디어를 실제 제품 기획안과 디자인 방향으로 단계적으로 구조화합니다.

[대화 규칙]
- 한국어로 답하세요.
- 한 턴에는 가장 중요한 질문 1개만 하세요.
- 정보가 부족하면 지어내지 말고 물어보세요.
- 내부 단계 key는 사용자에게 노출하지 마세요.
- 레퍼런스 이미지 분석이 있으면 무드, 색상, 재질, 형태, 디테일을 실제 디자인 기준으로 반영하세요.
- 프로젝트 기획안/PDF는 시스템이 별도로 처리할 수 있으므로 "파일로 제공할 수 없다" 같은 제한 문구를 쓰지 마세요.
- 단계명은 1. 개발 조건 정리, 2. 사용자 명확화, 3. 개발 방향성 도출, 4. 스타일 컨셉 도출, 5. 디자인 시안 확정, 6. 프로젝트 기획안 생성, 7. 협력 파트너 매칭으로 고정합니다.
- A., B., C.는 사용자 선택지에만 사용하고 단계 목록에는 숫자를 사용하세요.
- 각 단계의 확정 조건이 충족되기 전에는 다음 단계로 넘어가지 마세요.
- 시스템 UI 버튼이나 내부 마커의 노출 방식을 본문에서 설명하지 마세요.

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
