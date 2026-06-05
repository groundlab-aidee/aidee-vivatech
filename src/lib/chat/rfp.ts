import { buildReferenceContext, type ProjectContextRecord, type ReferenceImageContextRecord } from '@/lib/chat/context'
import type { GeminiMessage } from '@/lib/chat/gemini'

export type RfpDocument = {
  avoidDirections: string[]
  budgetRange: string
  coreNeeds: string
  coreValue: string
  finalPurpose: string
  implementationNotes: string[]
  mainTarget: string
  mustHaveFeatures: string[]
  nextActions: string[]
  niceToHaveFeatures: string[]
  oneLineDefinition: string
  projectGoal: string
  projectName: string
  referenceSummary: string
  researchInsights: string[]
  sizeOrForm: string
  styleKeywords: string[]
  successCriteria: string[]
  timeline: string
  usageContext: string
}

export function buildRfpPrompt({
  messages,
  project,
  referenceImages,
}: {
  messages: GeminiMessage[]
  project: ProjectContextRecord | null
  referenceImages: ReferenceImageContextRecord[]
}) {
  return `
아래 프로젝트 컨텍스트와 대화 기록을 바탕으로 RFP JSON 객체만 반환하세요.
마크다운, 코드블록, 설명 문장 없이 JSON만 반환하세요.

[스키마]
{
  "projectName": "string",
  "oneLineDefinition": "string",
  "projectGoal": "string",
  "finalPurpose": "string",
  "mainTarget": "string",
  "usageContext": "string",
  "coreNeeds": "string",
  "coreValue": "string",
  "styleKeywords": ["string"],
  "avoidDirections": ["string"],
  "mustHaveFeatures": ["string"],
  "niceToHaveFeatures": ["string"],
  "budgetRange": "string",
  "timeline": "string",
  "sizeOrForm": "string",
  "implementationNotes": ["string"],
  "referenceSummary": "string",
  "researchInsights": ["string"],
  "successCriteria": ["string"],
  "nextActions": ["string"]
}

[프로젝트]
${project?.title || '제목 없음'}

[requirements]
${JSON.stringify(project?.requirements ?? {}, null, 2)}

[레퍼런스 이미지 분석]
${buildReferenceContext(referenceImages)}

[대화 기록]
${messages.map((message) => `[${message.role}] ${message.content}`).join('\n\n')}
`.trim()
}

export function appendRfpJsonBlock({
  rfp,
  text,
}: {
  rfp: RfpDocument
  text: string
}) {
  return `${text}

<<AIDEE_RFP_JSON>>
${JSON.stringify(rfp, null, 2)}
<</AIDEE_RFP_JSON>>`
}

export function extractRfpJsonBlock(text: string) {
  const match = text.match(
    /<<AIDEE_RFP_JSON>>[\s\n]*([\s\S]*?)[\s\n]*<<\/AIDEE_RFP_JSON>>/i
  )

  if (!match) {
    return {
      cleanedText: text.trim(),
      rfp: null as RfpDocument | null,
    }
  }

  const cleanedText = text
    .replace(/\n?<<AIDEE_RFP_JSON>>[\s\S]*?<<\/AIDEE_RFP_JSON>>/i, '')
    .trim()

  try {
    return {
      cleanedText,
      rfp: parseRfpDocument(JSON.parse(match[1])),
    }
  } catch {
    return {
      cleanedText,
      rfp: null as RfpDocument | null,
    }
  }
}

export function formatRfpMarkdown(rfp: RfpDocument) {
  return [
    '# 제품 제안요청서',
    '',
    '## 1. 프로젝트 개요',
    `- 프로젝트명: ${rfp.projectName}`,
    `- 제품 한 줄 정의: ${rfp.oneLineDefinition}`,
    `- 프로젝트 목표: ${rfp.projectGoal}`,
    `- 최종 활용 목적: ${rfp.finalPurpose}`,
    '',
    '## 2. 페르소나',
    `- 메인 타겟: ${rfp.mainTarget}`,
    `- 사용 상황: ${rfp.usageContext}`,
    `- 핵심 니즈 / 문제: ${rfp.coreNeeds}`,
    '',
    '## 3. 제품 방향',
    `- 핵심 가치: ${rfp.coreValue}`,
    `- 스타일 키워드: ${rfp.styleKeywords.join(', ')}`,
    `- 피해야 하는 방향: ${rfp.avoidDirections.join(', ')}`,
    '',
    '## 4. 기능 요구사항',
    '- 반드시 포함할 핵심 기능',
    ...rfp.mustHaveFeatures.map((item) => `- ${item}`),
    '- 있으면 좋은 기능',
    ...rfp.niceToHaveFeatures.map((item) => `- ${item}`),
    '',
    '## 5. 구현 및 제작 조건',
    `- 예산 범위: ${rfp.budgetRange}`,
    `- 목표 기간: ${rfp.timeline}`,
    `- 크기 / 형태 조건: ${rfp.sizeOrForm}`,
    '- 구현 시 주의할 점',
    ...rfp.implementationNotes.map((item) => `- ${item}`),
    '',
    '## 6. 레퍼런스 및 리서치',
    `- 레퍼런스 요약: ${rfp.referenceSummary}`,
    ...rfp.researchInsights.map((item) => `- ${item}`),
    '',
    '## 7. 성공 기준',
    ...rfp.successCriteria.map((item) => `- ${item}`),
    '',
    '## 8. 다음 액션',
    ...rfp.nextActions.map((item) => `- ${item}`),
  ].join('\n')
}

export function parseRfpDocument(value: unknown): RfpDocument | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const candidate = value as Record<string, unknown>
  const stringFields = [
    'projectName',
    'oneLineDefinition',
    'projectGoal',
    'finalPurpose',
    'mainTarget',
    'usageContext',
    'coreNeeds',
    'coreValue',
    'budgetRange',
    'timeline',
    'sizeOrForm',
    'referenceSummary',
  ]
  const arrayFields = [
    'styleKeywords',
    'avoidDirections',
    'mustHaveFeatures',
    'niceToHaveFeatures',
    'implementationNotes',
    'researchInsights',
    'successCriteria',
    'nextActions',
  ]

  for (const field of stringFields) {
    if (typeof candidate[field] !== 'string') {
      return null
    }
  }

  for (const field of arrayFields) {
    if (
      !Array.isArray(candidate[field]) ||
      !(candidate[field] as unknown[]).every((item) => typeof item === 'string')
    ) {
      return null
    }
  }

  return candidate as RfpDocument
}

export function stripCodeFence(text: string) {
  return text
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim()
}
