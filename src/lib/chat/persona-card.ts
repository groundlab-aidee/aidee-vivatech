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

function cleanPersonaItem(value: string) {
  return value
    .replace(/^[-*•]\s*/, '')
    .replace(/^\d+[.)]\s*/, '')
    .replace(/^[:：]\s*/, '')
    .replace(/\*\*/g, '')
    .replace(/\.{2,}|…/g, '')
    .trim()
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
  const cleaned = cleanPersonaItem(value)

  if (cleaned && sections[key].length < 2) {
    sections[key].push(cleaned.length > 26 ? cleaned.slice(0, 26).trim() : cleaned)
  }
}

function fallbackItems(text: string) {
  return text
    .split(/\n+/)
    .map(cleanPersonaItem)
    .filter((line) => line && !/^persona\s*summary/i.test(line))
    .slice(0, 6)
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
      const [, inlineValue = ''] = line.split(/[:：]/)
      pushItem(sections, currentKey, inlineValue)
      continue
    }

    if (currentKey && /^[-*•]|\d+[.)]/.test(line.trim())) {
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

    const data = PERSONA_SECTION_KEYS.reduce((acc, key) => {
      const value = parsed[key]
      acc[key] = Array.isArray(value)
        ? value.filter((item): item is string => typeof item === 'string')
        : []
      return acc
    }, {} as Record<PersonaSectionKey, string[]>)

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
