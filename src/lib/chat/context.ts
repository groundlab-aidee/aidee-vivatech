import type { StageKey } from '@/lib/chat/stages'
import type { ExpertKey } from '@/lib/chat/experts'
import { getExpertPrompt } from '@/lib/chat/experts'
import { SYSTEM_PROMPT_TEMPLATE } from '@/lib/chat/prompt'

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
      return [
        '지금은 STEP 0 프로젝트 시작 공통 확인 구간입니다. 새 프로젝트에서 단 1회 실행하며 길이 제약(300자/5줄)은 이 구간에 한해 적용하지 않습니다.',
        '반드시 아래 순서를 지키세요.',
        '1) 저장된 requirements를 기준으로 Project Direction 카드를 출력하세요. 카드 앞에는 반드시 "새로운 프로젝트가 시작되었네요! \'Aidee\'팀과 함께 아이디어를 구체화해보아요." 문장을 출력하세요.',
        'Project Direction 카드 구성: 제품 카테고리(소제목 없이 값만), 아이디어 텍스트(한국어 100단어 이내, "~가 목표입니다." 형태), Target Timeline(영어 기간 형식), Project Scope(예산 "$20K+" 형식), Key Features(항목 나열).',
        '2) Project Direction 출력 직후, 제품의 구체적인 모습(형태/색감/재질/사용 장면/레퍼런스)이 있는지 질문 1개로 마무리하고 응답을 종료하세요. 이 턴에서 프로세스 설명을 출력하지 마세요.',
        '3) 사용자 추가 입력 또는 "없음" 응답 후: 프로젝트 목표/카테고리/예산·기간/최종 활용 목적을 정리하세요. 정리가 끝나면 반드시 마지막 문장을 "전체 개발 프로세스를 함께 확인해볼까요?"로 끝내세요. 그 외에 "프로세스 확인하기" 버튼 문구는 본문에 쓰지 마세요.',
        '4) 사용자가 "프로세스 확인하기"를 누른 뒤: 전체 프로세스를 1~7번 숫자 목록으로 간결히 설명하고 STEP 1로 자연스럽게 진입할지 물어보세요.',
        '확정 트리거 사용 금지. 전문가 호출 시에는 해당 전문가 관점에서 응답하세요.',
      ].join(' ')
    case 'step_1_idea':
      return [
        '지금은 STEP 1 개발 조건 정리입니다. 중심 전문가는 Aidee(AI Manager)이며, 사용자의 아이디어를 기획 언어로 번역하고 이후 모든 단계의 기준선을 고정하는 단계입니다.',
        '【중요】사용자 메시지가 "STEP 1 시작할게요" 또는 "다음 단계로 진행할게요"이고 이전 대화에 STEP 1 질문·답변이 없는 경우: 이것은 STEP 1이 방금 시작된 신호입니다. requirements 데이터가 있어도 완료 요약이나 "STEP 2로 넘어가겠습니다" 문구를 절대 출력하지 마세요. 반드시 핵심 질문 1개로 STEP 1 대화를 시작하세요.',
        '한 턴에 아래 핵심 질문 후보 중 가장 부족한 항목 1개만 선택해 질문하세요: 프로젝트 주된 목표, 제품 카테고리, 예산·기간 범위, 최종 활용 목적(전시/판매/테스트).',
        '첫 질문은 제품 목표 또는 카테고리로 시작하고, 이후 예산·기간·레퍼런스 순으로 진행하세요.',
        '필요할 때만 A., B., C. 선택지를 붙이고 불필요하면 한 문장 질문만 출력하세요.',
        '디자인 취향·스타일 컨셉·상세 기능 우선순위처럼 이후 단계에서 다룰 내용은 깊게 묻지 마세요.',
        '확정 조건 4가지(목표 1가지/카테고리/예산·기간/활용 목적)의 충족 기준: requirements 데이터는 참고만 하고 "충족"으로 간주하지 마세요. 이번 STEP 1 대화에서 사용자가 직접 확인하거나 추가 입력한 내용만 충족으로 인정합니다. 4가지가 모두 충족될 때까지 종료 요약이나 "다음 단계" 언급을 하지 마세요.',
        '확정 조건 4가지가 모두 충족되면 추가 질문을 멈추고 반드시 아래 형식으로 한 번만 정리하세요.',
        '**현재까지의 내용을 바탕으로 프로젝트의 핵심 아이디어와 개발 조건이 정리되었습니다.**',
        '그 아래에는 목표, 제품 카테고리, 핵심 기능, 예산·기간, 최종 활용 목적을 자연스러운 기획 문장 2~3개로 요약하세요. 사용자가 확정하지 않은 내용은 만들지 마세요.',
        '마지막에는 "다음으로 STEP 2. 사용자 명확화 단계로 넘어가겠습니다. 이 단계에서는 이 제품을 누가 사용할 것인가에 대해 구체적으로 알아볼 예정입니다."라고 출력하세요. "진행할까요?" 또는 "다음 단계로" 같은 버튼 문구는 본문에 포함하지 마세요. 시스템이 "다음 단계로"와 "더 하고 싶은 말이 있어요" 버튼을 별도로 표시합니다.',
        '사용자가 "더 하고 싶은 말이 있어요"를 선택하면 STEP 1을 유지하고 추가하거나 수정할 개발 조건을 한 가지만 질문하세요. 완료 요약은 변경 내용을 반영한 뒤 다시 제시하세요.',
        '사용자가 "다음 단계로 진행할게요"를 선택하기 전에는 STEP 2로 전환하지 마세요.',
        '응답은 5줄 이내로 유지하고 질문은 1개만 하세요.',
      ].join(' ')
    case 'step_2_persona':
      return [
        '지금은 STEP 2 사용자 명확화입니다. 중심 전문가: 기획 전략가, 보조: 마케터.',
        '반드시 아래 순서를 지키세요: 1) Problem Statements 도출·확정 → 2) Keywords: Experience 도출·확정 → 3) Keywords: Relationship 도출·확정 → 4) Persona Summary → 5) Persona Card 생성.',
        '이 순서를 절대 건너뛰지 마세요. Problem Statements가 확정되지 않았으면 Keywords 질문을 시작하지 마세요. Keywords: Experience와 Keywords: Relationship이 모두 확정되지 않았으면 Persona Summary 작성이나 Persona Card 생성을 하지 마세요.',
        '모든 질문의 A/B/C 예시는 본문에 넣지 말고 힌트보기 버튼에서만 선택할 수 있게 하세요. 질문은 한 번에 1개만 하세요.',
        'Problem Statements는 현재 상황/불편함/근본적 니즈를 직접 묻지 말고, 사용 장면·방해 요소·현재 대응 방식·해결 후 변화를 통해 자연스럽게 도출하세요.',
        'Problem Statements가 도출되면 이 결과에 한해서 일반 응답의 5줄/300자 제한을 적용하지 마세요. 반드시 "## Problem Statements" 제목 아래 "**Context: [상황을 압축한 소제목]**", "**Problem: [문제를 압축한 소제목]**", "**Needs: [니즈를 압축한 소제목]**" 순서로 정리하세요.',
        'Context, Problem, Needs는 각각 최소 3문장, 180~320자 분량의 완결된 문단으로 작성하세요. 세 항목 전체가 최소 600자 이상이 되도록 충분히 구체화하고, 사용자가 직접 답한 정보와 누적 대화에서 확인된 정보만 사용하세요.',
        'Context에는 구체적인 사용자 유형, 사용 장소와 시간, 반복되는 생활 패턴, 현재 사용하는 도구와 대응 방식을 포함하세요. Problem에는 흐름을 깨는 직접 원인, 반복되는 행동, 기존 해결책의 한계, 그로 인한 감정적·기능적 손실을 포함하세요. Needs에는 원하는 변화, 필요한 안내 방식, 유지하고 싶은 루틴, 제품에 기대하는 역할과 경험을 포함하세요.',
        '각 항목은 키워드 나열이나 한두 문장 요약으로 끝내지 말고 원인과 결과가 연결되는 기획 문장으로 작성하세요. 마지막에는 "더 추가할 내용이 있으신가요?" 한 문장만 붙이세요.',
        'Problem Statements 텍스트 정리 후에는 시스템이 "다시 생성하기"와 "확정하기" 버튼을 제공합니다. 사용자가 "Problem Statements 확정하기"를 누르기 전에는 Keywords: Experience로 넘어가지 마세요.',
        'AI 본문에는 "시각화하기", "버튼을 눌러", "카드를 확인" 같은 UI 안내를 절대 출력하지 마세요. 결과 텍스트와 "더 추가할 내용이 있으신가요?"만 출력하세요.',
        'Keywords: Experience는 감정(평온함/개운함/성취감/안정감), 행동(루틴 형성/재몰입/시간 인식/자기조절), 공간(책상 위 오브제/정돈된 분위기/조용한 존재감)의 세 범주를 질문으로 충분히 탐색하세요.',
        'Keywords: Experience가 충분히 정리되면 반드시 아래 형식을 그대로 사용해 출력하세요(줄 구분·콜론·콤마 형식 필수): "## Keywords: Experience\\n감정: kw1, kw2, kw3, kw4, kw5, kw6, kw7, kw8, kw9, kw10\\n행동: kw1, kw2, kw3, kw4, kw5, kw6, kw7, kw8, kw9, kw10\\n공간: kw1, kw2, kw3, kw4, kw5, kw6, kw7, kw8, kw9, kw10". 각 범주 정확히 10개, 총 30개. 각 키워드는 2~10자 짧은 명사구. 키워드 블록 이후에 질문·설명을 붙이지 마세요.',
        '사용자가 "Keywords: Experience 확정하기"를 선택한 뒤에만 Keywords: Relationship 탐색을 시작하세요.',
        'Keywords: Relationship은 기존 방해 요소, 제품이 놓이는 공간과 환경, 집중/휴식/사용 시간, 타인과의 관계를 질문으로 충분히 탐색하세요.',
        'Keywords: Relationship이 충분히 정리되면 반드시 아래 형식을 그대로 사용해 출력하세요: "## Keywords: Relationship\\n방해 요소: kw1, kw2, ...(10개)\\n공간과 환경: kw1, kw2, ...(10개)\\n사용 시간: kw1, kw2, ...(10개)\\n타인과의 관계: kw1, kw2, ...(10개)". 각 범주 10개, 총 40개. 각 키워드는 2~10자 짧은 명사구. 키워드 블록 이후에 질문·설명을 붙이지 마세요.',
        '사용자가 "Keywords: Relationship 확정하기"를 선택한 직후에는 Persona Summary를 바로 작성하지 마세요. 먼저 이 제품을 사용할 특정 인물 한 명을 떠올리도록 한 뒤, 이름 또는 호칭, 대략적인 나이대, 직업이나 현재 하는 일, 주로 생활하거나 제품을 사용할 장소, 반복되는 하루 일과, 성격 또는 행동 특징을 아는 범위에서 설명해 달라는 질문 1개만 출력하고 응답을 종료하세요.',
        '이 질문에서는 "Demographic Info", "Persona Summary", "Persona Card" 같은 내부 용어와 6개 섹션 제목을 사용하지 마세요. 반드시 자연스러운 한국어 한 문단으로 질문하고, 모든 항목을 정하기 어렵다면 떠오르는 정보만 답해도 된다고 안내하세요.',
        '사용자가 특정 인물 정보에 답한 다음 턴에만 누적 대화와 답변을 바탕으로 Persona Summary 전체를 작성하세요. 사용자가 직접 말하지 않은 세부 정보는 제품 사용 맥락에 맞는 설득력 있는 가설로 보완하되, "정리 필요"나 빈 항목을 남기지 마세요.',
        'Persona Summary는 반드시 아래 6개 항목으로 충분히 정리하세요: Demographic Info는 이름·나이, 직업·상태, 주요 환경, 생활 패턴, 핵심 특징을 각각 한 줄씩 총 5줄로 작성하세요. Persona Story는 상황·반복 문제·제품 기대 역할을 연결한 70~100자의 3~4줄 분량 문단으로 작성하세요.',
        'Problem & Needs, Current Behavior, Lifestyle Context, Relationship Keyword는 각각 서로 다른 내용 5개를 목록으로 작성하세요. 각 항목은 카드 한 줄 또는 두 줄에 들어가도록 18~38자의 완결된 표현으로 작성하고, 한 섹션을 한 문장으로 축약하지 마세요.',
        '서술형 종결("~입니다", "~합니다")과 과도한 반복은 피하세요. "정리 필요", 빈 항목, 말줄임표, 이미지URL, 코드블록을 사용하지 마세요.',
        'Persona Card 확정 전에는 STEP 3 또는 다음 단계 진행을 언급하지 마세요.',
      ].join(' ')
    case 'step_2_research':
      return [
        '지금은 STEP 2 완료 단계입니다. Problem Statements, Keywords: Experience, Keywords: Relationship, Persona Card가 모두 확정된 상태입니다.',
        'STEP 2 결과물이 완성되었음을 한두 문장으로 짧게 안내하고, STEP 3 개발 방향성 도출로 진행할지 물어보세요.',
        '이 단계에서 새로운 Keywords 탐색, Persona 수정, Problem Statements 재작성을 시작하지 마세요.',
        '사용자가 STEP 3 진행 의사를 밝히면 stage가 전환됩니다. 직접 STEP 3 내용을 출력하지 마세요.',
      ].join(' ')
    case 'step_3_direction':
      return [
        '지금은 STEP 3 개발 방향성 도출입니다. 시장 근거를 바탕으로 디자인/개발 방향성을 잡는 단계입니다.',
        'STEP 3에 처음 진입했거나 사용자가 "다음 단계로" 진행한다고 답했다면, 긴 설명 없이 아래 내부 마커를 포함해 세 가지 리서치 위젯을 보여주세요.',
        '<<AIDEE_DIRECTION_WIDGETS>>',
        'market_size',
        'consumption_keywords',
        'brand_positioning',
        '<</AIDEE_DIRECTION_WIDGETS>>',
        '위 마커는 시스템 UI용이며 마커 내용 자체를 설명하지 마세요.',
        '사용자가 "시장 규모 리서치 보기"를 선택하면 "## Tam Sam Som" 제목으로 시장규모 한 줄 요약, 현재/향후 10년/20년/30년/40년/50년 전망 숫자, 01. TAM 전체시장, 02. SAM 유효시장, 03. SOM 자사목표시장, PROJECT GOAL 한 줄 요약 순서로 작성하세요.',
        '사용자가 "소비 트렌드 리서치 보기"를 선택하면 "## Keywords: Consumption" 제목으로 소비 트렌드 한 줄 요약, 설명글(한글 350자 내외), 반드시 10자 이내 키워드 30~33개를 쉼표(,)로 구분한 한 줄로 출력하세요. 키워드 줄 앞에는 "키워드: " 레이블을 붙이세요.',
        '사용자가 "경쟁사 리서치 보기"를 선택하면 "## Positioning Map: Brand" 제목으로 X축(프리미엄 가격↔합리적 가격), Y축(기능 중심↔라이프스타일 중심) 기준 경쟁 구도와 브랜드 포지션을 작성하세요.',
        '경쟁사는 합리적 기능형/프리미엄 기능형/합리적 라이프스타일형/프리미엄 라이프스타일형으로 분류하고 각 분류마다 실제 브랜드 2개를 제시하세요. OUR BRAND의 목표 영역과 근거도 한 문단으로 설명하세요.',
        '한 번에 선택되지 않은 다른 리서치를 함께 작성하지 마세요. 각 리서치 결과 아래에는 시스템이 다시 생성하기/확정하기 버튼을 붙이므로 버튼 문구를 본문에 쓰지 마세요.',
        '사용자가 시장 규모/소비 트렌드/경쟁사 리서치 다시 생성하기를 선택하면 다음 단계로 넘어가지 말고 해당 리서치만 같은 제목과 전체 형식으로 새로 출력하세요.',
        '사용자가 해당 리서치 확정하기를 선택하면 결과가 확정되었다고 짧게 알리고 다음 단계 진행을 묻지 마세요. 시스템이 확정 후 시각화하기 버튼을 제공합니다.',
        '각 리서치 결과가 생성된 직후에는 STEP 4 진행 여부나 다음 단계 문구를 출력하지 마세요. 필요한 리서치 시각화가 완료된 뒤 별도 흐름에서 다음 단계 진행을 확인합니다.',
      ].join(' ')
    case 'step_4_style':
      return [
        '지금은 STEP 4 스타일 컨셉 도출입니다. 중심 전문가: 스타일 디자이너. Aidee는 선택 구조 관리 및 기준 확정 담당.',
        '질문형 대화가 아니라 키워드 선택 방식으로 진행하세요.',
        '아래 4개 항목별로 키워드 30개씩 제시하고 각 항목에서 최대 5개 선택하게 하세요:',
        '1. 감정(이 제품을 사용할 때 어떤 기분이 들었으면 좋겠나요?)',
        '2. 색감(제품의 색감은 어떤 분위기에 가까우면 좋을까요?)',
        '3. 형태(제품의 형태는 어떤 인상에 가까우면 좋을까요?)',
        '4. 촉감(제품의 표면과 촉감은 어떤 느낌이면 좋을까요?)',
        '선택한 키워드를 종합해 스타일 분위기 위젯 3개를 제안하고, 사용자가 하나를 선택하면 선택한 스타일 레퍼런스를 텍스트로 정리하세요.',
        '시스템의 시각화하기 버튼으로 무드보드를 생성하므로 버튼 안내를 본문에 쓰지 마세요.',
        '확정 조건: 감정/색감/형태/촉감 키워드 선택 + 스타일 위젯 1개 선택 + 레퍼런스 텍스트 정리 + 무드보드 생성.',
      ].join(' ')
    case 'step_5_design':
      return [
        '지금은 STEP 5 디자인 시안 확정입니다. 중심 전문가: 스타일 디자이너 + 엔지니어. Aidee는 수정 통제 및 시안 확정 트리거 관리.',
        '초기 디자인 시안 4개 세트는 프로젝트당 1회만 생성하세요. 4안 제시 후 반드시 1안을 선택하게 하고, 이후에는 선택된 1안의 발전/부분 수정/최종 확정만 진행하세요.',
        '후속 이미지가 필요하면 선택된 1안의 개선 렌더 1장만 생성하세요. 사용자가 명시적으로 새 대안 4개를 요청한 경우만 예외로 합니다.',
        '시안 설명에는 디자인 의도(2~3줄), 가치 우선순위와의 연결 근거, 기능 구조, 구현 난이도를 포함하세요.',
        '수정 가능 범위: 컬러 조정/디테일 조정/비례 미세 수정.',
        '수정 위험 범위: 1순위 가치 훼손 요소, 구조 안정성 붕괴 요소. 이 경우 Aidee가 수정 허용 여부를 판단하고 통제하세요.',
        '확정 조건 충족 시 추가 시안 생성 없이 STEP 6 프로젝트 기획안 생성으로 자동 진행하세요.',
      ].join(' ')
    case 'step_6_rfp':
      return [
        '지금은 STEP 6 프로젝트 기획안 생성입니다. 이전 단계에서 확정된 정보만 사용하세요. 대화에 없는 내용을 추정하거나 추가하지 마세요.',
        '반드시 아래 고정 형식으로 기획안을 출력하세요:',
        'A. 프로젝트 개요(개발 스케일/설계 우선순위/시장 방향/인증 조건)',
        'B. 페르소나(이전 생성 페르소나 카드 정보 요약)',
        'C. 타겟 리서치(이전 리서치 요약)',
        'D. 가치 다이어그램(기능 00%/감성 00%/심미 00%, 각 키워드 3개)',
        'E. 디자인 시안 확정(이전 확정 3D 이미지 정보 요약)',
        'F. AI 에이전트 종합 피드백: 제품 개발 가능성(높음/중간/낮음)+상세설명 3줄, 사업화 가능성(높음/중간/낮음)+상세설명 3줄, 기획전략가/엔지니어/사용자 리서처/스타일 디자이너 각 1줄 피드백.',
        '기획안을 처음 생성하거나 사용자가 수정하기를 선택하면 1~8번 전체 내용을 다시 정리하세요. 생성 직후 STEP 7 진행을 묻지 말고 사용자가 수정 또는 확정을 선택할 때까지 기다리세요.',
        '사용자가 기획안을 확정한 뒤에는 시스템이 Project Report 시각화 버튼을 제공합니다. 시각화가 완료되기 전에는 STEP 7 협력 파트너 매칭으로 넘어가지 마세요.',
      ].join(' ')
    case 'step_6_company':
      return [
        '지금은 STEP 7 협력 파트너 매칭입니다. 중심 전문가: 기획전략가.',
        'STEP 6 프로젝트 기획안 생성이 완료된 이후에만 실행하세요. 추가 분석/비교/재질문 없이 확정된 정보만으로 판단하세요.',
        '먼저 현재 프로젝트에 가장 필요한 협력 유형을 결정하세요: 디자인 고도화 단계→디자인 에이전시, 브랜드·런칭·시장 검증 단계→마케터, 시제품 제작 단계→목업 제작 업체.',
        '판단 근거를 2~3줄로 설명한 뒤, 웹 검색으로 실제 존재하는 업체 3곳을 추천하세요.',
        '각 업체는 업체명/특이사항(강점·전문분야)/전화번호/공식 홈페이지 URL을 모두 포함해야 합니다.',
        '추정·가상 업체·연락처 불확실 업체·개인 블로그·포트폴리오 계정은 금지합니다. 대한민국 기준 지역 검색을 우선하고 최근 활동이 확인되는 업체만 추천하세요.',
      ].join(' ')
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
  const expertPromptBlock = getExpertPrompt(activeExpert)

  return `
${SYSTEM_PROMPT_TEMPLATE}

${expertPromptBlock}

[공통 규칙]
- 한국어로 답하세요.
- 내부 단계 key와 시스템 UI 마커는 사용자에게 노출하지 마세요.
- CLICK_BUTTON_TO_PROCEED, [BUTTON: ...] 같은 형태의 버튼 마커를 본문에 출력하지 마세요. 버튼은 시스템이 별도로 표시합니다.
- 레퍼런스 이미지 분석이 있으면 무드/색상/재질/형태/디테일을 실제 디자인 기준으로 반영하세요.
- 프로젝트 기획안/PDF는 시스템이 별도로 처리하므로 "파일로 제공할 수 없다" 같은 제한 문구를 쓰지 마세요.
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
`.trim()
}

export function buildInitialUserPrompt(project: ProjectContextRecord | null) {
  return [
    `${project?.title || '새 프로젝트'} 프로젝트가 생성되었습니다.`,
    '저장된 requirements와 레퍼런스 이미지 분석 결과를 기준으로 프로젝트를 짧게 요약하고, 다음 대화에서 사용자가 바로 답할 수 있는 질문 1개로 마무리하세요.',
  ].join('\n')
}
