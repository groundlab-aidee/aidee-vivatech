import { NextResponse } from 'next/server'

import {
  generateGeminiText,
  getGeminiApiKey,
} from '@/lib/chat/gemini'
import {
  SECTION_1_TEAM_STRUCTURE,
  SECTION_5_AGENT_DEBATE,
} from '@/lib/chat/prompt'
import { getProjectForUser, getProjectMessages } from '@/lib/chat/persistence'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 60

const AGENT_NAMES = [
  '기획전략가',
  '디자이너',
  '엔지니어',
  '마케터',
] as const

const FORBIDDEN_AGENT_TITLE_PATTERN =
  /기획전략가|디자이너|엔지니어|마케터/
const AGENT_TITLE_RETRY_INSTRUCTION =
  '직전 응답에 다른 에이전트의 직함이 포함되어 규칙을 위반했다. 직함을 쓰지 말고 내용으로만 지칭해 다시 작성한다.'

type AgentName = (typeof AGENT_NAMES)[number]
type DebateType = '동의·확인' | '단서·지적' | '반박' | '새 논점'
type RenamedDebateType = '같은 결론' | '조건 추가' | '다른 결론' | '새 쟁점'

const DEBATE_TYPES: DebateType[] = [
  '동의·확인',
  '단서·지적',
  '반박',
  '새 논점',
]
const RENAMED_DEBATE_TYPE_MAP: Record<RenamedDebateType, DebateType> = {
  '같은 결론': '동의·확인',
  '조건 추가': '단서·지적',
  '다른 결론': '반박',
  '새 쟁점': '새 논점',
}
const DEBATE_TYPE_PATTERN =
  /^\s*(?:분류|유형|DEBATE_TYPE)\s*:\s*(동의·확인|단서·지적|반박|새 논점|같은 결론|조건 추가|다른 결론|새 쟁점)\s*\n?/i
const SENTENCE_TERMINATOR_PATTERN = /[.!?。！？]+/g
const SENTENCE_LIMITS: Record<DebateType, readonly [number, number]> = {
  '동의·확인': [1, 2],
  '단서·지적': [1, 2],
  반박: [3, 5],
  '새 논점': [3, 5],
}
const FORBIDDEN_CLOSING_EXPRESSIONS = [
  '고려해야 합니다',
  '검토가 필요합니다',
  '판단이 필요합니다',
  '기준이 필요합니다',
  '점검해 볼 필요가 있습니다',
]

type DebateRemark = {
  agentName: AgentName
  text: string
  turnNumber: number
}

function isAgentName(value: unknown): value is AgentName {
  return (
    typeof value === 'string' &&
    AGENT_NAMES.includes(value as AgentName)
  )
}

function normalizeRemarks(value: unknown): DebateRemark[] | null {
  if (!Array.isArray(value)) return null

  const remarks: DebateRemark[] = []
  for (const [index, item] of value.entries()) {
    if (!item || typeof item !== 'object') return null
    const candidate = item as Record<string, unknown>
    if (
      !isAgentName(candidate.agentName) ||
      typeof candidate.text !== 'string' ||
      !candidate.text.trim()
    ) {
      return null
    }
    remarks.push({
      agentName: candidate.agentName,
      text: candidate.text.trim(),
      turnNumber:
        typeof candidate.turnNumber === 'number'
          ? candidate.turnNumber
          : index + 1,
    })
  }
  return remarks
}

export function splitDebateSentences(text: string) {
  const normalized = text.trim()
  if (!normalized) return []

  const sentences: string[] = []
  let sentenceStart = 0
  for (const match of normalized.matchAll(SENTENCE_TERMINATOR_PATTERN)) {
    const sentenceEnd = (match.index ?? 0) + match[0].length
    sentences.push(normalized.slice(sentenceStart, sentenceEnd).trim())
    sentenceStart = sentenceEnd
  }

  const remainder = normalized.slice(sentenceStart).trim()
  if (remainder) sentences.push(remainder)
  return sentences.filter(Boolean)
}

export function countDebateSentences(text: string) {
  return splitDebateSentences(text).length
}

function getForbiddenClosingExpression(text: string) {
  // 한국어 종결 표현만 검사한다.
  const lastSentence = splitDebateSentences(text).at(-1) ?? ''
  const withoutTrailingTerminators = lastSentence
    .replace(/[.!?。！？]+$/u, '')
    .trim()
  return (
    FORBIDDEN_CLOSING_EXPRESSIONS.find((expression) =>
      withoutTrailingTerminators.endsWith(expression)
    ) ?? null
  )
}

function parseGeneratedRemark(value: string) {
  const normalized = normalizeDebateText(value)
  const typeMatch = normalized.match(DEBATE_TYPE_PATTERN)
  const rawType = typeMatch?.[1] as DebateType | RenamedDebateType | undefined
  const type = rawType && rawType in RENAMED_DEBATE_TYPE_MAP
    ? RENAMED_DEBATE_TYPE_MAP[rawType as RenamedDebateType]
    : rawType

  if (rawType && rawType in RENAMED_DEBATE_TYPE_MAP) {
    console.warn('[debate] renamed debate type mapped', {
      renamedType: rawType,
      mappedType: type,
    })
  }

  return {
    text: typeMatch
      ? normalized.slice(typeMatch[0].length).trim()
      : normalized,
    rawType,
    type: type && DEBATE_TYPES.includes(type as DebateType) ? type as DebateType : null,
  }
}

function isDebateRemarkLengthValid(
  type: DebateType | null,
  sentenceCount: number
) {
  if (!type) return false
  const [minimum, maximum] = SENTENCE_LIMITS[type]
  return sentenceCount >= minimum && sentenceCount <= maximum
}

function normalizeDebateText(value: string) {
  return value
    .replace(
      /^(?:\s*(?:PILOT\s*:\s*\[[^\]\n]+\]|\[\s*PILOT\s*:\s*[^\]\n]+\])\s*\n?)+/i,
      ''
    )
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n')
    .trim()
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>
    const question =
      typeof body.question === 'string' ? body.question.trim() : ''
    const projectId =
      typeof body.projectId === 'string' ? body.projectId.trim() : ''
    const agentName = body.agentName
    const turnNumber = body.turnNumber
    const remarks = normalizeRemarks(body.remarks)

    if (
      !question ||
      !projectId ||
      !isAgentName(agentName) ||
      remarks === null ||
      typeof turnNumber !== 'number' ||
      !Number.isInteger(turnNumber) ||
      turnNumber !== remarks.length + 1
    ) {
      return NextResponse.json(
        { error: 'Invalid debate request' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const project = await getProjectForUser({
      projectId,
      supabase,
      userId: user.id,
    })
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }
    const projectMessages = await getProjectMessages({ projectId, supabase })
    const projectConversation = projectMessages.length
      ? projectMessages
          .map((message) => `[${message.role}] ${message.content}`)
          .join('\n\n')
      : '(프로젝트 대화 없음)'

    const debateHistory = remarks.length
      ? remarks
          .map(
            (remark, index) =>
              `${index + 1}. [${remark.agentName}] ${remark.text}`
          )
          .join('\n')
      : '(아직 발언 없음)'

    const apiKey = getGeminiApiKey()
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Gemini API key is not configured' },
        { status: 500 }
      )
    }
    const requiredApiKey = apiKey

    const requestContent = [
      `클릭된 에이전트 이름: ${agentName}`,
      `사용자 질문: ${question}`,
      `이번 발언 순번: ${turnNumber}번째`,
      '',
      '[현재 프로젝트의 전체 대화 맥락 — 원문 순서 유지]',
      projectConversation,
      '',
      '[이번 토론의 지금까지 모든 발언 — 발화자와 순서 포함]',
      debateHistory,
      '',
      '위 정보를 바탕으로 클릭된 에이전트 한 명의 발언 본문만 출력하세요.',
    ]

    let inputTokens = 0
    let outputTokens = 0

    async function generateRemark(extraInstruction?: string) {
      return parseGeneratedRemark(
        await generateGeminiText({
        apiKey: requiredApiKey,
        maxOutputTokens: 4096,
        messages: [
          {
            role: 'user',
            content: [...requestContent, ...(extraInstruction ? ['', extraInstruction] : [])].join(
              '\n'
            ),
          },
        ],
        rejectTruncated: true,
        onUsage: (usage) => {
          inputTokens += usage.inputTokens
          outputTokens += usage.outputTokens
        },
        system: [SECTION_1_TEAM_STRUCTURE, SECTION_5_AGENT_DEBATE].join(
          '\n\n'
        ),
        })
      )
    }

    const typeInstruction =
      '응답 첫 줄에 본문으로 간주하지 않을 내부 표식을 `유형: 동의·확인`, `유형: 단서·지적`, `유형: 반박`, `유형: 새 논점` 중 하나로 먼저 출력하고, 다음 줄부터 발언 본문만 작성한다. 내부 표식은 서버가 제거한다.'
    let generated = await generateRemark(typeInstruction)
    let sentenceCount = countDebateSentences(generated.text)
    let regenerationOccurred = false
    let forbiddenClosingExpression = getForbiddenClosingExpression(generated.text)

    if (
      FORBIDDEN_AGENT_TITLE_PATTERN.test(generated.text) ||
      !isDebateRemarkLengthValid(generated.type, sentenceCount) ||
      Boolean(forbiddenClosingExpression)
    ) {
      regenerationOccurred = true
      const originalType = generated.type
      const lengthInstruction = generated.type
        ? `유형은 ${generated.type}이다. 문장 수가 ${SENTENCE_LIMITS[generated.type][0]}~${SENTENCE_LIMITS[generated.type][1]}문장이 되도록 다시 작성한다. 문장 수는 마침표, 물음표, 느낌표 및 전각 종결 부호(。！？)의 연속된 묶음 하나를 한 문장으로 세며, 마지막에 종결 부호가 없어도 한 문장으로 센다.`
        : typeInstruction
      const closingInstruction =
        '답을 미루는 표현으로 끝내지 말고 자신의 답으로 끝낸다. 마지막 문장을 "고려해야 합니다", "검토가 필요합니다", "판단이 필요합니다", "기준이 필요합니다", "점검해 볼 필요가 있습니다"로 끝내지 않는다.'
      generated = await generateRemark(
        [AGENT_TITLE_RETRY_INSTRUCTION, lengthInstruction, closingInstruction].join(' ')
      )
      if (!generated.type && originalType) {
        generated = { ...generated, type: originalType }
      }
      sentenceCount = countDebateSentences(generated.text)
      forbiddenClosingExpression = getForbiddenClosingExpression(generated.text)

      if (FORBIDDEN_AGENT_TITLE_PATTERN.test(generated.text)) {
        console.warn('[debate] agent title remained after one retry', {
          agentName,
          turnNumber,
        })
      }
    }

    if (!generated.text) {
      throw new Error('Gemini returned an empty debate remark')
    }

    const lengthRange = generated.type
      ? SENTENCE_LIMITS[generated.type].join('~')
      : '확인 불가'
    const lengthPassed = isDebateRemarkLengthValid(
      generated.type,
      sentenceCount
    )
    const closingPassed = !forbiddenClosingExpression
    const passed =
      lengthPassed &&
      closingPassed &&
      !FORBIDDEN_AGENT_TITLE_PATTERN.test(generated.text)

    if (process.env.NODE_ENV !== 'production') {
      console.info(
        `━━━━━━━━ [debate]   에이전트: ${agentName} | 모델 type: ${generated.rawType ?? '확인 불가'} | 실제 문장 수: ${sentenceCount} | 허용 범위: ${lengthRange} | 범위 통과: ${lengthPassed ? '통과' : '실패'} | 재생성: ${regenerationOccurred ? '발생' : '없음'} | 입력 토큰: ${inputTokens} | 출력 토큰: ${outputTokens} |   발언: ${generated.text}   ━━━━━━━━`
      )
    }

    return NextResponse.json({
      text: generated.text,
      type: generated.type,
      sentenceCount,
      passed,
      forbiddenClosingExpression,
      regenerationOccurred,
    })
  } catch (error) {
    console.error('[debate] failed to generate remark', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : '토론 발언 생성에 실패했습니다.',
      },
      { status: 500 }
    )
  }
}
