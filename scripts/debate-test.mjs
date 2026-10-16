import fs from 'node:fs'

const resultPath = new URL('../debate-test-result.md', import.meta.url)
const envPath = new URL('../.env.local', import.meta.url)

function loadEnvFile(path) {
  if (!fs.existsSync(path)) return

  for (const line of fs.readFileSync(path, 'utf8').split(/\r?\n/u)) {
    const match = line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*)\s*$/u)
    if (!match || process.env[match[1]]) continue
    process.env[match[1]] = match[2].replace(/^['"]|['"]$/gu, '')
  }
}

loadEnvFile(envPath)

if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
  throw new Error('.env.local에 GOOGLE_GENERATIVE_AI_API_KEY가 필요합니다.')
}

const baseUrl = process.env.DEBATE_TEST_BASE_URL || 'http://localhost:3000'
const authCookie = process.env.DEBATE_TEST_COOKIE
const agents = ['기획전략가', '디자이너', '엔지니어', '마케터']
const questions = [
  {
    label: '질문①',
    text: '실리콘 패드와 무광 알루미늄 소재의 조합이 최선일까? 시간이 지나면서 실리콘에 먼지가 붙거나 오염되는 문제를 어떻게 극복할 수 있을까?',
  },
  {
    label: '질문②',
    text: '제품 소재를 정할 때 가장 먼저 봐야 하는 게 뭐야?',
  },
  {
    label: '질문③',
    text: '소재는 언제쯤 확정하는 게 좋을까?',
  },
]

function splitSentences(text) {
  const sentences = []
  let start = 0
  for (const match of text.trim().matchAll(/[.!?。！？]+/gu)) {
    const end = (match.index ?? 0) + match[0].length
    sentences.push(text.trim().slice(start, end).trim())
    start = end
  }
  const remainder = text.trim().slice(start).trim()
  if (remainder) sentences.push(remainder)
  return sentences.filter(Boolean)
}

function answerSentencePosition(questionText, text) {
  const sentences = splitSentences(text)
  const keywords = questionText === questions[0].text
    ? ['먼지', '오염', '세척', '코팅', '방지', '관리', '실리콘', '알루미늄']
    : questionText === questions[1].text
      ? ['먼저', '기준', '안전', '사용자', '비용', '내구', '소재']
      : ['확정', '시점', '단계', '설계', '시제품', '소재']
  const index = sentences.findIndex((sentence) =>
    keywords.some((keyword) => sentence.includes(keyword))
  )
  return index === -1 ? '확인 불가' : `${index + 1}번째 문장`
}

function targetNameDeletion(text) {
  const deleted = text.replace(
    new RegExp(`(?:${agents.join('|')})`, 'gu'),
    ''
  )
  return deleted === text ? '깨짐 (통과)' : '유지됨 (실패)'
}

function hasNumericDetail(text) {
  return /\d|\d+\s*(?:일|주|개월|년|mm|cm|kg|g|원|만|%)/iu.test(text)
}

function questionOneTarget(text) {
  const firstPart = /먼지|오염|세척|코팅|방지|관리/u.test(text)
  const secondPart = /조합|실리콘|알루미늄|소재/u.test(text)
  if (firstPart && secondPart) return '두 물음 모두'
  if (firstPart) return '오염 문제'
  if (secondPart) return '소재 조합'
  return '확인 불가'
}

async function requestRemark(question, remarks, agentName) {
  const response = await fetch(`${baseUrl}/api/debate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(authCookie ? { Cookie: authCookie } : {}),
    },
    body: JSON.stringify({
      agentName,
      question: question.text,
      remarks,
      turnNumber: remarks.length + 1,
    }),
  })
  const result = await response.json().catch(() => null)
  if (response.status === 401) {
    throw new Error(
      '401 Unauthorized: /api/debate는 Supabase 로그인 쿠키가 필요합니다. DEBATE_TEST_COOKIE에 브라우저의 인증 쿠키를 지정하세요.'
    )
  }
  if (!response.ok || !result?.text) {
    throw new Error(`${response.status}: ${result?.error || '발언 생성 실패'}`)
  }
  return result
}

function formatRemark(question, index, agentName, result) {
  const sentenceCount = result.sentenceCount ?? splitSentences(result.text).length
  const forbidden = result.forbiddenClosingExpression
    ? `실패 (${result.forbiddenClosingExpression})`
    : '통과'
  return [
    `### ${question.label} - ${index + 1}번째 발언 / ${agentName}`,
    `- type: ${result.type ?? '확인 불가'}`,
    `- 문장 수: ${sentenceCount} (범위 ${result.type === '같은 결론' || result.type === '조건 추가' ? '1~2' : '3~5'}, ${result.passed ? '통과' : '실패'})`,
    `- 금지 종결 검사: ${forbidden}`,
    `- 재생성: ${result.regenerationOccurred ? '발생' : '없음'}`,
    `- 답 문장 위치: ${answerSentencePosition(question.text, result.text)}`,
    `- 대상 이름 삭제 테스트: ${targetNameDeletion(result.text)}`,
    '',
    '발언:',
    result.text,
    '',
  ].join('\n')
}

const output = [
  '# Debate Test Result',
  '',
  `생성 시각: ${new Date().toISOString()}`,
  '',
]
const summary = {
  answerInFirstTwo: 0,
  targetNameBreaks: 0,
  forbiddenClosingFailures: 0,
  regenerations: 0,
  numericDetails: 0,
  questionOneTargets: { '소재 조합': 0, '오염 문제': 0, '두 물음 모두': 0, '확인 불가': 0 },
}

for (const [questionIndex, question] of questions.entries()) {
  output.push(`## ${question.label}`, '', `질문: ${question.text}`, '')
  const remarks = []
  const agentOrder = [agents[questionIndex], ...agents.filter((agent) => agent !== agents[questionIndex])]

  for (const agentName of agentOrder) {
    const result = await requestRemark(question, remarks, agentName)
    const position = answerSentencePosition(question.text, result.text)
    if (/^(?:1|2)번째/u.test(position)) summary.answerInFirstTwo += 1
    if (targetNameDeletion(result.text) === '유지됨 (실패)') summary.targetNameBreaks += 1
    if (result.forbiddenClosingExpression) summary.forbiddenClosingFailures += 1
    if (result.regenerationOccurred) summary.regenerations += 1
    if (hasNumericDetail(result.text)) summary.numericDetails += 1
    if (questionIndex === 0) summary.questionOneTargets[questionOneTarget(result.text)] += 1

    output.push(formatRemark(question, remarks.length, agentName, result))
    remarks.push({ agentName, text: result.text, turnNumber: remarks.length + 1 })
  }
}

output.push(
  '## 요약',
  '',
  `- 답 문장이 첫 두 문장 안에 있는 발언 수 / 12: ${summary.answerInFirstTwo} / 12`,
  `- 대상 이름 삭제 시 문장이 깨지는 발언 수 / 12: ${summary.targetNameBreaks} / 12`,
  `- 금지 종결 검사 실패 수: ${summary.forbiddenClosingFailures}`,
  `- 재생성 총 횟수: ${summary.regenerations}`,
  `- 수치·기간·규격·가격을 쓴 발언 수: ${summary.numericDetails}`,
  `- ①번 질문 답변 분포: 소재 조합 ${summary.questionOneTargets['소재 조합']} / 오염 문제 ${summary.questionOneTargets['오염 문제']} / 두 물음 모두 ${summary.questionOneTargets['두 물음 모두']} / 확인 불가 ${summary.questionOneTargets['확인 불가']}`,
  ''
)

fs.writeFileSync(new URL(resultPath), output.join('\n'), 'utf8')
console.log(output.slice(-8).join('\n'))
