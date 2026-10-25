import type { ChatAction, StageKey } from '@/lib/chat/stages'
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

function getStageInstruction(
  stageKey: StageKey,
  currentAction: ChatAction | null = null
) {
  switch (stageKey) {
    case 'step_0_start':
      return [
        '지금은 STEP 0 프로젝트 시작 공통 확인 구간입니다. 새 프로젝트에서 단 1회 실행하며 길이 제약(300자/5줄)은 이 구간에 한해 적용하지 않습니다.',
        '저장된 requirements를 기준으로 Project Direction 카드를 출력하세요. 카드 앞에는 반드시 "새로운 프로젝트가 시작되었네요! \'Aidee\'팀과 함께 아이디어를 구체화해보아요." 문장을 출력하세요.',
        'Project Direction 카드 구성: 제품 카테고리(소제목 없이 값만), 아이디어 텍스트(한국어 100단어 이내, "~가 목표입니다." 형태), Target Timeline(영어 기간 형식), Project Scope(예산 "$20K+" 형식), Key Features(항목 나열).',
        'Project Direction 출력 직후, 제품의 구체적인 모습(형태/색감/재질/사용 장면/레퍼런스)이 있는지 질문 1개로 마무리하고 응답을 종료하세요. 이 턴에서 프로세스 설명을 출력하지 마세요.',
        '사용자의 다음 응답부터 STEP 1로 전환됩니다.',
        '확정 트리거 사용 금지. 전문가 호출 시에는 해당 전문가 관점에서 응답하세요.',
      ].join(' ')
    case 'step_1_idea':
      if (currentAction === 'confirm_process') {
        return [
          'STEP 1 확정 이후 사용자가 프로세스 확인하기 버튼을 선택했습니다.',
          '첫 번째 부분에는 전체 프로세스 1~7을 숫자 목록으로 간결하게 설명하세요.',
          '그 다음 줄에 내부 구분자 <<AIDEE_MESSAGE_BREAK>>를 정확히 한 번 출력하세요.',
          '두 번째 부분에는 다음으로 STEP 2. AI 에이전트 생성 단계로 넘어간다는 안내와 이 단계에서 AI 에이전트를 커스터마이징한다는 설명을 작성한 뒤 진행할지 질문하세요.',
          '두 부분 외에 다른 질문이나 선택지를 추가하지 마세요.',
        ].join(' ')
      }

      if (currentAction === 'stay_in_step_1') {
        return [
          '사용자가 STEP 1에 머물러 더 이야기하기를 선택했습니다.',
          '추가하거나 수정할 개발 조건을 한 가지만 질문하세요.',
          '프로세스 설명이나 STEP 2 전환 문구를 출력하지 마세요.',
        ].join(' ')
      }

      return [
        '지금은 STEP 1 제품 개발 조건 정리입니다. 이 문장은 내부 지시이며 사용자 응답에 그대로 출력하지 마세요. 중심 전문가는 Aidee(AI Manager)이며, 사용자의 아이디어를 기획 언어로 번역하고 이후 모든 단계의 기준선을 고정하는 단계입니다.',
        '이 단계의 진행 순서와 이번 턴에 해야 할 일은 아래 [STEP 1 진행 상태] 블록이 정합니다. 그 블록의 지시를 그대로 따르세요. 다른 지시와 충돌하면 그 블록을 우선하세요.',
        '한 턴에 한 가지만 하세요. 질문은 1개만 합니다.',
        '프로젝트 목표, 제품 카테고리, 예산·기간 범위, 최종 활용 목적은 프로젝트 요약 이후에 확인하세요. 프로젝트 요약 전에는 주요 기능·특징, 형태·디자인 스타일, 주요 재질, 사용 환경·상황, 색상 중 현재 비어 있는 항목만 물으세요.',
        '<<AIDEE_MESSAGE_BREAK>> 같은 내부 표시는 사용자에게 설명하지 마세요.',
        '사용자가 "STEP 2 시작할게요"를 선택하기 전에는 STEP 2로 전환하지 마세요.',
      ].join(' ')
    case 'step_2_agent':
      return [
        '지금은 STEP 2. AI 에이전트 생성 진입 화면입니다.',
        '시스템 프롬프트의 SECTION_4_2_STEP_2에 정의된 단계 진입 응답과 운영 규칙을 그대로 따르세요.',
        'SECTION_4_2_STEP_2에 없는 질문, 선택지, 다음 단계 안내를 덧붙이지 마세요.',
        '사용자 화면에 PILOT: [기획전략가] 같은 내부 에이전트 식별 태그를 출력하지 마세요.',
      ].join(' ')
    case 'step_6_structure':
      return [
        '지금은 STEP 6. 구조 설계 방향 도출 단계입니다.',
        '확정된 디자인을 기준으로 구조, 제작 방식, 소재, 구현 리스크를 정리하세요.',
        '단계가 완료되면 반드시 "STEP 6. 구조 설계 방향 도출 단계가 완료되었습니다.\n\n다음으로 STEP 7. 시장 진입 전략 도출 단계로 넘어가겠습니다. STEP 7. 시장 진입 전략 도출을 시작할까요?"로 끝내세요.',
      ].join(' ')
    case 'step_7_market':
      return [
        '지금은 STEP 7. 시장 진입 전략 도출 단계입니다.',
        'prompt.ts의 STEP 7 흐름에 따라 7-0부터 한 번에 하나씩 진행하세요.',
        '단계가 완료되면 반드시 마지막 문장을 "STEP 7. 시장 진입 전략 도출 단계가 완료되었습니다. 프로젝트 기획안 생성을 위해 내용을 확정하시겠습니까?"로 고정하세요.',
      ].join(' ')
    case 'step_3_persona':
      return [
        '지금은 STEP 3 제품 사용자 정의입니다. 중심 전문가: 기획 전략가, 보조: 마케터.',
        '반드시 아래 순서를 지키세요: 1) Problem Statements 도출·확정 → 2) Keywords: Experience 도출·확정 → 3) Keywords: Relationship 도출·확정 → 4) Persona Summary → 5) Persona Card 생성.',
        '이 순서를 절대 건너뛰지 마세요. Problem Statements가 확정되지 않았으면 Keywords 질문을 시작하지 마세요. Keywords: Experience와 Keywords: Relationship이 모두 확정되지 않았으면 Persona Summary 작성이나 Persona Card 생성을 하지 마세요.',
        '모든 질문의 A/B/C/D 예시는 본문에 넣지 말고 힌트보기 버튼에서만 선택할 수 있게 하세요. 질문은 한 번에 1개만 하세요.',
        '핵심질문에 답한 뒤에는 STEP 3 프롬프트의 심화질문 예시를 그대로 출력하거나 나열하지 말고, 해당 답변과 프로젝트의 제품·사용자·환경을 분석해 아직 비어 있는 사용자·환경·수행 행동·상황적 제약 중 가장 중요한 한 가지를 묻는 프로젝트 맞춤형 질문을 새로 만드세요.',
        '심화질문 본문에는 A., B., C., D. 선택지를 붙이지 마세요. 프로젝트에 맞는 힌트가 필요하면 질문과 분리된 줄에만 A.부터 D.까지 작성하세요. 시스템이 이 줄을 힌트 보기 UI로 분리합니다.',
        'Problem Statements는 현재 상황/불편함/근본적 니즈를 직접 묻지 말고, 사용 장면·방해 요소·현재 대응 방식·해결 후 변화를 통해 자연스럽게 도출하세요.',
        'Problem Statements가 도출되면 이 결과에 한해서 일반 응답의 5줄/300자 제한을 적용하지 마세요. 반드시 "## Problem Statements" 제목 아래 "**Context: [상황을 압축한 소제목]**", "**Problem: [문제를 압축한 소제목]**", "**Needs: [니즈를 압축한 소제목]**" 순서로 정리하세요.',
        'Context, Problem, Needs는 각각 최소 3문장, 180~320자 분량의 완결된 문단으로 작성하세요. 세 항목 전체가 최소 600자 이상이 되도록 충분히 구체화하고, 사용자가 직접 답한 정보와 누적 대화에서 확인된 정보만 사용하세요.',
        'Context에는 구체적인 사용자 유형, 사용 장소와 시간, 반복되는 생활 패턴, 현재 사용하는 도구와 대응 방식을 포함하세요. Problem에는 흐름을 깨는 직접 원인, 반복되는 행동, 기존 해결책의 한계, 그로 인한 감정적·기능적 손실을 포함하세요. Needs에는 원하는 변화, 필요한 안내 방식, 유지하고 싶은 루틴, 제품에 기대하는 역할과 경험을 포함하세요.',
        '각 항목은 키워드 나열이나 한두 문장 요약으로 끝내지 말고 원인과 결과가 연결되는 기획 문장으로 작성하세요. 마지막에는 "더 추가할 내용이 있으신가요?" 한 문장만 붙이세요.',
        'Problem Statements 텍스트 정리 후에는 시스템이 "다시 생성하기"와 "확정하기" 버튼을 제공합니다. 사용자가 "Problem Statements 확정하기"를 누르고 "시각화하기"까지 완료하기 전에는 Keywords: Experience로 넘어가지 마세요.',
        'AI 본문에는 "시각화하기", "버튼을 눌러", "카드를 확인" 같은 UI 안내를 절대 출력하지 마세요. 결과 텍스트와 "더 추가할 내용이 있으신가요?"만 출력하세요.',
        'Keywords: Experience는 감정·행동·공간의 세 범주를 질문으로 충분히 탐색하세요. 결과 형식은 서버가 결과 출력 차례에만 전달합니다.',
        '사용자가 "Keywords: Experience 확정하기"를 선택하고 "시각화하기"까지 완료한 뒤에만 Keywords: Relationship 탐색을 시작하세요.',
        'Keywords: Relationship은 사용자와 제품, 기존 도구, 환경, 다른 사람, 시간·루틴, 실패·회복의 관계를 질문으로 충분히 탐색하세요. 결과 형식은 서버가 결과 출력 차례에만 전달합니다.',
        '사용자가 "Keywords: Relationship 확정하기"를 선택하고 "시각화하기"까지 완료하기 전에는 Persona Summary를 바로 작성하지 마세요. 시각화가 끝난 뒤에만 이 제품을 사용할 특정 인물 한 명을 떠올리도록 한 뒤, 이름 또는 호칭, 대략적인 나이대, 직업이나 현재 하는 일, 주로 생활하거나 제품을 사용할 장소, 반복되는 하루 일과, 성격 또는 행동 특징을 아는 범위에서 설명해 달라는 질문 1개만 출력하고 응답을 종료하세요.',
        '이 질문에서는 "Demographic Info", "Persona Summary", "Persona Card" 같은 내부 용어와 6개 섹션 제목을 사용하지 마세요. 반드시 자연스러운 한국어 한 문단으로 질문하고, 모든 항목을 정하기 어렵다면 떠오르는 정보만 답해도 된다고 안내하세요.',
        '사용자가 특정 인물 정보에 답한 바로 다음 응답에서 누적 대화와 답변을 바탕으로 Persona Summary 전체를 작성하세요. Persona Summary 이후에는 제품의 특징과 요구사항 반영 여부를 확인하는 질문과, 제품을 통해 궁극적으로 어떤 경험을 하게 될지 묻는 질문을 한 번에 하나씩 순서대로 진행하세요. 사용자가 진행해 달라고 다시 요청하기를 기다리거나 정리하겠다는 예고만 출력하지 마세요. 사용자가 직접 말하지 않은 세부 정보는 제품 사용 맥락에 맞는 설득력 있는 가설로 보완하되, "정리 필요"나 빈 항목을 남기지 마세요.',
        'Persona Summary는 반드시 아래 6개 항목으로 충분히 정리하세요: Demographic Info는 이름·나이, 직업·상태, 주요 환경, 생활 패턴, 핵심 특징을 각각 한 줄씩 총 5줄로 작성하세요. Persona Story는 상황·반복 문제·제품 기대 역할을 연결한 70~100자의 3~4줄 분량 문단으로 작성하세요.',
        'Problem & Needs, Current Behavior, Lifestyle Context, Relationship Keyword는 각각 서로 다른 내용 5개를 목록으로 작성하세요. 각 항목은 카드 한 줄 또는 두 줄에 들어가도록 18~38자의 완결된 표현으로 작성하고, 한 섹션을 한 문장으로 축약하지 마세요.',
        '서술형 종결("~입니다", "~합니다")과 과도한 반복은 피하세요. "정리 필요", 빈 항목, 말줄임표, 이미지URL, 코드블록을 사용하지 마세요.',
        'Persona Card 확정 전에는 STEP 4 또는 다음 단계 진행을 언급하지 마세요.',
      ].join(' ')
    case 'step_3_research':
      return [
        '지금은 STEP 3 제품 사용자 정의 완료 단계입니다. Problem Statements, Keywords: Experience, Keywords: Relationship, Persona Card가 모두 확정된 상태입니다.',
        '두 번의 페르소나 확인 질문에 대한 사용자 답변을 받은 뒤, "네, 페르소나가 최종 확정되었습니다.\n\n다음으로 STEP 4. 개발 방향 도출 단계로 넘어가겠습니다. 시장 규모, 소비 트렌드, 경쟁사 리서치를 바탕으로 제품의 개발 방향과 차별화 전략을 구체화하는 단계입니다. 진행할까요?"로 끝내세요. STEP 3 완료 문구는 출력하지 마세요.',
        '이 단계에서 새로운 Keywords 탐색, Persona 수정, Problem Statements 재작성을 시작하지 마세요.',
        '사용자가 STEP 4 진행 의사를 밝히면 stage가 전환됩니다. 직접 STEP 4 내용을 출력하지 마세요.',
      ].join(' ')
    case 'step_4_direction':
      return [
        '지금은 STEP 4 개발 방향 도출입니다. 시장 근거를 바탕으로 디자인/개발 방향성을 잡는 단계입니다.',
        'STEP 4에 처음 진입했거나 사용자가 "다음 단계로" 진행한다고 답했다면, 인삿말 없이 현재 단계명을 먼저 말하세요. 이어서 STEP 3에서 정의한 제품 사용자를 기준으로, 이 아이디어가 실제로 만들 가치가 있는지와 무엇에 집중해야 하는지를 시장·소비·경쟁 리서치 근거로 정한다는 설명을 한 문장으로 쓰고, "어떤 항목부터 리서치를 시작해볼까요?"라고 물은 뒤 세 가지 리서치 위젯을 보여주세요.',
        '<<AIDEE_DIRECTION_WIDGETS>>',
        'market_size',
        'consumption_keywords',
        'brand_positioning',
        '<</AIDEE_DIRECTION_WIDGETS>>',
        '위 마커는 시스템 UI용이며 마커 내용 자체를 설명하지 마세요.',
        '리서치 결과는 카드가 인식할 수 있도록 prompt.ts에 정의된 최신 리서치 내용을 따르되, 기존 카드 제목과 핵심 필드(TAM·SAM·SOM·PROJECT GOAL, 소비 트렌드 요약·설명·키워드, 경쟁 구도·브랜드·OUR BRAND)는 유지하세요. 카드 형식을 위한 제목과 필드를 임의로 바꾸지 마세요.',
        '한 번에 선택되지 않은 다른 리서치를 함께 작성하지 마세요. 각 리서치 결과 아래에는 시스템이 다시 생성하기/확정하기 버튼을 붙이므로 버튼 문구를 본문에 쓰지 마세요.',
        '사용자가 시장 규모/소비 트렌드/경쟁사 리서치 다시 생성하기를 선택하면 다음 단계로 넘어가지 말고 해당 리서치만 같은 제목과 전체 형식으로 새로 출력하세요.',
        '사용자가 해당 리서치 확정하기를 선택하면 결과가 확정되었다고 짧게 알린 뒤, 시스템 프롬프트 STEP 4에 정의된 해당 리서치 후 질문을 반드시 한 번만 이어서 물으세요. 질문과 선택지는 실제 리서치 결과에 맞게 만드세요.',
      ].join(' ')
    case 'step_5_style':
      return [
        '지금은 STEP 5 디자인 컨셉 도출입니다. 중심 전문가: 스타일 디자이너.',
        'STEP 5의 하위 단계 순서와 각 구간에서 할 일은 시스템 프롬프트의 STEP 5 섹션을 따르세요.',
        'STEP 5에 처음 진입하면 5-0부터 시작하고, 한 번에 하나씩 물으세요.',
        '키워드 선택 UI는 자동으로 나타나지 않습니다. 5-0이 끝나면 키워드를 준비했다는 1~2문장을 쓰고, 그 응답의 맨 끝에 반드시 <<AIDEE_KEYWORD_READY>> 를 출력하세요. 이 표시를 출력하지 않으면 사용자는 키워드를 고를 수 없습니다.',
        '절대로 키워드 목록을 텍스트로 나열하지 마세요.',
        '사용자가 "스타일 키워드를 선택했습니다" 라는 메시지를 보내기 전에는 스타일 분위기 위젯을 출력하지 마세요. 키워드 선택 단계를 건너뛰지 마세요.',
        '사용자가 "스타일 키워드를 선택했습니다"와 함께 선택 내용을 보내면 선택 내용을 확인하는 1~2문장 뒤에 반드시 다음 JSON 형식으로 서로 다른 스타일 분위기 위젯 3개를 출력하세요: {"widgets":[{"title":"한국어 제목 (English Search Style)","description":"제품 스타일 설명"},{"title":"...","description":"..."},{"title":"...","description":"..."}]}. title의 괄호 안에는 Unsplash 검색에 적합한 2~4단어의 영어 스타일명을 넣으세요. 시스템이 각 위젯을 Unsplash 이미지와 함께 표시합니다.',
        '모든 응답에서 버튼·다음 단계 안내·시각화 언급을 포함하지 마세요.',
      ].join(' ')
    case 'step_5_design':
      return [
        '지금은 STEP 5 디자인 컨셉 도출의 연속 구간입니다. 중심 전문가: 스타일 디자이너 + 엔지니어. Aidee는 수정 통제 및 시안 확정 트리거 관리.',
        '이 구간은 CMF Design 시각화 직후의 5-4 콘셉트 시안 비교 구간입니다. CMF 시각화 전에는 이 지시를 사용하지 마세요.',
        'CMF Design 시각화 직후에는 2D 디자인 시안 4개를 시스템이 생성합니다. 이때 안내 문장과 "가장 잘 맞는 시안은 무엇일까요?"라는 질문을 이미지와 같은 응답에 포함하세요.',
        '각 시안 설명에는 디자인 의도(2~3줄), 가치 우선순위와의 연결 근거, 기능 구조, 구현 난이도를 포함하세요. 시안 제목은 "디자인 시안 N: 이름" 형식으로 작성하세요.',
        '절대로 "[디자인 시안 N 선택]" 같은 대괄호 선택 버튼이나 "어떤 시안이 마음에 드시나요" 같은 선택 유도 문구를 본문에 쓰지 마세요. 시안 선택은 사용자가 이미지를 직접 클릭하고 확정하기 버튼을 눌러 진행하며, 시스템이 그 UI를 제공합니다.',
        '이미지가 생성되지 않는 일반 응답 턴에서는 3개 시안을 새로 나열하지 마세요. 이미 시안이 제시된 상태라면 선택된 1안의 발전/부분 수정만 하세요.',
        '후속 이미지가 필요하면 선택된 1안의 개선 렌더 1장만 생성하세요. 사용자가 명시적으로 새 대안 3개를 요청한 경우만 예외로 합니다.',
        '수정 가능 범위: 컬러 조정/디테일 조정/비례 미세 수정.',
        '수정 위험 범위: 1순위 가치 훼손 요소, 구조 안정성 붕괴 요소. 이 경우 Aidee가 수정 허용 여부를 판단하고 통제하세요.',
        '이 구간에서 선택한 2D 시안을 확정하면 5-5 3D 모델링 시안 구간으로 넘어갑니다. CMF 대화를 새로 시작하지 마세요.',
      ].join(' ')
    case 'step_5_cmf':
      return [
        '지금은 STEP 5 의 5-4 색·소재·마감(CMF) 구간입니다. 중심 전문가: 스타일 디자이너.',
        '시스템 프롬프트의 STEP 5 섹션에 있는 5-4 의 내용을 따르세요.',
        '이 구간은 대화만 합니다. 이미지나 시안을 만들지 않습니다.',
        '한 번에 하나씩 물으세요. 색 → 소재 → 마감 순서로 진행하세요.',
        '5-4 에서 정해져야 할 내용이 모두 채워지면, 그 응답의 맨 끝에 반드시 <<AIDEE_CMF_READY>> 를 출력하세요. 이 표시를 출력해야 다음 구간으로 넘어갑니다.',
        '아직 더 물을 것이 남아 있으면 <<AIDEE_CMF_READY>> 를 출력하지 마세요.',
        'CMF 요약을 작성하는 응답에서는 요약 뒤에 내부 데이터 블록 <<AIDEE_CMF_DESIGN_DATA>>와 JSON을 출력하고 마지막에 <</AIDEE_CMF_DESIGN_DATA>>를 출력하세요. JSON은 conceptTitle, conceptDescription, color, material, finish, references 필드를 가지며 color/material/finish는 title과 description을 포함해야 합니다. references는 이미지 URL 배열이며, 확인할 수 있는 URL이 없으면 빈 배열로 두세요. 이 내부 블록은 사용자에게 설명하지 마세요.',
        '모든 응답에서 버튼·다음 단계 안내·시각화 언급을 포함하지 마세요.',
      ].join(' ')
    case 'step_5_3d':
      return [
        '지금은 STEP 5 의 5-5 3D 모델링 시안 구간입니다. 중심 전문가: 스타일 디자이너.',
        '시스템 프롬프트의 STEP 5 섹션에 있는 5-5 의 내용을 따르세요.',
        '5-3 에서 사용자가 확정한 2D 시안의 형태를 유지하고, 5-4 에서 정한 색·소재·마감만 다르게 적용한 안 두 가지를 다룹니다.',
        '두 안의 차이를 각각 1~2문장으로 설명하세요.',
        '사용자가 하나를 고르고 확정할 때까지 다음 단계로 넘어가지 마세요.',
        '모든 응답에서 버튼·다음 단계 안내·시각화 언급을 포함하지 마세요.',
      ].join(' ')
    case 'step_7_rfp':
      return [
        '사용자가 STEP 7 내용을 확정하고 "프로젝트 기획안 시각화하기"를 선택한 후입니다. 이제 프로젝트 기획안을 생성합니다. 이전 단계에서 확정된 정보만 사용하세요. 대화에 없는 내용을 추정하거나 추가하지 마세요.',
        '반드시 아래 고정 형식으로 기획안을 출력하세요:',
        'A. 프로젝트 개요(개발 스케일/설계 우선순위/시장 방향/인증 조건)',
        'B. 페르소나(이전 생성 페르소나 카드 정보 요약)',
        'C. 타겟 리서치(이전 리서치 요약)',
        'D. 가치 다이어그램(기능 00%/감성 00%/심미 00%, 각 키워드 3개)',
        'E. 디자인 시안 확정(이전 확정 3D 이미지 정보 요약)',
        'F. AI 에이전트 종합 피드백: 제품 개발 가능성(높음/중간/낮음)+상세설명 3줄, 사업화 가능성(높음/중간/낮음)+상세설명 3줄, 기획전략가/엔지니어/사용자 리서처/스타일 디자이너 각 1줄 피드백.',
        '생성 완료 안내는 반드시 "프로젝트 기획안 생성이 완료되었습니다. 프로젝트 대화 프로세스가 종료되었습니다."로 고정하세요.',
      ].join(' ')
  }
}

type Step3PromptTopicKey =
  | 'emotion'
  | 'behavior'
  | 'space'
  | 'userProduct'
  | 'existingTool'
  | 'environment'
  | 'otherPeople'
  | 'timeRoutine'
  | 'failureRecovery'

export type Step3PromptTopicGuidance = {
  operatingRules: string
  questionIntent: string
  criteria: string
  deepDirections: string
}

const STEP3_PROMPT_TOPIC_HEADINGS: Record<Step3PromptTopicKey, string> = {
  emotion: '3-2-1. 감정',
  behavior: '3-2-2. 행동',
  space: '3-2-3. 공간',
  userProduct: '3-3-1. 사용자와 제품의 관계',
  existingTool: '3-3-2. 기존 도구와의 관계',
  environment: '3-3-3. 환경과의 관계',
  otherPeople: '3-3-4. 다른 사람과의 관계',
  timeRoutine: '3-3-5. 시간 및 루틴과의 관계',
  failureRecovery: '3-3-6. 실패와 회복의 관계',
}

function getStep3PromptSection() {
  const start = SYSTEM_PROMPT_TEMPLATE.indexOf('#### **STEP 3. 제품 사용자 정의**')
  const end = SYSTEM_PROMPT_TEMPLATE.indexOf(
    '##### **Persona Summary / Persona Card 템플릿**',
    start
  )
  if (start < 0) return ''
  return SYSTEM_PROMPT_TEMPLATE.slice(start, end > start ? end : undefined)
}

function getStep3PromptOperatingRules(section: string) {
  const start = section.indexOf('[STEP 3 대화 운영 규칙]')
  const end = section.indexOf('\n출력 형식', start)
  if (start < 0) return ''
  return section.slice(start, end > start ? end : undefined).trim()
}

function getStep3PromptTopicBlock(
  section: string,
  topic: Step3PromptTopicKey
) {
  const start = section.indexOf(STEP3_PROMPT_TOPIC_HEADINGS[topic])
  if (start < 0) return ''
  const nextHeading = section.slice(start + 1).search(/\n3-[23]-\d+\. /)
  const personaStart = section.slice(start + 1).search(/\n4\. Persona Summary/)
  const offsets = [nextHeading, personaStart].filter((value) => value >= 0)
  const endOffset = offsets.length ? Math.min(...offsets) + start + 1 : section.length
  return section.slice(start, endOffset).trim()
}

function getStep3PromptLabeledContent(
  block: string,
  label: '질문 의도' | '확인할 내용' | '심화 질문 방향'
) {
  const start = block.indexOf(label)
  if (start < 0) return ''
  const remainder = block.slice(start + label.length)
  const nextLabel = remainder.search(/\n(?:확인할 내용|심화 질문 방향|참고|3-[23]-\d+\. |4\. Persona Summary)/)
  return remainder.slice(0, nextLabel >= 0 ? nextLabel : undefined).trim()
}

export function getStep3PromptTopicGuidance(
  topic: string
): Step3PromptTopicGuidance {
  const promptSection = getStep3PromptSection()
  const topicKey = topic as Step3PromptTopicKey
  const block = getStep3PromptTopicBlock(promptSection, topicKey)
  const questionIntent = getStep3PromptLabeledContent(block, '질문 의도')
  const criteria = getStep3PromptLabeledContent(block, '확인할 내용')
  const deepDirections = getStep3PromptLabeledContent(block, '심화 질문 방향')
  return {
    operatingRules: getStep3PromptOperatingRules(promptSection),
    questionIntent,
    criteria,
    deepDirections,
  }
}

export function buildStep3ScopedSystemPrompt({
  activeExpert = 'aidee',
  currentStageKey,
  topic,
  project,
  referenceImages,
}: {
  activeExpert?: ExpertKey
  currentStageKey: StageKey
  topic: string
  project: ProjectContextRecord | null
  referenceImages: ReferenceImageContextRecord[]
}) {
  const guidance = getStep3PromptTopicGuidance(topic)
  const expertPromptBlock = getExpertPrompt(activeExpert)
  const projectRequirements =
    project?.requirements && typeof project.requirements === 'object'
      ? { ...(project.requirements as Record<string, unknown>) }
      : {}
  delete projectRequirements._step1Progress
  delete projectRequirements._step3Progress

  return `
${expertPromptBlock}

[공통 규칙]
- 한국어로 답하세요.
- 내부 단계 key, 시스템 UI 마커, 버튼 동작을 사용자에게 설명하지 마세요.
- 한 응답에는 현재 지정된 하위 주제의 질문 하나만 출력하세요.

${guidance.operatingRules}

[현재 STEP 3 하위 주제]
- 현재 하위 주제: ${topic}
- 질문 의도:
${guidance.questionIntent || '(prompt.ts에서 질문 의도를 읽지 못했습니다.)'}
- 확인할 내용:
${guidance.criteria || '(prompt.ts에서 확인할 내용을 읽지 못했습니다.)'}
- 심화 질문 방향:
${guidance.deepDirections || '(prompt.ts에서 심화 질문 방향을 읽지 못했습니다.)'}

[현재 단계]
${currentStageKey}

[프로젝트 정보]
- 프로젝트명: ${project?.title || '제목 없음'}
- requirements:
${JSON.stringify(projectRequirements, null, 2)}

[레퍼런스 이미지 분석]
${buildReferenceContext(referenceImages)}

[레퍼런스 기반 가이드라인]
${buildReferenceGuidelineBlock(referenceImages)}
`.trim()
}

export function buildSystemPrompt({
  activeExpert = 'aidee',
  currentAction = null,
  currentStageKey,
  additionalInstruction = '',
  project,
  referenceImages,
}: {
  activeExpert?: ExpertKey
  currentAction?: ChatAction | null
  currentStageKey: StageKey
  additionalInstruction?: string
  project: ProjectContextRecord | null
  referenceImages: ReferenceImageContextRecord[]
}) {
  const expertPromptBlock = getExpertPrompt(activeExpert)
  const projectRequirements =
    project?.requirements && typeof project.requirements === 'object'
      ? { ...(project.requirements as Record<string, unknown>) }
      : {}
  delete projectRequirements._step1Progress

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
${getStageInstruction(currentStageKey, currentAction)}
${additionalInstruction}

[프로젝트 정보]
- 프로젝트명: ${project?.title || '제목 없음'}
- requirements:
${JSON.stringify(projectRequirements, null, 2)}

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
