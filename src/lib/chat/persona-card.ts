export type PersonaCardData = {
  currentBehavior: string[]
  demographicInfo: string[]
  imageUrl?: string | null
  lifestyleContext: string[]
  personaStory: string[]
  problemNeeds: string[]
  relationshipKeyword: string[]
}

const PERSONA_SECTION_KEYS = [
  'demographicInfo',
  'personaStory',
  'problemNeeds',
  'currentBehavior',
  'lifestyleContext',
  'relationshipKeyword',
] as const

type PersonaSectionKey = (typeof PERSONA_SECTION_KEYS)[number]

const SECTION_ALIASES: Array<{
  key: PersonaSectionKey
  patterns: RegExp[]
}> = [
  {
    key: 'demographicInfo',
    patterns: [/demographic\s*info/i, /인구통계|사용자\s*정보|타겟\s*정보/i],
  },
  {
    key: 'personaStory',
    patterns: [/persona\s*story/i, /페르소나\s*스토리|사용자\s*이야기/i],
  },
  {
    key: 'problemNeeds',
    patterns: [/problem\s*&?\s*needs?/i, /문제|니즈|불편/i],
  },
  {
    key: 'currentBehavior',
    patterns: [/current\s*behavior/i, /현재\s*행동|현재\s*대응/i],
  },
  {
    key: 'lifestyleContext',
    patterns: [/lifestyle\s*context/i, /라이프스타일|생활\s*맥락|사용\s*맥락/i],
  },
  {
    key: 'relationshipKeyword',
    patterns: [/relationship\s*keyword/i, /관계\s*키워드|관계/i],
  },
]

const SECTION_TITLE_PATTERNS = [
  /demographic\s*info/i,
  /persona\s*story/i,
  /problem\s*&?\s*needs?/i,
  /current\s*behavior/i,
  /lifestyle\s*context/i,
  /relationship\s*keyword/i,
  /persona\s*(?:summary|card)/i,
  /인구통계|사용자\s*정보|타겟\s*정보/i,
  /페르소나\s*스토리|사용자\s*이야기/i,
  /문제|니즈|불편/i,
  /현재\s*행동|현재\s*대응/i,
  /라이프스타일|생활\s*맥락|사용\s*맥락/i,
  /관계\s*키워드|관계/i,
]

const SECTION_LIMITS: Record<PersonaSectionKey, number> = {
  currentBehavior: 46,
  demographicInfo: 38,
  lifestyleContext: 52,
  personaStory: 128,
  problemNeeds: 44,
  relationshipKeyword: 52,
}

function cleanPersonaItem(value: string, key?: PersonaSectionKey) {
  const cleaned = value
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/[`"'“”‘’]/g, '')
    .replace(/\*\*/g, '')
    .replace(/[*_#]/g, '')
    .replace(/^[-•]\s*/, '')
    .replace(/^\d+[.)]\s*/, '')
    .replace(/^[A-C]\.\s*/, '')
    .replace(/^[:：]\s*/, '')
    .replace(/^\[[^\]]+\]\s*/, '')
    .replace(/\.{2,}|…/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  if (
    !cleaned ||
    /^```/.test(cleaned) ||
    /^jsx$/i.test(cleaned) ||
    /https?:\/\//i.test(cleaned) ||
    (SECTION_TITLE_PATTERNS.some((pattern) => pattern.test(cleaned)) &&
      cleaned.length <= 32)
  ) {
    return ''
  }

  const [, valueAfterColon] = cleaned.split(/[:：]/)
  const content = valueAfterColon?.trim() || cleaned

  return summarizePersonaItem(content, key)
}

function summarizePersonaItem(value: string, key?: PersonaSectionKey) {
  const normalized = value
    .replace(/[.!?。！？]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  if (!normalized) {
    return ''
  }

  const limit = key ? SECTION_LIMITS[key] : 36

  if (normalized.length <= limit) {
    return normalized
  }

  if (key === 'personaStory') {
    return normalized.slice(0, limit).trim()
  }

  const compact = normalized
    .replace(/하는 사용자(?:입니다|다)?/g, '사용자')
    .replace(/하고 싶어(?:합니다|함)?/g, '희망')
    .replace(/필요(?:합니다|함)?/g, '필요')
    .replace(/어려움(?:을 겪음)?/g, '어려움')
    .replace(/중요하게 생각함/g, '중시')
    .replace(/선호(?:합니다)?/g, '선호')

  if (compact.length <= limit) {
    return compact
  }

  const phrase = compact
    .split(/[,，/·]|(?:\s+-\s+)/)
    .map((item) => item.trim())
    .filter(Boolean)
    .sort((a, b) => a.length - b.length)[0]

  return (phrase || compact).slice(0, limit).trim()
}

function getSectionKey(line: string): PersonaSectionKey | null {
  const normalized = line.replace(/[#*_`]/g, '').trim()

  for (const section of SECTION_ALIASES) {
    if (section.patterns.some((pattern) => pattern.test(normalized))) {
      return section.key
    }
  }

  return null
}

function pushItem(
  sections: Record<PersonaSectionKey, string[]>,
  key: PersonaSectionKey,
  value: string
) {
  const cleaned = cleanPersonaItem(value, key)

  if (
    cleaned &&
    sections[key].length < (key === 'personaStory' ? 1 : 5) &&
    !sections[key].some((item) => item === cleaned)
  ) {
    sections[key].push(cleaned)
  }
}

function fallbackItems(text: string) {
  return text
    .split(/\n+/)
    .map((item) => cleanPersonaItem(item))
    .filter((line) => line && !/^persona\s*summary/i.test(line))
    .slice(0, 6)
}

function normalizePersonaCardData(data: Partial<PersonaCardData>) {
  return PERSONA_SECTION_KEYS.reduce((acc, key) => {
    const value = data[key]
    acc[key] = Array.isArray(value)
      ? value
          .map((item) => cleanPersonaItem(item, key))
          .filter(Boolean)
          .filter((item, index, items) => items.indexOf(item) === index)
          .slice(0, key === 'personaStory' ? 1 : 5)
      : []
    return acc
  }, {} as Record<PersonaSectionKey, string[]>)
}

export function buildPersonaCardDataFromText(text: string): PersonaCardData {
  const sections: Record<PersonaSectionKey, string[]> = {
    currentBehavior: [],
    demographicInfo: [],
    lifestyleContext: [],
    personaStory: [],
    problemNeeds: [],
    relationshipKeyword: [],
  }
  let currentKey: PersonaSectionKey | null = null

  for (const line of text.split('\n')) {
    const sectionKey = getSectionKey(line)

    if (sectionKey) {
      currentKey = sectionKey
      const inlineValue = line.includes(':') || line.includes('：')
        ? line.replace(/^.*?[:：]/, '')
        : ''
      pushItem(sections, currentKey, inlineValue)
      continue
    }

    const trimmedLine = line.trim()

    if (!currentKey || !trimmedLine) {
      continue
    }

    if (/^[-*•]|\d+[.)]|[A-C]\./.test(trimmedLine)) {
      pushItem(sections, currentKey, line)
      continue
    }

    if (currentKey === 'personaStory') {
      pushItem(sections, currentKey, line)
      continue
    }

    if (trimmedLine.includes(':') || trimmedLine.includes('：')) {
      pushItem(sections, currentKey, line)
    }
  }

  const fallback = fallbackItems(text)

  PERSONA_SECTION_KEYS.forEach((key, index) => {
    if (sections[key].length === 0) {
      sections[key].push(fallback[index] ?? '추가 정리 필요')
    }
  })

  return sections
}

export function appendPersonaCardBlock({
  data,
  text,
}: {
  data: PersonaCardData
  text: string
}) {
  return `${text}

<<AIDEE_PERSONA_CARD>>
${JSON.stringify(data)}
<</AIDEE_PERSONA_CARD>>`
}

export function extractPersonaCardBlock(text: string) {
  const match = text.match(
    /<<\s*AIDEE[-_ ]?PERSONA[-_ ]?CARD\s*>>[\s\n]*([\s\S]*?)[\s\n]*<<\s*\/\s*AIDEE[-_ ]?PERSONA[-_ ]?CARD\s*>>/i
  )

  if (!match) {
    return {
      cleanedText: text.trim(),
      personaCardBlock: null,
    }
  }

  const cleanedText = text
    .replace(
      /\n?<<\s*AIDEE[-_ ]?PERSONA[-_ ]?CARD\s*>>[\s\S]*?<<\s*\/\s*AIDEE[-_ ]?PERSONA[-_ ]?CARD\s*>>\s*$/i,
      ''
    )
    .trim()

  try {
    const parsed = JSON.parse(match[1]) as Partial<PersonaCardData>

    if (!parsed || typeof parsed !== 'object') {
      return { cleanedText, personaCardBlock: null }
    }

    const data = normalizePersonaCardData(parsed)

    return {
      cleanedText,
      personaCardBlock: {
        ...data,
        imageUrl: typeof parsed.imageUrl === 'string' ? parsed.imageUrl : null,
      } satisfies PersonaCardData,
    }
  } catch {
    return { cleanedText, personaCardBlock: null }
  }
}
