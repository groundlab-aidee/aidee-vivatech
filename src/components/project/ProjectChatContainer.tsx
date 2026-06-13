'use client'

import Image from 'next/image'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

import type { ChatMessageRecord } from '@/lib/chat/persistence'
import {
  defaultProjectChatSidebarState,
  useProjectChatSidebar,
} from '@/components/app-shell/ProjectChatSidebarContext'
import { useAppLanguage } from '@/components/i18n/AppLanguageContext'
import { ProjectFavoriteButton } from '@/components/project/ProjectFavoriteButton'
import { ProjectMoreMenu } from '@/components/project/ProjectMoreMenu'
import {
  getExpertDefinition,
  type ExpertKey,
} from '@/lib/chat/experts'
import type { GeneratedImagePurpose, UnsplashImageMeta } from '@/lib/chat/image-blocks'
import type { PersonaCardData } from '@/lib/chat/persona-card'
import { MoodboardCandidates } from '@/components/chat/MoodboardCandidates'
import { MoodboardGrid, type MoodboardGridImage } from '@/components/chat/MoodboardGrid'
import { MoodboardModal } from '@/components/moodboard/MoodboardModal'
import { extractRfpJsonBlock, type RfpDocument } from '@/lib/chat/rfp'
import { inferStageMetaFromText, type StageKey } from '@/lib/chat/stages'

type ProjectChatContainerProps = {
  initialMessages: ChatMessageRecord[]
  initialStageKey: StageKey
  isNewProject: boolean
  projectId: string
  projectTitle: string
  initialIsFavorite?: boolean
  userAvatarUrl?: string | null
  userPlanLabel?: string
  userTokenCount?: number
}

type ChatApiResponse = {
  error?: string
  message?: ChatMessageRecord
  nextStageKey?: StageKey
  userMessage?: ChatMessageRecord | null
}

type ForceImageGeneration =
  | 'design_revision'
  | 'initial_design'
  | 'persona_card'
  | 'style_reference'

type DirectionArtifactKind =
  | 'brand_positioning'
  | 'consumption_keywords'
  | 'market_size'

type MarketSizingData = {
  description: string
  forecasts: Array<{ label: string; value: number }>
  goal: string
  goalDescription: string
  markets: Array<{
    code: 'TAM' | 'SAM' | 'SOM'
    description: string
    label: string
    value: string
  }>
  summary: string
}

type ConsumptionKeywordData = {
  description: string
  keywords: string[]
  summary: string
}

type BrandPositioningData = {
  brands: string[]
  description: string
  goal: string
}

type KeywordArtifactKind = 'experience_keywords' | 'relationship_keywords'

type KeywordCardData = {
  description: string
  keywords: string[]
  kind: KeywordArtifactKind
  title: string
}

type ProblemStatementsData = {
  situation: string
  pain: string
  need: string
}

type ChatChoice = {
  key: 'A' | 'B' | 'C'
  label: string
  value: string
}

type ProjectDirectionData = {
  budgetAndDuration: string
  category: string
  features: string
  goal: string
  ideaSummary: string
  referenceSummary: string
  size: string
  title: string
  usage: string
}

type LibraryArtifactKind =
  | 'project_direction'
  | 'persona'
  | 'experience_keywords'
  | 'relationship_keywords'
  | 'problem_statements'
  | 'market_sizing'
  | 'brand_positioning'
  | 'consumption_keywords'
  | 'mood_board'
  | 'rendering'
  | 'modeling'
  | 'project_report'

type LibraryArtifact = {
  kind: LibraryArtifactKind
  title: string
}

function getImageArtifactKind(purpose?: GeneratedImagePurpose): LibraryArtifactKind | null {
  switch (purpose) {
    case 'persona':
      return 'persona'
    case 'style_reference':
      return 'mood_board'
    case 'design':
    case 'thumbnail':
      return 'rendering'
    default:
      return null
  }
}

const EXPERT_MENU_ITEMS: Array<{
  icon: string
  key: Exclude<ExpertKey, 'aidee'>
  label: { ENG: string; KOR: string }
}> = [
  {
    icon: '/assets/icons/chat/strategist.svg',
    key: 'planner',
    label: { ENG: 'Strategist', KOR: '기획전략가' },
  },
  {
    icon: '/assets/icons/chat/designer.svg',
    key: 'style_designer',
    label: { ENG: 'Designer', KOR: '디자이너' },
  },
  {
    icon: '/assets/icons/chat/engineer.svg',
    key: 'engineer',
    label: { ENG: 'Engineer', KOR: '엔지니어' },
  },
  {
    icon: '/assets/icons/chat/marketer.svg',
    key: 'marketer',
    label: { ENG: 'Marketer', KOR: '마케터' },
  },
]

const STAGE_EXPERTS: Record<StageKey, ExpertKey[]> = {
  step_0_start: ['planner'],
  step_1_idea: ['planner'],
  step_2_persona: ['planner', 'marketer'],
  step_2_research: ['planner', 'marketer'],
  step_3_direction: ['planner', 'engineer', 'marketer', 'style_designer'],
  step_4_style: ['style_designer'],
  step_5_design: ['style_designer', 'engineer'],
  step_6_rfp: ['planner', 'engineer', 'marketer', 'style_designer'],
  step_6_company: ['planner'],
}

const LIBRARY_ARTIFACTS: LibraryArtifact[] = [
  { kind: 'project_direction', title: 'Project Direction' },
  { kind: 'problem_statements', title: 'Problem Statements' },
  { kind: 'experience_keywords', title: 'Keywords: Experience' },
  { kind: 'relationship_keywords', title: 'Keywords: Relationship' },
  { kind: 'persona', title: 'Persona' },
  { kind: 'market_sizing', title: 'TAM SAM SOM' },
  { kind: 'consumption_keywords', title: 'Keywords: Consumption' },
  { kind: 'brand_positioning', title: 'Positioning Map: Brand' },
  { kind: 'mood_board', title: 'Mood Board' },
  { kind: 'rendering', title: '3D Design: Rendering' },
  { kind: 'modeling', title: '3D Design: Modeling' },
  { kind: 'project_report', title: 'Project Report' },
]

function extractProjectDirectionCard(content: string): ProjectDirectionData | null {
  const markerMatch = content.match(
    /<<AIDEE_PROJECT_DIRECTION>>\s*([\s\S]*?)\s*<<\/AIDEE_PROJECT_DIRECTION>>/
  )
  const source = markerMatch?.[1]

  if (!source) {
    return null
  }

  const fieldLabels = [
    '프로젝트명',
    '프로젝트 목표',
    '제품 카테고리',
    '예산/기간 범위',
    '예상 크기',
    '주요 기능',
    '최종 활용 목적',
    '아이디어 정리',
    '참고 자료',
  ]
  const labelSet = new Set(fieldLabels)
  const values = new Map<string, string>()
  const cleanLine = (line: string) =>
    line
      .replace(/^#{1,6}\s*/, '')
      .replace(/\*\*/g, '')
      .replace(/^[-•]\s*/, '')
      .replace(/\s+/g, ' ')
      .trim()
  const lines = source
    .replace(/^Project\s*Direction\s*/i, '')
    .split('\n')
    .map(cleanLine)
    .filter(Boolean)
  let currentLabel: string | null = null

  for (const line of lines) {
    if (labelSet.has(line)) {
      currentLabel = line
      values.set(currentLabel, '')
      continue
    }

    if (!currentLabel || /^Project\s*Direction$/i.test(line)) {
      continue
    }

    values.set(
      currentLabel,
      [values.get(currentLabel), line].filter(Boolean).join(' ')
    )
  }

  const getValue = (label: string) => values.get(label)?.trim() || '미정'
  const data = {
    budgetAndDuration: getValue('예산/기간 범위'),
    category: getValue('제품 카테고리'),
    features: getValue('주요 기능'),
    goal: getValue('프로젝트 목표'),
    ideaSummary: getValue('아이디어 정리'),
    referenceSummary: getValue('참고 자료'),
    size: getValue('예상 크기'),
    title: getValue('프로젝트명'),
    usage: getValue('최종 활용 목적'),
  }
  const hasMinimumData =
    data.title !== '미정' ||
    data.goal !== '미정' ||
    data.ideaSummary !== '미정'

  return hasMinimumData ? data : null
}

function splitProjectDirectionContent(content: string) {
  const match = content.match(
    /<<AIDEE_PROJECT_DIRECTION>>\s*[\s\S]*?\s*<<\/AIDEE_PROJECT_DIRECTION>>/
  )

  if (!match || typeof match.index !== 'number') {
    return {
      after: content,
      before: '',
    }
  }

  return {
    after: content.slice(match.index + match[0].length).trim(),
    before: content.slice(0, match.index).trim(),
  }
}

function stripInternalBlocksForDisplay(text: string) {
  return text
    .replace(
      /\n?<<\s*AIDEE[-_ ]?(?:IMAGES|RFP_JSON)\s*>>[\s\S]*?(?:<<\s*\/\s*AIDEE[-_ ]?(?:IMAGES|RFP_JSON)\s*>>|$)/gi,
      ''
    )
    .replace(
      /\n?<<AIDEE_PERSONA_FLOW_CARD:[\s\S]*?<<\/AIDEE_PERSONA_FLOW_CARD>>/g,
      ''
    )
    .replace(
      /\n?<<AIDEE_DIRECTION_WIDGETS>>[\s\S]*?<<\/AIDEE_DIRECTION_WIDGETS>>/g,
      ''
    )
    .replace(
      /\n?<<AIDEE_DIRECTION_CARD:[\s\S]*?<<\/AIDEE_DIRECTION_CARD>>/g,
      ''
    )
    .replace(
      /\n?<<AIDEE_STYLE_KEYWORD_PICKER>>[\s\S]*?<<\/AIDEE_STYLE_KEYWORD_PICKER>>/g,
      ''
    )
    .replace(
      /\n?<<AIDEE_PROJECT_DIRECTION>>[\s\S]*?<<\/AIDEE_PROJECT_DIRECTION>>/g,
      ''
    )
    .replace(
      /\n?#\s*Project\s*(?:Card|Direction)\s*[\s\S]*?(?=\n\s*제품의\s*구체적인\s*모습|\n\s*형태,\s*색감|\s*$)/gi,
      ''
    )
    .replace(/\n?<CLICK_BUTTON[^>]*>/gi, '')
    .replace(/\n?<\[BUTTON[^\]]*\][^>]*>/gi, '')
    .replace(/\n?\[시스템\s*참고:[\s\S]*?\]/gi, '')
    .replace(
      /<<\s*\/?\s*AIDEE(?:[-_ ][A-Z0-9_-]+)*(?:\s*:[^>]*)?\s*>>/gi,
      ''
    )
    .replace(/^\s*```[a-zA-Z0-9_-]*\s*$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function hasDirectionWidgets(content: string) {
  return /<<AIDEE_DIRECTION_WIDGETS>>[\s\S]*?<<\/AIDEE_DIRECTION_WIDGETS>>/.test(
    content
  )
}

function getDirectionArtifactKind(content: string): DirectionArtifactKind | null {
  const normalized = stripInternalBlocksForDisplay(content)
  const normalizedLines = normalized
    .split('\n')
    .map((line) =>
      line
        .trim()
        .replace(/^#{1,6}\s*/, '')
        .replace(/^\*{1,2}|\*{1,2}$/g, '')
        .replace(/^_{1,2}|_{1,2}$/g, '')
        .trim()
    )

  if (normalizedLines.some((line) => /^Tam\s+Sam\s+Som\b/i.test(line))) {
    return 'market_size'
  }

  if (
    normalizedLines.some((line) =>
      /^(?:Keywords?\s*[:：]\s*Consumption|소비\s*트렌드(?:\s*(?:리서치|분석|키워드))?)\b/i.test(
        line
      )
    )
  ) {
    return 'consumption_keywords'
  }

  if (
    normalizedLines.some((line) =>
      /^Positioning\s+Map\s*[:：]\s*Brand\b/i.test(line)
    )
  ) {
    return 'brand_positioning'
  }

  return null
}

function extractConsumptionKeywordData(
  content: string,
  { force = false } = {}
): ConsumptionKeywordData | null {
  if (!force && getDirectionArtifactKind(content) !== 'consumption_keywords') {
    return null
  }

  const cleaned = stripInternalBlocksForDisplay(content)
    .replace(
      /^\s*(?:#{1,6}\s*)?(?:\*{1,2}|_{1,2})?(?:Keywords?\s*[:：]\s*Consumption|소비\s*트렌드(?:\s*(?:리서치|분석|키워드))?)(?:\*{1,2}|_{1,2})?\s*/im,
      ''
    )
    .replace(
      /(?:다른\s*트렌드도\s*궁금하다면|다른\s*개발\s*방향성\s*리서치도|현재\s*정보가\s*충분하다면|다음\s*STEP\s*4)[\s\S]*$/i,
      ''
    )
    .trim()
  const lines = cleaned
    .split('\n')
    .map((line) =>
      line
        .replace(/^[-*•]\s*/, '')
        .replace(/\*\*/g, '')
        .trim()
    )
    .filter(
      (line) =>
        Boolean(line) &&
        !/^(?:설명(?:글)?|키워드\s*목록|(?:10자\s*이내\s*)?키워드\s*\d+개|\d+자\s*이내\s*키워드\s*\d+개)\s*[:：-]?$/i.test(
          line
        )
    )
  const stripLabel = (line: string) =>
    line
      .replace(
        /^(?:한\s*줄\s*요약|요약|설명(?:글)?|소비\s*트렌드|키워드(?:\s*\d+개)?)\s*[:：-]\s*/i,
        ''
      )
      .trim()
  const summaryLine =
    lines.find((line) => /^(?:한\s*줄\s*요약|요약|소비\s*트렌드)\s*[:：-]/i.test(line)) ??
    lines.find((line) => line.length >= 15 && line.length <= 90) ??
    ''
  const descriptiveLines = lines
    .filter(
      (line) =>
        line !== summaryLine &&
        line.length >= 20 &&
        !/^(?:키워드|keywords?|\d+자\s*이내\s*키워드)\s*(?:\d+개)?\s*[:：-]?/i.test(
          line
        )
    )
    .map(stripLabel)
  const keywordCandidates = lines
    .filter(
      (line) =>
        line !== summaryLine &&
        !descriptiveLines.includes(stripLabel(line)) &&
        !/^(?:설명(?:글)?|한\s*줄\s*요약|요약|소비\s*트렌드)\s*[:：-]?/i.test(
          line
        )
    )
    .flatMap((line) => {
      const withoutLabel = line.replace(
        /^(?:(?:\d+자\s*이내\s*)?키워드|keywords?)(?:\s*\d+개)?\s*[:：-]?\s*/i,
        ''
      )
      const parts = withoutLabel.split(/[,/·#|]|\s{2,}/)

      if (parts.length === 1 && withoutLabel.length > 20) {
        return []
      }

      return parts
    })
    .map((item) => item.replace(/^\d+[.)]\s*/, '').replace(/[.!?。！？]+$/g, '').trim())
    .filter(
      (item) =>
        item.length >= 2 &&
        item.length <= 20 &&
        !/^(?:요약|설명(?:글)?|키워드(?:\s*\d+개)?|\d+자\s*이내|소비\s*트렌드|keywords?|consumption)$/i.test(
          item
        )
    )
  const keywords = Array.from(new Set(keywordCandidates)).slice(0, 30)

  return {
    description:
      descriptiveLines.slice(0, 4).join(' ') ||
      '사용자의 구매 동기와 선택 기준을 바탕으로 제품이 제공해야 할 소비 경험과 시장 방향을 정리했습니다.',
    keywords:
      keywords.length > 0
        ? keywords
        : [
            '직관적 선택',
            '신뢰성',
            '편리한 사용',
            '가치 소비',
            '개인화',
            '지속가능성',
            '품질 중심',
            '효율성',
            '브랜드 경험',
          ],
    summary:
      stripLabel(summaryLine) ||
      '명확한 가치와 신뢰를 바탕으로 지속 가능한 소비 경험을 제공하는 제품',
  }
}

function extractBrandPositioningData(
  content: string
): BrandPositioningData | null {
  if (getDirectionArtifactKind(content) !== 'brand_positioning') {
    return null
  }

  const cleaned = stripInternalBlocksForDisplay(content)
    .replace(/^\s*(?:#{1,6}\s*)?Positioning\s+Map\s*[:：]\s*Brand\s*/im, '')
    .replace(
      /(?:다른\s*트렌드도\s*궁금하다면|다른\s*개발\s*방향성\s*리서치도|현재\s*정보가\s*충분하다면|다음\s*STEP\s*4)[\s\S]*$/i,
      ''
    )
    .trim()
  const lines = cleaned
    .split('\n')
    .map((line) =>
      line
        .replace(/^[-*•]\s*/, '')
        .replace(/\*\*/g, '')
        .trim()
    )
    .filter(Boolean)
  const goalLine =
    lines.find((line) => /^(?:OUR\s*BRAND|자사\s*브랜드|목표\s*포지션)\s*[:：-]/i.test(line)) ??
    ''
  const brandCandidates = lines
    .filter(
      (line) =>
        !/^(?:X축|Y축|OUR\s*BRAND|자사\s*브랜드|목표\s*포지션|합리적\s*기능형|프리미엄\s*기능형|합리적\s*라이프스타일형|프리미엄\s*라이프스타일형)\s*[:：-]?/i.test(
          line
        )
    )
    .flatMap((line) => line.split(/[,/|]/))
    .map((item) => item.replace(/^\d+[.)]\s*/, '').trim())
    .filter(
      (item) =>
        item.length >= 2 &&
        item.length <= 28 &&
        !/[.!?。！？]$/.test(item) &&
        !/(?:시장|가격|기능|라이프스타일|포지션|브랜드|경쟁|분석|영역)/i.test(item)
    )
  const fallbackBrands = [
    'Philips Hue',
    'Nanoleaf',
    'Apple Watch',
    'Muse',
    'Pomodoro Timer',
    'Tick Time',
    'Govee',
    'Ikea',
  ]
  const brands = Array.from(new Set(brandCandidates)).slice(0, 8)
  const descriptiveLines = lines.filter(
    (line) =>
      line.length >= 30 &&
      line !== goalLine &&
      !/^(?:X축|Y축)/i.test(line)
  )

  return {
    brands: brands.length >= 4 ? brands : fallbackBrands,
    description:
      descriptiveLines.slice(-2).join(' ') ||
      '합리적인 가격대 안에서 기능과 라이프스타일 가치를 함께 제공하는 브랜드 포지션이 적합합니다.',
    goal:
      goalLine.replace(/^(?:OUR\s*BRAND|자사\s*브랜드|목표\s*포지션)\s*[:：-]\s*/i, '') ||
      '기능과 감성을 연결하는 라이프스타일 브랜드',
  }
}

function getDirectionArtifactLabel(kind: DirectionArtifactKind) {
  const labels: Record<DirectionArtifactKind, string> = {
    brand_positioning: '경쟁사 리서치',
    consumption_keywords: '소비 트렌드 리서치',
    market_size: '시장 규모 리서치',
  }

  return labels[kind]
}

function extractMarketSizingData(content: string): MarketSizingData | null {
  if (getDirectionArtifactKind(content) !== 'market_size') {
    return null
  }

  const cleaned = stripInternalBlocksForDisplay(content)
    .replace(/^#{1,3}\s*Tam\s+Sam\s+Som\s*/im, '')
    .trim()
  const lines = cleaned
    .split('\n')
    .map((line) => line.replace(/^[-*•]\s*/, '').replace(/\*\*/g, '').trim())
    .filter(Boolean)
  const findLine = (pattern: RegExp) => lines.find((line) => pattern.test(line)) ?? ''
  const extractValue = (line: string) =>
    line
      .replace(/^.*?(?:TAM|SAM|SOM|전체시장|유효시장|자사목표시장)\s*[:：-]?\s*/i, '')
      .split(/\s{2,}|[|]/)[0]
      .trim()
  const marketDefinitions = [
    {
      code: 'TAM' as const,
      fallback: '279.0억 달러',
      label: '전체시장',
      pattern: /(?:^|\b)TAM\b|전체시장/i,
    },
    {
      code: 'SAM' as const,
      fallback: '173.8억 달러',
      label: '유효시장',
      pattern: /(?:^|\b)SAM\b|유효시장/i,
    },
    {
      code: 'SOM' as const,
      fallback: '17.4억 달러',
      label: '자사목표시장',
      pattern: /(?:^|\b)SOM\b|자사목표시장/i,
    },
  ]
  const markets = marketDefinitions.map((definition) => {
    const line = findLine(definition.pattern)
    const followingLine = lines[lines.indexOf(line) + 1] ?? ''

    return {
      code: definition.code,
      description:
        followingLine && !/(?:TAM|SAM|SOM|PROJECT GOAL)/i.test(followingLine)
          ? followingLine
          : '서비스가 진입하고 확장할 수 있는 시장 범위와 수요를 나타냅니다.',
      label: definition.label,
      value: extractValue(line) || definition.fallback,
    }
  })
  const forecastMatches = Array.from(
    cleaned.matchAll(/(20\d{2}|현재|향후\s*\d+년)[^\d]{0,15}([\d,.]+)\s*(억\s*달러|달러|조|억)?/g)
  ).slice(0, 6)
  const fallbackForecasts = [119.6, 180.9, 210.4, 244.3, 273.8, 279.8]
  const forecasts = Array.from({ length: 6 }, (_, index) => ({
    label: forecastMatches[index]?.[1] ?? `${2025 + index * 5}`,
    value: Number(forecastMatches[index]?.[2]?.replace(/,/g, '')) || fallbackForecasts[index],
  }))
  const goalLine = findLine(/PROJECT GOAL|프로젝트 목표/i)
  const descriptiveLines = lines.filter(
    (line) =>
      line.length >= 20 &&
      !/(?:TAM|SAM|SOM|PROJECT GOAL|전체시장|유효시장|자사목표시장)/i.test(line)
  )

  return {
    description:
      descriptiveLines.slice(1, 3).join(' ') ||
      '시장 성장성과 수요를 바탕으로 제품이 진입할 수 있는 시장 범위를 분석했습니다.',
    forecasts,
    goal:
      goalLine.replace(/^.*?PROJECT GOAL\s*[:：-]?\s*/i, '').trim() ||
      '시장 기회를 기반으로 지속 가능한 제품 성장을 만드는 것',
    goalDescription:
      descriptiveLines.slice(-2).join(' ') ||
      '핵심 시장의 성장성과 사용자 수요를 기반으로 현실적인 진입 목표를 설정합니다.',
    markets,
    summary:
      descriptiveLines[0] ||
      '시장 성장 흐름과 제품의 진입 가능성을 함께 분석한 결과입니다.',
  }
}

function getDirectionLibraryKind(
  kind: DirectionArtifactKind
): LibraryArtifactKind {
  const kinds: Record<DirectionArtifactKind, LibraryArtifactKind> = {
    brand_positioning: 'brand_positioning',
    consumption_keywords: 'consumption_keywords',
    market_size: 'market_sizing',
  }

  return kinds[kind]
}

function extractProblemStatementsData(content: string): ProblemStatementsData | null {
  const normalized = stripInternalBlocksForDisplay(content).replace(/\r\n/g, '\n')
  const hasHeading = /(?:^|\n)\s*(?:#{1,6}\s*)?\[?Problem\s*Statements?\]?/i.test(
    normalized
  )
  const hasFields =
    /(?:Context|현재\s*상황)\s*[:：]/i.test(normalized) &&
    /(?:Problem|불편함)\s*[:：]/i.test(normalized) &&
    /(?:Needs?|근본적\s*니즈)\s*[:：]/i.test(normalized)

  if (!hasHeading && !hasFields) return null

  const extractSection = (label: RegExp, nextLabels: string) => {
    const match = normalized.match(
      new RegExp(
        `(?:^|\\n)\\s*(?:#{1,6}\\s*)?(?:\\*{1,2})?(?:${label.source})(?:\\*{1,2})?\\s*[:：]\\s*([\\s\\S]*?)(?=\\n\\s*(?:#{1,6}\\s*)?(?:\\*{1,2})?(?:${nextLabels})(?:\\*{1,2})?\\s*[:：]|\\n\\s*(?:---+|더\\s*추가할\\s*내용|이\\s*내용이|['\"]?시각화하기|버튼을\\s*눌러)|$)`,
        'i'
      )
    )

    return (match?.[1] ?? '')
      .replace(/^[-*•]\s*/gm, '')
      .replace(/\*{1,2}/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  }
  const situation = extractSection(/Context|현재\s*상황/, 'Problem|불편함|Needs?|근본적\\s*니즈')
  const pain = extractSection(/Problem|불편함/, 'Needs?|근본적\\s*니즈')
  const need = extractSection(/Needs?|근본적\s*니즈/, '(?!)')

  if (!situation && !pain && !need) return null
  return { need, pain, situation }
}

function extractKeywordCardsData(content: string): KeywordCardData[] {
  const normalized = stripInternalBlocksForDisplay(content)
  // `#` prefix is optional — the AI sometimes outputs plain "Keywords: Experience"
  const matches = normalized.matchAll(
    /(?:^|\n)#{0,3}\s*Keywords:\s*(Experience|Relationship)\s*\n([\s\S]*?)(?=\n#{0,3}\s*Keywords:\s*(?:Experience|Relationship)|\n#{1,3}\s|\n\s*다음\s*STEP|\n이\s+['"]?Keywords|\s*$)/gi
  )

  return Array.from(matches, (match) => {
    const titleSuffix = match[1].toLowerCase()
    const kind: KeywordArtifactKind =
      titleSuffix === 'experience'
        ? 'experience_keywords'
        : 'relationship_keywords'
    const body = match[2]
      .replace(/\*\*/g, '')
      .replace(/\r\n/g, '\n')
      // strip trailing AI question like "이 '...' 카드 내용으로 확정할까요?"
      .replace(/\n이\s+[^\n]{0,60}(?:확정|할까요)[^\n]*/gi, '')
      .trim()
    const rawLines = body
      .split('\n')
      .map((line) =>
        line
          .replace(/^[-•*]\s*/, '')
          .replace(/^\d+[.)]\s*/, '')
          .replace(/^#{1,6}\s*/, '')
          .trim()
      )
      .filter(Boolean)
    const keywordCandidates = rawLines
      .flatMap((line) => {
        // "감정: kw1, kw2" or "감정\nkw1, kw2" (category-only line → skip, next line has keywords)
        const withoutCategory = line.replace(
          /^(?:감정|행동|공간|관계|사용자|환경|기존\s*도구|시간|방해\s*요소|사용\s*시간|타인)\s*[:：]\s*/i,
          ''
        )
        // if stripping changed nothing and line is a bare category word → skip
        if (
          withoutCategory === line &&
          /^(?:감정|행동|공간|관계|사용자|환경|기존\s*도구|시간|방해\s*요소|사용\s*시간|타인)$/i.test(
            line
          )
        ) {
          return []
        }
        return withoutCategory.split(/[,，]|\/|·|#|  +/)
      })
      .map((item) =>
        item
          .replace(/[.!?。！？]+$/g, '')
          .trim()
      )
      .filter(
        (item) =>
          item.length >= 2 &&
          item.length <= 18 &&
          !/keywords?|experience|relationship|키워드|요약|설명/i.test(item)
      )
    const keywords = Array.from(new Set(keywordCandidates)).slice(0, 30)
    const description = rawLines
      .filter((line) => line.length > 18 && !/확정|할까요/i.test(line))
      .slice(0, 4)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()

    return {
      description:
        description ||
        `${keywords.slice(0, 4).join(', ')} 중심의 경험 키워드를 정리했습니다.`,
      keywords: keywords.length > 0 ? keywords : rawLines.slice(0, 12),
      kind,
      title: `Keywords: ${match[1][0].toUpperCase()}${match[1].slice(1).toLowerCase()}`,
    }
  })
}

function splitAssistantChoices(content: string): {
  choices: ChatChoice[]
  displayContent: string
} {
  const lines = content.replace(/\r\n/g, '\n').split('\n')
  const removableLineIndexes = new Set<number>()
  const choices: ChatChoice[] = []
  const choiceLinePattern = /^(?:[-•*]\s*)?([ABC])\.\s+(.+)$/

  lines.forEach((line, index) => {
    const trimmedLine = line.trim()
    const inlineChoiceMatch = trimmedLine.match(
      /^A\.\s*(.+?)\s*\/\s*B\.\s*(.+?)\s*\/\s*C\.\s*(.+)$/
    )

    if (inlineChoiceMatch) {
      inlineChoiceMatch.slice(1, 4).forEach((label, labelIndex) => {
        const key = ['A', 'B', 'C'][labelIndex] as ChatChoice['key']
        const normalizedLabel = label.trim()

        choices.push({
          key,
          label: normalizedLabel,
          value: `${key}. ${normalizedLabel}`,
        })
      })
      removableLineIndexes.add(index)
      return
    }

    const match = trimmedLine.match(choiceLinePattern)

    if (!match) {
      return
    }

    const key = match[1] as ChatChoice['key']
    const label = match[2].trim()

    choices.push({
      key,
      label,
      value: `${key}. ${label}`,
    })
    removableLineIndexes.add(index)

    if (/^\s*선택지\s*:?\s*$/.test(lines[index - 1] ?? '')) {
      removableLineIndexes.add(index - 1)
    }
  })

  if (choices.length === 0) {
    return {
      choices: [],
      displayContent: content,
    }
  }

  return {
    choices,
    displayContent: lines
      .filter((_, index) => !removableLineIndexes.has(index))
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim(),
  }
}

function buildFallbackHintChoices(content: string): ChatChoice[] {
  const normalized = content.replace(/\s+/g, ' ')
  const makeChoices = (labels: [string, string, string]): ChatChoice[] =>
    labels.map((label, index) => {
      const key = ['A', 'B', 'C'][index] as ChatChoice['key']

      return {
        key,
        label,
        value: `${key}. ${label}`,
      }
    })

  if (/구체적인\s*모습|추가\s*설명|형태|색감|재질|사용\s*장면/.test(normalized)) {
    return makeChoices([
      '형태나 재질 중심으로 설명할게요',
      '사용 장면과 분위기 중심으로 설명할게요',
      '아직 구체적인 모습은 없어요',
    ])
  }

  if (/누가|사용자|타겟|나이|직업|페르소나/.test(normalized)) {
    return makeChoices([
      'Aidee가 적합한 사용자를 추천해주세요',
      '제가 생각한 사용자층을 설명할게요',
      '아직 모르겠어요',
    ])
  }

  if (/우선|기준|고를|선택|중요|가치/.test(normalized)) {
    return makeChoices([
      '실용성과 기능을 우선하고 싶어요',
      '디자인과 감성을 우선하고 싶어요',
      '아직 우선순위를 정하지 못했어요',
    ])
  }

  return makeChoices([
    '아직 잘 모르겠어요. Aidee가 추천해주세요',
    '현재 정보만으로 진행해주세요',
    '제가 직접 설명을 더 추가할게요',
  ])
}

function isAssistantQuestion(content: string) {
  return /[?？]\s*$|알려주세요|말씀해주세요|선택해주세요|확인해주세요|진행할까요|있나요|어떤.+요\?/m.test(
    content.trim()
  )
}

function isStageProceedPrompt(content: string) {
  const normalized = content.replace(/\s+/g, ' ').trim()
  const mentionsProceedQuestion = /진행할까요[?？]?|시작할까요[?？]?/.test(
    normalized
  )
  const mentionsStageTransition =
    /다음으로\s*STEP\s*\d+[.\s][\s\S]*?(?:단계로\s*)?(?:넘어가겠습니다|진행하겠습니다|이동하겠습니다|시작하겠습니다)/i.test(
      normalized
    ) ||
    /다음\s*단계로\s*(?:넘어가겠습니다|진행하겠습니다|이동하겠습니다)/i.test(
      normalized
    )
  const mentionsNextStage =
    mentionsStageTransition ||
    /다음(?:으로| 단계| STEP)/i.test(normalized) ||
    /STEP\s*\d+[\s\S]*(?:넘어|진행|이동|들어가|시작)/i.test(normalized)

  return mentionsNextStage && (mentionsProceedQuestion || mentionsStageTransition)
}

function isProcessCheckPrompt(content: string) {
  const normalized = content.replace(/\s+/g, ' ').trim()

  return /프로세스/.test(normalized) && /확인하기|확인해\s*볼까요|확인할까요/i.test(normalized)
}

// STEP 1 진입 요청 (프로세스 소개 후 "STEP 1 시작할까요?" 맥락)
// STEP 1 완료 후 STEP 2 진행 요청과 구분하기 위해 사용
function isStep1EntryPrompt(content: string) {
  const normalized = content.replace(/\s+/g, ' ').trim()
  return (
    /STEP\s*1/i.test(normalized) &&
    /진행할까요|시작할까요|넘어가겠습니다/i.test(normalized) &&
    !/핵심\s*아이디어와\s*개발\s*조건이\s*정리|STEP\s*2\s*[.로]|사용자\s*명확화/i.test(normalized)
  )
}

export function ProjectChatContainer({
  initialMessages,
  initialStageKey,
  isNewProject,
  projectId,
  projectTitle,
  initialIsFavorite = false,
  userAvatarUrl,
  userPlanLabel = 'Free',
  userTokenCount = 400,
}: ProjectChatContainerProps) {
  const { language } = useAppLanguage()
  const { setSidebarState } = useProjectChatSidebar()
  const didRequestInitialResponseRef = useRef(false)
  const expertMenuRef = useRef<HTMLDivElement | null>(null)
  const messageScrollRef = useRef<HTMLDivElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const [messages, setMessages] = useState(initialMessages)
  const [stageKey, setStageKey] = useState(initialStageKey)
  const [activeExpert, setActiveExpert] = useState<ExpertKey>('aidee')
  const [isExpertMenuOpen, setIsExpertMenuOpen] = useState(false)
  const [input, setInput] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [selectedArtifactKind, setSelectedArtifactKind] =
    useState<LibraryArtifactKind | null>(null)
  const [personaCardModalData, setPersonaCardModalData] =
    useState<PersonaCardData | null>(null)
  const [confirmedPersonaMessageId, setConfirmedPersonaMessageId] = useState<
    string | null
  >(null)
  const [visualizedPersonaMessageId, setVisualizedPersonaMessageId] = useState<
    string | null
  >(null)
  const [keywordCardModalData, setKeywordCardModalData] =
    useState<KeywordCardData | null>(null)
  const [problemStatementsModalData, setProblemStatementsModalData] =
    useState<ProblemStatementsData | null>(null)
  const [visualizedProblemStatements, setVisualizedProblemStatements] =
    useState<ProblemStatementsData | null>(null)
  const [confirmedProblemStatementsMessageId, setConfirmedProblemStatementsMessageId] =
    useState<string | null>(null)
  const [visualizedKeywordCards, setVisualizedKeywordCards] = useState<
    Partial<Record<KeywordArtifactKind, KeywordCardData>>
  >({})
  const [confirmedKeywordArtifacts, setConfirmedKeywordArtifacts] = useState<
    Partial<Record<KeywordArtifactKind, string>>
  >({})
  const [visualizedDirectionArtifacts, setVisualizedDirectionArtifacts] =
    useState<Partial<Record<DirectionArtifactKind, string>>>({})
  const [confirmedDirectionArtifacts, setConfirmedDirectionArtifacts] =
    useState<Partial<Record<DirectionArtifactKind, string>>>({})
  const [visualizedRfpMessageId, setVisualizedRfpMessageId] = useState<
    string | null
  >(null)
  const [projectReportModalData, setProjectReportModalData] =
    useState<RfpDocument | null>(null)
  const [marketSizingModalData, setMarketSizingModalData] =
    useState<MarketSizingData | null>(null)
  const [consumptionKeywordModalData, setConsumptionKeywordModalData] =
    useState<ConsumptionKeywordData | null>(null)
  const [brandPositioningModalData, setBrandPositioningModalData] =
    useState<BrandPositioningData | null>(null)
  const [visualizedConsumptionKeywordData, setVisualizedConsumptionKeywordData] =
    useState<ConsumptionKeywordData | null>(null)
  const [isPending, setIsPending] = useState(false)
  const [moodboardModalOpen, setMoodboardModalOpen] = useState(false)
  const activeExpertDefinition = getExpertDefinition(activeExpert)
  const visibleMessages = useMemo(
    () => messages.filter((message) => message.role !== 'system'),
    [messages]
  )
  const latestAssistantMessage = useMemo(
    () =>
      [...visibleMessages]
        .reverse()
        .find((message) => message.role === 'assistant') ?? null,
    [visibleMessages]
  )
  const effectiveStageKey = useMemo(() => {
    if (!latestAssistantMessage || stageKey !== 'step_1_idea') {
      return stageKey
    }

    const inferredStage = inferStageMetaFromText({
      currentStageKey: stageKey,
      text: latestAssistantMessage.content,
    })

    return inferredStage.transition &&
      inferredStage.nextStageKey === 'step_2_persona'
      ? inferredStage.nextStageKey
      : stageKey
  }, [latestAssistantMessage, stageKey])
  const latestProjectDirection = useMemo(() => {
    for (const message of [...visibleMessages].reverse()) {
      if (message.role !== 'assistant') {
        continue
      }

      const parsed = extractProjectDirectionCard(message.content)

      if (parsed) {
        return parsed
      }
    }

    return null
  }, [visibleMessages])
  const latestVisualizedPersonaCard = useMemo(() => {
    for (const message of [...visibleMessages].reverse()) {
      if (message.personaCardBlock?.imageUrl) {
        return message.personaCardBlock
      }
    }

    return null
  }, [visibleMessages])
  const latestEditablePersonaMessage = useMemo(() => {
    for (const message of [...visibleMessages].reverse()) {
      if (message.personaCardBlock && !message.personaCardBlock.imageUrl) {
        return message
      }
    }

    return null
  }, [visibleMessages])
  const hasConfirmedLatestPersona = useMemo(() => {
    if (!latestEditablePersonaMessage) {
      return false
    }

    if (confirmedPersonaMessageId === latestEditablePersonaMessage.id) {
      return true
    }

    return visibleMessages.some(
      (message) =>
        message.role === 'user' &&
        message.seq_order > latestEditablePersonaMessage.seq_order &&
        /페르소나\s*카드.*확정|persona\s*card.*confirm/i.test(
          message.content
        )
    )
  }, [confirmedPersonaMessageId, latestEditablePersonaMessage, visibleMessages])
  const latestProblemStatementsMessageId = useMemo(() => {
    for (const message of [...visibleMessages].reverse()) {
      if (message.role !== 'assistant') continue
      if (extractProblemStatementsData(message.content)) return message.id
    }
    return null
  }, [visibleMessages])
  const isProblemStatementsConfirmed = Boolean(
    latestProblemStatementsMessageId &&
      confirmedProblemStatementsMessageId === latestProblemStatementsMessageId
  )
  const latestKeywordMessageIds = useMemo(() => {
    const latest: Partial<Record<KeywordArtifactKind, string>> = {}

    for (const message of [...visibleMessages].reverse()) {
      if (message.role !== 'assistant') {
        continue
      }

      for (const keywordCard of extractKeywordCardsData(message.content)) {
        if (!latest[keywordCard.kind]) {
          latest[keywordCard.kind] = message.id
        }
      }
    }

    return latest
  }, [visibleMessages])
  const confirmedKeywordKinds = useMemo(() => {
    const confirmed = new Set<KeywordArtifactKind>()

    for (const kind of ['experience_keywords', 'relationship_keywords'] as const) {
      const messageId = latestKeywordMessageIds[kind]

      if (messageId && confirmedKeywordArtifacts[kind] === messageId) {
        confirmed.add(kind)
        continue
      }

      const sourceMessage = visibleMessages.find((message) => message.id === messageId)

      if (!sourceMessage) {
        continue
      }

      const confirmationPattern =
        kind === 'experience_keywords'
          ? /Keywords:\s*Experience\s*확정|Experience\s*키워드.*확정/i
          : /Keywords:\s*Relationship\s*확정|Relationship\s*키워드.*확정/i

      if (
        visibleMessages.some(
          (message) =>
            message.role === 'user' &&
            message.seq_order > sourceMessage.seq_order &&
            confirmationPattern.test(message.content)
        )
      ) {
        confirmed.add(kind)
      }
    }

    return confirmed
  }, [confirmedKeywordArtifacts, latestKeywordMessageIds, visibleMessages])
  const directionKindsByMessageId = useMemo(() => {
    const kinds = new Map<string, DirectionArtifactKind>()
    let requestedKind: DirectionArtifactKind | null = null

    for (const message of visibleMessages) {
      if (message.role === 'user') {
        if (
          /소비\s*트렌드\s*리서치\s*(?:보기|다시\s*생성하기)/i.test(
            message.content
          )
        ) {
          requestedKind = 'consumption_keywords'
        } else if (
          /시장\s*규모\s*리서치\s*(?:보기|다시\s*생성하기)/i.test(
            message.content
          )
        ) {
          requestedKind = 'market_size'
        } else if (
          /경쟁사\s*리서치\s*(?:보기|다시\s*생성하기)/i.test(
            message.content
          )
        ) {
          requestedKind = 'brand_positioning'
        }

        continue
      }

      if (message.role !== 'assistant') {
        continue
      }

      const explicitKind = getDirectionArtifactKind(message.content)
      const kind = explicitKind ?? requestedKind

      if (kind) {
        kinds.set(message.id, kind)
      }

      requestedKind = null
    }

    return kinds
  }, [visibleMessages])
  const latestDirectionMessageIds = useMemo(() => {
    const latest: Partial<Record<DirectionArtifactKind, string>> = {}

    for (const message of [...visibleMessages].reverse()) {
      if (message.role !== 'assistant') {
        continue
      }

      const kind = directionKindsByMessageId.get(message.id)
      if (kind && !latest[kind]) {
        latest[kind] = message.id
      }
    }

    return latest
  }, [directionKindsByMessageId, visibleMessages])
  const confirmedDirectionKinds = useMemo(
    () =>
      new Set(
        (['market_size', 'consumption_keywords', 'brand_positioning'] as const).filter(
          (kind) =>
            Boolean(latestDirectionMessageIds[kind]) &&
            confirmedDirectionArtifacts[kind] === latestDirectionMessageIds[kind]
        )
      ),
    [confirmedDirectionArtifacts, latestDirectionMessageIds]
  )
  const latestRfpMessage = useMemo(() => {
    for (const message of [...visibleMessages].reverse()) {
      if (message.role === 'assistant' && extractRfpJsonBlock(message.content).rfp) {
        return message
      }
    }

    return null
  }, [visibleMessages])
  const latestRfp = useMemo(
    () =>
      latestRfpMessage
        ? extractRfpJsonBlock(latestRfpMessage.content).rfp
        : null,
    [latestRfpMessage]
  )
  const hasConfirmedLatestRfp = useMemo(() => {
    if (!latestRfpMessage) {
      return false
    }

    return visibleMessages.some(
      (message) =>
        message.role === 'user' &&
        message.seq_order > latestRfpMessage.seq_order &&
        /(?:프로젝트\s*)?기획안.*확정|project\s*(?:plan|report).*confirm/i.test(
          message.content
        )
    )
  }, [latestRfpMessage, visibleMessages])
  const hasVisualizedLatestRfp = Boolean(
    latestRfpMessage && visualizedRfpMessageId === latestRfpMessage.id
  )
  const availableArtifacts = useMemo(() => {
    const availableKinds = new Set<LibraryArtifactKind>()

    if (latestProjectDirection) {
      availableKinds.add('project_direction')
    }

    if (visualizedProblemStatements) {
      availableKinds.add('problem_statements')
    }

    if (visualizedKeywordCards.experience_keywords) {
      availableKinds.add('experience_keywords')
    }

    if (visualizedKeywordCards.relationship_keywords) {
      availableKinds.add('relationship_keywords')
    }

    for (const kind of [
      'market_size',
      'consumption_keywords',
      'brand_positioning',
    ] as const) {
      if (
        visualizedDirectionArtifacts[kind] &&
        visualizedDirectionArtifacts[kind] === latestDirectionMessageIds[kind]
      ) {
        availableKinds.add(getDirectionLibraryKind(kind))
      }
    }

    for (const message of visibleMessages) {
      if (message.personaCardBlock?.imageUrl) {
        availableKinds.add('persona')
      }

      const imageArtifactKind = getImageArtifactKind(
        message.generatedImageBlock?.purpose
      )

      if (imageArtifactKind && message.generatedImageBlock?.images.length) {
        availableKinds.add(imageArtifactKind)
      }

    }

    if (latestRfp && hasVisualizedLatestRfp) {
      availableKinds.add('project_report')
    }

    return LIBRARY_ARTIFACTS.filter((artifact) =>
      availableKinds.has(artifact.kind)
    )
  }, [
    hasVisualizedLatestRfp,
    latestProjectDirection,
    latestRfp,
    latestDirectionMessageIds,
    visibleMessages,
    visualizedDirectionArtifacts,
    visualizedKeywordCards,
    visualizedProblemStatements,
  ])
  const selectedArtifact = useMemo(
    () =>
      availableArtifacts.find(
        (artifact) => artifact.kind === selectedArtifactKind
      ) ?? null,
    [availableArtifacts, selectedArtifactKind]
  )

  useEffect(() => {
    const storageKey = `aidee:visualized-keyword-cards:${projectId}`
    let savedCards: string | null = null

    try {
      savedCards = window.localStorage.getItem(storageKey)
    } catch {
      savedCards = null
    }

    if (!savedCards) {
      return
    }

    const restoreTimer = window.setTimeout(() => {
      try {
        setVisualizedKeywordCards(
          JSON.parse(savedCards) as Partial<
            Record<KeywordArtifactKind, KeywordCardData>
          >
        )
      } catch {
        try {
          window.localStorage.removeItem(storageKey)
        } catch {
          // Ignore unavailable browser storage.
        }
      }
    }, 0)

    return () => window.clearTimeout(restoreTimer)
  }, [projectId])

  useEffect(() => {
    const storageKey = `aidee:confirmed-keyword-artifacts:${projectId}`
    const restoreTimer = window.setTimeout(() => {
      try {
        const saved = window.localStorage.getItem(storageKey)
        setConfirmedKeywordArtifacts(
          saved
            ? (JSON.parse(saved) as Partial<
                Record<KeywordArtifactKind, string>
              >)
            : {}
        )
      } catch {
        setConfirmedKeywordArtifacts({})
      }
    }, 0)

    return () => window.clearTimeout(restoreTimer)
  }, [projectId])

  useEffect(() => {
    const storageKey = `aidee:visualized-problem-statements:${projectId}`
    const restoreTimer = window.setTimeout(() => {
      try {
        const saved = window.localStorage.getItem(storageKey)
        if (saved) setVisualizedProblemStatements(JSON.parse(saved) as ProblemStatementsData)
      } catch {}
    }, 0)
    return () => window.clearTimeout(restoreTimer)
  }, [projectId])

  useEffect(() => {
    const storageKey = `aidee:confirmed-problem-statements:${projectId}`
    const restoreTimer = window.setTimeout(() => {
      try {
        setConfirmedProblemStatementsMessageId(
          window.localStorage.getItem(storageKey)
        )
      } catch {
        setConfirmedProblemStatementsMessageId(null)
      }
    }, 0)

    return () => window.clearTimeout(restoreTimer)
  }, [projectId])

  useEffect(() => {
    const restoreTimer = window.setTimeout(() => {
      try {
        setConfirmedPersonaMessageId(
          window.localStorage.getItem(`aidee:confirmed-persona:${projectId}`)
        )
        setVisualizedPersonaMessageId(
          window.localStorage.getItem(`aidee:visualized-persona:${projectId}`)
        )
      } catch {
        setConfirmedPersonaMessageId(null)
        setVisualizedPersonaMessageId(null)
      }
    }, 0)

    return () => window.clearTimeout(restoreTimer)
  }, [projectId])

  useEffect(() => {
    const storageKey = `aidee:visualized-consumption-keywords:${projectId}`
    const restoreTimer = window.setTimeout(() => {
      try {
        const saved = window.localStorage.getItem(storageKey)
        setVisualizedConsumptionKeywordData(
          saved ? (JSON.parse(saved) as ConsumptionKeywordData) : null
        )
      } catch {
        setVisualizedConsumptionKeywordData(null)
      }
    }, 0)

    return () => window.clearTimeout(restoreTimer)
  }, [projectId])

  useEffect(() => {
    const storageKey = `aidee:visualized-project-report:${projectId}`
    const restoreTimer = window.setTimeout(() => {
      try {
        setVisualizedRfpMessageId(window.localStorage.getItem(storageKey))
      } catch {
        setVisualizedRfpMessageId(null)
      }
    }, 0)

    return () => window.clearTimeout(restoreTimer)
  }, [projectId])

  useEffect(() => {
    const storageKey = `aidee:visualized-direction-artifacts:${projectId}`
    const restoreTimer = window.setTimeout(() => {
      try {
        const saved = window.localStorage.getItem(storageKey)
        setVisualizedDirectionArtifacts(
          saved
            ? (JSON.parse(saved) as Partial<
                Record<DirectionArtifactKind, string>
              >)
            : {}
        )
      } catch {
        setVisualizedDirectionArtifacts({})
      }
    }, 0)

    return () => window.clearTimeout(restoreTimer)
  }, [projectId])

  useEffect(() => {
    const storageKey = `aidee:confirmed-direction-artifacts:${projectId}`
    const restoreTimer = window.setTimeout(() => {
      try {
        const saved = window.localStorage.getItem(storageKey)
        setConfirmedDirectionArtifacts(
          saved
            ? (JSON.parse(saved) as Partial<
                Record<DirectionArtifactKind, string>
              >)
            : {}
        )
      } catch {
        setConfirmedDirectionArtifacts({})
      }
    }, 0)

    return () => window.clearTimeout(restoreTimer)
  }, [projectId])

  useEffect(() => {
    if (!isExpertMenuOpen) {
      return
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target

      if (
        target instanceof Node &&
        !expertMenuRef.current?.contains(target)
      ) {
        setIsExpertMenuOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsExpertMenuOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isExpertMenuOpen])

  const requestAssistantResponse = useCallback(async ({
    forceImageGeneration,
    message,
  }: {
    forceImageGeneration?: ForceImageGeneration
    message: string
  }) => {
    const trimmed = message.trim()

    if (isPending) {
      return null
    }

    const optimisticUserMessage: ChatMessageRecord | null = trimmed
      ? {
          content: trimmed,
          created_at: new Date().toISOString(),
          generatedImageBlock: null,
          id: `optimistic-${crypto.randomUUID()}`,
          personaCardBlock: null,
          role: 'user',
          seq_order:
            messages.reduce(
              (maxSeq, currentMessage) =>
                Math.max(maxSeq, currentMessage.seq_order),
              -1
            ) + 1,
          stageKey: effectiveStageKey,
        }
      : null

    setErrorMessage(null)
    setIsPending(true)

    if (optimisticUserMessage) {
      setMessages((current) => [...current, optimisticUserMessage])
      setInput('')
    }

    try {
      const response = await fetch('/api/chat', {
        body: JSON.stringify({
          activeExpert,
          currentStageKey: effectiveStageKey,
          forceImageGeneration,
          message: trimmed,
          projectId,
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
      const result = (await response.json()) as ChatApiResponse

      if (!response.ok) {
        throw new Error(result.error || '채팅 응답 생성에 실패했습니다.')
      }

      const savedUserMessage = result.userMessage ?? null
      const assistantMessage = result.message ?? null

      setMessages((current) => {
        let nextMessages = current

        if (optimisticUserMessage) {
          nextMessages = savedUserMessage
            ? current.map((currentMessage) =>
                currentMessage.id === optimisticUserMessage.id
                  ? savedUserMessage
                  : currentMessage
              )
            : current.filter(
                (currentMessage) =>
                  currentMessage.id !== optimisticUserMessage.id
              )
        } else if (
          savedUserMessage &&
          !nextMessages.some((messageItem) => messageItem.id === savedUserMessage.id)
        ) {
          nextMessages = [...nextMessages, savedUserMessage]
        }

        if (
          assistantMessage &&
          !nextMessages.some((messageItem) => messageItem.id === assistantMessage.id)
        ) {
          nextMessages = [...nextMessages, assistantMessage]
        }

        return nextMessages
      })
      setStageKey(result.nextStageKey ?? effectiveStageKey)
      return assistantMessage
    } catch (error) {
      if (optimisticUserMessage) {
        setMessages((current) =>
          current.filter(
            (currentMessage) => currentMessage.id !== optimisticUserMessage.id
          )
        )
        setInput(trimmed)
      }

      setErrorMessage(
        error instanceof Error ? error.message : '채팅 응답 생성에 실패했습니다.'
      )
      return null
    } finally {
      setIsPending(false)
    }
  }, [activeExpert, effectiveStageKey, isPending, messages, projectId])

  async function submitMessage(
    message: string,
    forceImageGeneration?: ForceImageGeneration
  ) {
    if (!message.trim()) {
      return
    }

    await requestAssistantResponse({
      forceImageGeneration,
      message,
    })
  }

  function confirmPersonaCard(messageId: string) {
    setConfirmedPersonaMessageId(messageId)

    try {
      window.localStorage.setItem(
        `aidee:confirmed-persona:${projectId}`,
        messageId
      )
    } catch {
      // The confirmation remains available for the current session.
    }
  }

  async function visualizePersonaCard(
    messageId: string,
    personaCard?: PersonaCardData | null
  ) {
    if (personaCard?.imageUrl) {
      setPersonaCardModalData(personaCard)
      return
    }

    if (!personaCard && latestVisualizedPersonaCard) {
      setPersonaCardModalData(latestVisualizedPersonaCard)
      return
    }

    const assistantMessage = await requestAssistantResponse({
      forceImageGeneration: 'persona_card',
      message: '',
    })

    if (assistantMessage?.personaCardBlock?.imageUrl) {
      setVisualizedPersonaMessageId(messageId)
      try {
        window.localStorage.setItem(
          `aidee:visualized-persona:${projectId}`,
          messageId
        )
      } catch {
        // The visualization remains available for the current session.
      }
      setPersonaCardModalData(assistantMessage.personaCardBlock)
    }
  }

  function visualizeProblemStatements(data: ProblemStatementsData) {
    setVisualizedProblemStatements(data)
    try {
      window.localStorage.setItem(
        `aidee:visualized-problem-statements:${projectId}`,
        JSON.stringify(data)
      )
    } catch {}
    setProblemStatementsModalData(data)
  }

  function confirmProblemStatements(messageId: string) {
    setConfirmedProblemStatementsMessageId(messageId)

    try {
      window.localStorage.setItem(
        `aidee:confirmed-problem-statements:${projectId}`,
        messageId
      )
    } catch {
      // The confirmation remains available for the current session.
    }
  }

  function visualizeKeywordCard(data: KeywordCardData) {
    setVisualizedKeywordCards((current) => {
      const nextCards = {
        ...current,
        [data.kind]: data,
      }

      try {
        window.localStorage.setItem(
          `aidee:visualized-keyword-cards:${projectId}`,
          JSON.stringify(nextCards)
        )
      } catch {
        // The visualization remains available for the current session.
      }

      return nextCards
    })
    setKeywordCardModalData(data)
  }

  function confirmKeywordCard(
    kind: KeywordArtifactKind,
    messageId: string
  ) {
    setConfirmedKeywordArtifacts((current) => {
      const next = { ...current, [kind]: messageId }

      try {
        window.localStorage.setItem(
          `aidee:confirmed-keyword-artifacts:${projectId}`,
          JSON.stringify(next)
        )
      } catch {
        // The confirmation remains available for the current session.
      }

      return next
    })
  }

  function visualizeProjectReport(messageId: string, rfp: RfpDocument) {
    setVisualizedRfpMessageId(messageId)
    setProjectReportModalData(rfp)

    try {
      window.localStorage.setItem(
        `aidee:visualized-project-report:${projectId}`,
        messageId
      )
    } catch {
      // The visualization remains available for the current session.
    }
  }

  function visualizeDirectionArtifact(
    kind: DirectionArtifactKind,
    messageId: string,
    content: string
  ) {
    setVisualizedDirectionArtifacts((current) => {
      const next = { ...current, [kind]: messageId }

      try {
        window.localStorage.setItem(
          `aidee:visualized-direction-artifacts:${projectId}`,
          JSON.stringify(next)
        )
      } catch {
        // The visualization remains available for the current session.
      }

      return next
    })

    if (kind === 'market_size') {
      setMarketSizingModalData(extractMarketSizingData(content))
      return
    }

    if (kind === 'consumption_keywords') {
      const data = extractConsumptionKeywordData(content, { force: true })
      setVisualizedConsumptionKeywordData(data)
      setConsumptionKeywordModalData(data)

      if (data) {
        try {
          window.localStorage.setItem(
            `aidee:visualized-consumption-keywords:${projectId}`,
            JSON.stringify(data)
          )
        } catch {
          // The visualization remains available for the current session.
        }
      }
      return
    }

    if (kind === 'brand_positioning') {
      setBrandPositioningModalData(extractBrandPositioningData(content))
      return
    }

    setSelectedArtifactKind(getDirectionLibraryKind(kind))
  }

  function confirmDirectionArtifact(
    kind: DirectionArtifactKind,
    messageId: string
  ) {
    setConfirmedDirectionArtifacts((current) => {
      const next = { ...current, [kind]: messageId }

      try {
        window.localStorage.setItem(
          `aidee:confirmed-direction-artifacts:${projectId}`,
          JSON.stringify(next)
        )
      } catch {
        // The confirmation remains available for the current session.
      }

      return next
    })
  }

  function resizeComposer() {
    const textarea = textareaRef.current

    if (!textarea) {
      return
    }

    textarea.style.height = 'auto'
    textarea.style.height = `${Math.min(textarea.scrollHeight, 112)}px`
  }

  useEffect(() => {
    const hasAssistantMessage = messages.some(
      (message) => message.role === 'assistant'
    )

    if (
      !isNewProject ||
      hasAssistantMessage ||
      didRequestInitialResponseRef.current ||
      isPending
    ) {
      return
    }

    didRequestInitialResponseRef.current = true
    requestAssistantResponse({ message: '' })
  }, [isNewProject, isPending, messages, requestAssistantResponse])

  useEffect(() => {
    const container = messageScrollRef.current

    if (!container) {
      return
    }

    container.scrollTop = container.scrollHeight
  }, [visibleMessages.length, isPending])

  useEffect(() => {
    resizeComposer()
  }, [input])

  useEffect(() => {
    const hasConfirmedProcess = visibleMessages.some(
      (message) =>
        message.role === 'user' && /프로세스\s*확인하기/.test(message.content)
    )

    setSidebarState({
      activeExpert,
      activeExperts: STAGE_EXPERTS[effectiveStageKey],
      activeStageKey: effectiveStageKey,
      showProgress: hasConfirmedProcess || effectiveStageKey !== 'step_0_start',
    })

    return () => setSidebarState(defaultProjectChatSidebarState)
  }, [activeExpert, effectiveStageKey, setSidebarState, visibleMessages])

  async function downloadRfp() {
    try {
      const response = await fetch('/api/rfp/download', {
        body: JSON.stringify({ projectId }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })

      if (!response.ok) {
        const result = (await response.json().catch(() => null)) as {
          error?: string
        } | null
        throw new Error(
          result?.error || '프로젝트 기획안 다운로드에 실패했습니다.'
        )
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${projectTitle || 'aidee-project-plan'}.md`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : '프로젝트 기획안 다운로드에 실패했습니다.'
      )
    }
  }

  return (
    <div className="relative flex h-full min-h-0 bg-white">
      <section className="flex min-w-0 flex-1 flex-col border-r border-gray-200 bg-white">
        <header className="flex h-[clamp(52px,5.93svh,64px)] shrink-0 items-center justify-between border-b border-gray-200 bg-white px-[clamp(24px,3.7svh,40px)] py-[clamp(10px,1.48svh,16px)] shadow-[0px_12px_40px_-12px_rgba(0,0,0,0.06)]">
          <h1 className="min-w-0 truncate font-['Inter'] text-[clamp(20px,2.22svh,24px)] font-semibold leading-10 text-neutral-900">
            {projectTitle}
          </h1>
          <div className="flex shrink-0 items-center gap-2">
            <ProjectFavoriteButton
              projectId={projectId}
              initialIsFavorite={initialIsFavorite}
              className="flex h-[clamp(28px,2.96svh,32px)] w-[clamp(28px,2.96svh,32px)] items-center justify-center rounded-lg transition hover:bg-zinc-100 disabled:opacity-60"
            />
            <ProjectMoreMenu
              projectId={projectId}
              redirectAfterDelete="/workspace"
              triggerClassName="flex h-[clamp(28px,2.96svh,32px)] w-[clamp(28px,2.96svh,32px)] items-center justify-center rounded-lg transition hover:bg-zinc-100"
            />
          </div>
        </header>

        <section
          ref={messageScrollRef}
          className="app-content-scrollbar min-h-0 flex-1 overflow-y-auto px-[clamp(24px,3.7svh,40px)] py-[clamp(24px,3.7svh,40px)]"
        >
          <div className="mx-auto flex w-full max-w-[1150px] flex-col gap-[clamp(14px,1.85svh,20px)]">
            {visibleMessages.length > 0 ? (
              visibleMessages.map((message) => (
                <ChatBubble
                  key={message.id}
                  message={message}
                  canShowStyleReferences={visibleMessages.some(
                    (candidate) =>
                      candidate.role === 'user' &&
                      candidate.seq_order < message.seq_order &&
                      /(?:다음\s*(?:단계|STEP)(?:로)?\s*(?:진행|넘어가|이동|시작)|STEP\s*4(?:로)?\s*(?:진행|넘어가|이동|시작)|스타일\s*(?:컨셉|단계)(?:로)?\s*(?:진행|넘어가|이동|시작))/i.test(
                        candidate.content
                      )
                  )}
                  disabled={isPending}
                  hasConfirmedPersona={hasConfirmedLatestPersona}
                  hasVisualizedPersona={
                    message.id === visualizedPersonaMessageId
                  }
                  hasConfirmedRfp={hasConfirmedLatestRfp}
                  hasVisualizedRfp={hasVisualizedLatestRfp}
                  confirmedDirectionKinds={confirmedDirectionKinds}
                  confirmedKeywordKinds={confirmedKeywordKinds}
                  isProblemStatementsConfirmed={isProblemStatementsConfirmed}
                  isLatestEditablePersona={
                    message.id === latestEditablePersonaMessage?.id
                  }
                  latestKeywordMessageIds={latestKeywordMessageIds}
                  latestProblemStatementsMessageId={latestProblemStatementsMessageId}
                  latestDirectionMessageIds={latestDirectionMessageIds}
                  directionArtifactKindOverride={
                    directionKindsByMessageId.get(message.id) ?? null
                  }
                  latestRfpMessageId={latestRfpMessage?.id ?? null}
                  onChoice={(value) => submitMessage(value)}
                  onConfirmKeyword={confirmKeywordCard}
                  onConfirmPersona={confirmPersonaCard}
                  onDownloadRfp={downloadRfp}
                  onOpenMoodboardModal={() => setMoodboardModalOpen(true)}
                  onVisualizeKeyword={visualizeKeywordCard}
                  onVisualizeProblemStatements={visualizeProblemStatements}
                  onConfirmProblemStatements={confirmProblemStatements}
                  onVisualizePersona={visualizePersonaCard}
                  onVisualizeDirection={visualizeDirectionArtifact}
                  onConfirmDirection={confirmDirectionArtifact}
                  onVisualizeRfp={visualizeProjectReport}
                  projectId={projectId}
                  userAvatarUrl={userAvatarUrl}
                  visualizedKeywordCards={visualizedKeywordCards}
                  visualizedDirectionArtifacts={visualizedDirectionArtifacts}
                  visualizedProblemStatements={visualizedProblemStatements}
                />
              ))
            ) : (
              <div className="flex min-h-[420px] items-center justify-center text-sm font-medium text-zinc-400">
                {isPending
                  ? ' '
                  : '첫 메시지를 입력하면 프로젝트 requirements 기반 대화가 시작됩니다.'}
              </div>
            )}

            {isPending ? <AssistantTypingBubble /> : null}
          </div>
        </section>

        <div className="shrink-0 px-[clamp(24px,3.7svh,40px)] pb-[clamp(16px,2.22svh,24px)] pt-2">
          {errorMessage ? (
            <p className="mb-3 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
              {errorMessage}
            </p>
          ) : null}

          <div ref={expertMenuRef} className="relative mx-auto w-full max-w-[1171px]">
            {isExpertMenuOpen ? (
              <div className="absolute bottom-[calc(100%+12px)] left-0 z-30 w-48 overflow-hidden rounded-[20px] border-[3px] border-gray-100 bg-white py-1 shadow-[2px_2px_8px_1px_rgba(0,0,0,0.25)]">
                <div className="flex h-10 items-center px-5">
                  <p className="font-['Inter'] text-xs font-medium leading-6 text-zinc-400">
                    {language === 'ENG' ? 'Select AI Mentor' : 'AI 전문가 선택'}
                  </p>
                </div>
                <div className="flex flex-col">
                  {EXPERT_MENU_ITEMS.map((expert) => {
                    const isActive = activeExpert === expert.key

                    return (
                      <button
                        key={expert.key}
                        type="button"
                        disabled={isPending}
                        onClick={() => {
                          setActiveExpert(expert.key)
                          setIsExpertMenuOpen(false)
                        }}
                        className={`group flex h-12 w-full items-center gap-5 rounded-lg px-5 py-3 text-left transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 ${
                          isActive ? 'bg-blue-50 text-zinc-900' : 'text-zinc-500'
                        }`}
                      >
                        <Image
                          src={expert.icon}
                          alt=""
                          width={28}
                          height={28}
                          unoptimized
                          className={`h-7 w-7 shrink-0 object-contain transition duration-150 group-hover:brightness-100 group-hover:grayscale-0 group-hover:opacity-100 ${
                            isActive
                              ? 'brightness-100 grayscale-0'
                              : 'brightness-0 grayscale opacity-60'
                          }`}
                        />
                        <span className="min-w-0 flex-1 font-['Inter'] text-sm font-semibold leading-6">
                          {expert.label[language]}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            ) : null}

            <form
              className="flex min-h-[clamp(52px,5.93svh,64px)] w-full items-end gap-[clamp(12px,1.48svh,16px)] overflow-hidden rounded-[20px] bg-white px-[clamp(20px,2.22svh,24px)] py-[clamp(10px,1.11svh,12px)] shadow-[0px_1px_5px_1px_rgba(0,0,0,0.25)] outline outline-2 outline-offset-[-2px] outline-stone-300"
              onSubmit={(event) => {
                event.preventDefault()
                submitMessage(input)
              }}
            >
              <button
                type="button"
                disabled={isPending}
                aria-expanded={isExpertMenuOpen}
                aria-label={
                  language === 'ENG' ? 'Select AI Mentor' : 'AI 전문가 선택'
                }
                onClick={() => setIsExpertMenuOpen((open) => !open)}
                className="mb-1 flex h-[clamp(20px,2.22svh,24px)] w-[clamp(20px,2.22svh,24px)] shrink-0 items-center justify-center rounded-full bg-blue-600 transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <div className="h-[clamp(11px,1.3svh,14px)] w-[clamp(11px,1.3svh,14px)] rounded-full bg-white" />
              </button>
              <textarea
                ref={textareaRef}
                rows={1}
                value={input}
                onChange={(event) => {
                  setInput(event.target.value)
                  requestAnimationFrame(resizeComposer)
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                    event.preventDefault()
                    submitMessage(input)
                  }
                }}
                placeholder={activeExpertDefinition.inputLabel}
                className="max-h-28 min-h-6 min-w-0 flex-1 resize-none overflow-y-auto bg-transparent font-['Pretendard'] text-[clamp(13px,1.3svh,14px)] font-medium leading-6 text-neutral-900 outline-none placeholder:text-stone-300"
              />
              <button
                type="submit"
                disabled={isPending || !input.trim()}
                aria-label="메시지 전송"
                className="mb-0.5 flex h-[clamp(28px,2.96svh,32px)] w-[clamp(28px,2.96svh,32px)] shrink-0 items-center justify-center rounded-full text-stone-300 transition hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Image
                  src="/assets/icons/chat/chat-send-2.svg"
                  alt=""
                  width={20}
                  height={20}
                  unoptimized
                  className="h-[clamp(18px,1.85svh,20px)] w-[clamp(18px,1.85svh,20px)] object-contain"
                />
              </button>
            </form>
          </div>
        </div>
      </section>

      <LibraryPanel
        artifacts={availableArtifacts}
        onSelectArtifact={(kind) => {
          if (kind === 'project_direction') {
            return
          }

          if (kind === 'problem_statements' && visualizedProblemStatements) {
            setProblemStatementsModalData(visualizedProblemStatements)
            return
          }

          if (kind === 'persona' && latestVisualizedPersonaCard) {
            setPersonaCardModalData(latestVisualizedPersonaCard)
            return
          }

          if (
            (kind === 'experience_keywords' ||
              kind === 'relationship_keywords') &&
            visualizedKeywordCards[kind]
          ) {
            setKeywordCardModalData(visualizedKeywordCards[kind])
            return
          }

          if (kind === 'project_report' && latestRfp) {
            setProjectReportModalData(latestRfp)
            return
          }

          if (kind === 'market_sizing') {
            const sourceMessage = visibleMessages.find(
              (message) => message.id === latestDirectionMessageIds.market_size
            )
            setMarketSizingModalData(
              sourceMessage ? extractMarketSizingData(sourceMessage.content) : null
            )
            return
          }

          if (kind === 'consumption_keywords') {
            if (visualizedConsumptionKeywordData) {
              setConsumptionKeywordModalData(visualizedConsumptionKeywordData)
              return
            }

            const sourceMessage = visibleMessages.find(
              (message) =>
                message.id === latestDirectionMessageIds.consumption_keywords
            )
            const extracted = sourceMessage
              ? (extractConsumptionKeywordData(sourceMessage.content) ??
                 extractConsumptionKeywordData(sourceMessage.content, { force: true }))
              : null
            setConsumptionKeywordModalData(extracted)
            return
          }

          if (kind === 'brand_positioning') {
            const sourceMessage = visibleMessages.find(
              (message) =>
                message.id === latestDirectionMessageIds.brand_positioning
            )
            setBrandPositioningModalData(
              sourceMessage
                ? extractBrandPositioningData(sourceMessage.content)
                : null
            )
            return
          }

          setSelectedArtifactKind(kind)
        }}
        planLabel={userPlanLabel}
        selectedArtifactKind={selectedArtifactKind}
        tokenCount={userTokenCount}
        userAvatarUrl={userAvatarUrl}
      />

      <LibraryArtifactModal
        artifact={selectedArtifact}
        onClose={() => setSelectedArtifactKind(null)}
        projectDirection={latestProjectDirection}
      />

      <PersonaCardModal
        data={personaCardModalData}
        onClose={() => setPersonaCardModalData(null)}
      />

      <ProblemStatementsModal
        data={problemStatementsModalData}
        onClose={() => setProblemStatementsModalData(null)}
      />

      <KeywordCardModal
        data={keywordCardModalData}
        onClose={() => setKeywordCardModalData(null)}
      />

      <ProjectReportModal
        data={projectReportModalData}
        onClose={() => setProjectReportModalData(null)}
        onDownload={downloadRfp}
      />

      <MarketSizingModal
        data={marketSizingModalData}
        onClose={() => setMarketSizingModalData(null)}
      />

      <ConsumptionKeywordModal
        data={consumptionKeywordModalData}
        onClose={() => setConsumptionKeywordModalData(null)}
      />

      <BrandPositioningModal
        data={brandPositioningModalData}
        onClose={() => setBrandPositioningModalData(null)}
      />

      <MoodboardModal
        isOpen={moodboardModalOpen}
        onClose={() => setMoodboardModalOpen(false)}
        projectId={projectId}
      />
    </div>
  )
}

function LibraryPanel({
  artifacts,
  onSelectArtifact,
  planLabel,
  selectedArtifactKind,
  tokenCount,
  userAvatarUrl,
}: {
  artifacts: LibraryArtifact[]
  onSelectArtifact: (kind: LibraryArtifactKind) => void
  planLabel: string
  selectedArtifactKind: LibraryArtifactKind | null
  tokenCount: number
  userAvatarUrl?: string | null
}) {
  return (
    <aside className="flex h-full w-[18.3%] min-w-[clamp(220px,23.7svh,256px)] max-w-[clamp(248px,26.67svh,288px)] shrink-0 flex-col overflow-hidden bg-white">
      <header className="flex h-[clamp(52px,5.93svh,64px)] shrink-0 items-center justify-end border-b border-gray-200 px-[clamp(18px,2.59svh,28px)] py-[clamp(10px,1.48svh,16px)]">
        <div className="flex items-center justify-end gap-1">
          <div className="relative h-[clamp(32px,3.7svh,40px)] w-[clamp(32px,3.7svh,40px)] shrink-0 overflow-hidden rounded-full bg-green-200">
            {userAvatarUrl ? (
              <Image
                src={userAvatarUrl}
                alt=""
                width={40}
                height={40}
                unoptimized
                className="h-full w-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm font-bold text-green-900">
                U
              </div>
            )}
          </div>

          <div className="flex items-center justify-center gap-2 rounded-xl px-[clamp(8px,0.93svh,10px)] py-[clamp(6px,0.74svh,8px)]">
            <Image
              src="/assets/icons/account/token.svg"
              alt=""
              width={24}
              height={24}
              unoptimized
              className="h-[clamp(20px,2.22svh,24px)] w-[clamp(20px,2.22svh,24px)]"
            />
            <span className="font-['Inter'] text-[clamp(15px,1.67svh,18px)] font-semibold leading-6 text-blue-600">
              {tokenCount}
            </span>
          </div>

          <div className="flex h-[clamp(32px,3.7svh,40px)] w-[clamp(76px,8.89svh,96px)] items-center justify-center rounded-xl bg-blue-600 px-[clamp(16px,2.22svh,24px)] py-[clamp(6px,0.74svh,8px)]">
            <span className="font-['Inter'] text-[clamp(15px,1.67svh,18px)] font-semibold leading-6 text-white">
              {planLabel}
            </span>
          </div>
        </div>
      </header>

      <div className="app-content-scrollbar min-h-0 flex-1 overflow-y-auto px-[clamp(18px,2.22svh,24px)] py-[clamp(18px,2.22svh,24px)]">
        <div className="flex flex-col gap-[clamp(10px,1.3svh,14px)]">
          {artifacts.map((artifact, index) => {
            const isProjectDirection = artifact.kind === 'project_direction'
            const isProblemStatements = artifact.kind === 'problem_statements'
            const isPersona = artifact.kind === 'persona'
            const isExperienceKeywords =
              artifact.kind === 'experience_keywords'
            const isRelationshipKeywords =
              artifact.kind === 'relationship_keywords'
            const isMarketSizing = artifact.kind === 'market_sizing'
            const isConsumptionKeywords =
              artifact.kind === 'consumption_keywords'
            const isBrandPositioning = artifact.kind === 'brand_positioning'
            const isProjectReport = artifact.kind === 'project_report'
            const isMoodBoard = artifact.kind === 'mood_board'
            const isRendering = artifact.kind === 'rendering'
            const isSelected = artifact.kind === selectedArtifactKind

            return (
              <button
                key={artifact.kind}
                type="button"
                disabled={isProjectDirection}
                onClick={() => onSelectArtifact(artifact.kind)}
                className={`relative mx-auto aspect-[184/140] w-[clamp(136px,17.04svh,184px)] max-w-full overflow-hidden rounded-[clamp(15px,1.85svh,20px)] text-left outline-none transition ${
                  isProjectDirection
                    ? 'cursor-default bg-violet-100'
                    : isProblemStatements
                      ? 'bg-[#232326]'
                    : isPersona
                      ? 'bg-[#DCD6D8]'
                      : isExperienceKeywords
                        ? 'bg-violet-100'
                        : isRelationshipKeywords
                          ? 'bg-violet-200'
                          : isMarketSizing
                            ? 'bg-[#DDF444]'
                            : isConsumptionKeywords
                              ? 'bg-[#DDF444]'
                          : isBrandPositioning
                            ? 'bg-indigo-200'
                          : isProjectReport
                            ? 'bg-[#DDF444]'
                          : isMoodBoard
                            ? 'bg-stone-300'
                            : isRendering
                              ? 'bg-indigo-400'
                    : 'bg-zinc-100'
                } ${
                  isSelected
                    ? 'ring-2 ring-blue-600'
                    : isProjectDirection
                      ? ''
                      : 'hover:ring-2 hover:ring-zinc-200'
                }`}
              >
                {isProjectDirection ? (
                  <div className="flex h-full flex-col p-[clamp(8px,0.93svh,10px)]">
                    <h2 className="whitespace-pre-line font-['Inter'] text-[clamp(20px,2.78svh,30px)] font-medium leading-[1.07] text-black">
                      Project
                      <br />
                      Direction
                    </h2>
                    <div className="mt-auto flex justify-end gap-[clamp(4px,0.46svh,5px)]">
                      <Image
                        src="/assets/icons/chat-badge/project-direction-arrow.svg"
                        alt=""
                        width={54}
                        height={54}
                        unoptimized
                        className="h-[clamp(36px,5svh,54px)] w-[clamp(36px,5svh,54px)] shrink-0"
                      />
                      <Image
                        src="/assets/icons/chat-badge/project-direction-add.svg"
                        alt=""
                        width={54}
                        height={54}
                        unoptimized
                        className="h-[clamp(36px,5svh,54px)] w-[clamp(36px,5svh,54px)] shrink-0"
                      />
                    </div>
                  </div>
                ) : isProblemStatements ? (
                  <>
                    <Image
                      src="/assets/icons/chat-badge/problem-statements.svg"
                      alt=""
                      width={179}
                      height={140}
                      unoptimized
                      className="absolute left-0 top-0 h-full w-auto max-w-none"
                    />
                    <h2 className="absolute left-[5.43%] top-[7.14%] z-10 font-['Inter'] text-[clamp(20px,2.78svh,30px)] font-medium leading-[1.07]">
                      <span className="text-black">Problem</span>
                      <br />
                      <span className="text-neutral-800">Statements</span>
                    </h2>
                  </>
                ) : isPersona ? (
                  <>
                    <h2 className="absolute left-[5.43%] top-[7.14%] z-10 font-['Inter'] text-[clamp(20px,2.78svh,30px)] font-medium leading-[1.7] text-[#232323]">
                      Persona
                    </h2>
                    <Image
                      src="/assets/icons/chat-badge/persona-yellow.svg"
                      alt=""
                      width={184}
                      height={92}
                      unoptimized
                      className="absolute left-0 top-[29.29%] h-auto w-full"
                    />
                    <Image
                      src="/assets/icons/chat-badge/persona-black.svg"
                      alt=""
                      width={184}
                      height={79}
                      unoptimized
                      className="absolute left-0 top-[43.57%] h-auto w-full"
                    />
                  </>
                ) : isExperienceKeywords ? (
                  <>
                    <h2 className="absolute left-[5.43%] top-[7.14%] z-10 whitespace-pre-line font-['Inter'] text-[clamp(20px,2.78svh,30px)] font-medium leading-[1.07] text-black">
                      Keywords:
                      <br />
                      Experience
                    </h2>
                    <Image
                      src="/assets/icons/chat-badge/keyword-experience-blue1.svg"
                      alt=""
                      width={109}
                      height={50}
                      unoptimized
                      className="absolute left-[5.43%] top-[55.71%] h-auto w-[59.24%]"
                    />
                    <Image
                      src="/assets/icons/chat-badge/keyword-experience-blue2.svg"
                      alt=""
                      width={60}
                      height={50}
                      unoptimized
                      className="absolute left-[67.39%] top-[55.71%] h-auto w-[32.61%]"
                    />
                  </>
                ) : isRelationshipKeywords ? (
                  <>
                    <h2 className="absolute left-[5.43%] top-[7.14%] z-10 whitespace-pre-line font-['Inter'] text-[clamp(20px,2.78svh,30px)] font-medium leading-[1.07] text-black">
                      Keywords:
                      <br />
                      Relationship
                    </h2>
                    <Image
                      src="/assets/icons/chat-badge/keyword-relationship-blue1.svg"
                      alt=""
                      width={60}
                      height={50}
                      unoptimized
                      className="absolute left-0 top-[55.71%] h-auto w-[34.24%]"
                    />
                    <Image
                      src="/assets/icons/chat-badge/keyword-relationship-blue2.svg"
                      alt=""
                      width={109}
                      height={50}
                      unoptimized
                      className="absolute left-[36.96%] top-[55.71%] h-auto w-[59.24%]"
                    />
                  </>
                ) : isMoodBoard ? (
                  <>
                    <h2 className="absolute left-[5.43%] top-[7.14%] z-10 font-['Inter'] text-[clamp(20px,2.78svh,30px)] font-medium leading-[1.07] text-neutral-800">
                      Mood Board
                    </h2>
                    <Image
                      src="/assets/icons/chat-badge/moodboard-1.svg"
                      alt=""
                      width={13}
                      height={73}
                      unoptimized
                      className="absolute left-[5.43%] top-[37.86%] h-[52.14%] w-auto"
                    />
                    <Image
                      src="/assets/icons/chat-badge/moodboard-2.svg"
                      alt=""
                      width={27}
                      height={73}
                      unoptimized
                      className="absolute left-[15.22%] top-[37.86%] h-[52.14%] w-auto"
                    />
                    <Image
                      src="/assets/icons/chat-badge/moodboard-3.svg"
                      alt=""
                      width={48}
                      height={73}
                      unoptimized
                      className="absolute left-[32.61%] top-[37.86%] h-[52.14%] w-auto"
                    />
                    <Image
                      src="/assets/icons/chat-badge/moodboard-4.svg"
                      alt=""
                      width={71}
                      height={73}
                      unoptimized
                      className="absolute left-[61.41%] top-[37.86%] h-[52.14%] w-auto"
                    />
                  </>
                ) : isRendering ? (
                  <>
                    <h2 className="absolute left-[5.43%] top-[7.14%] z-10 whitespace-pre-line font-['Inter'] text-[clamp(20px,2.78svh,30px)] font-medium leading-[1.07] text-neutral-800">
                      3D Design:
                      <br />
                      Rendering
                    </h2>
                    <Image
                      src="/assets/icons/chat-badge/3d-design-rendering.svg"
                      alt=""
                      width={81}
                      height={90}
                      unoptimized
                      className="absolute left-[58.52%] top-[27.78%] h-auto w-[44.02%]"
                    />
                  </>
                ) : isMarketSizing ? (
                  <>
                    <h2 className="absolute left-[5.98%] top-[7.14%] whitespace-pre-line font-['Inter'] text-[clamp(20px,2.78svh,30px)] font-medium leading-[1.07] text-neutral-800">
                      TAM SAM
                      <br />
                      SOM
                    </h2>
                    <Image
                      src="/assets/icons/chat-badge/tam-sam-som.svg"
                      alt=""
                      width={165}
                      height={40}
                      unoptimized
                      className="absolute bottom-[7.14%] left-[5.43%] h-auto w-[89.67%]"
                    />
                  </>
                ) : isConsumptionKeywords ? (
                  <>
                    <h2 className="absolute left-[5.43%] top-[7.14%] z-10 whitespace-pre-line font-['Inter'] text-[clamp(20px,2.78svh,30px)] font-medium leading-[1.07] text-black">
                      Keywords:
                      <br />
                      Consumption
                    </h2>
                    <Image
                      src="/assets/icons/chat-badge/keywords-consumption-white.svg"
                      alt=""
                      width={109}
                      height={50}
                      unoptimized
                      className="absolute left-[5.43%] top-[55.71%] h-auto w-[59.24%]"
                    />
                    <Image
                      src="/assets/icons/chat-badge/keywords-consumption-black.svg"
                      alt=""
                      width={60}
                      height={50}
                      unoptimized
                      className="absolute left-[67.39%] top-[55.71%] h-auto w-[32.61%]"
                    />
                  </>
                ) : isBrandPositioning ? (
                  <>
                    <h2 className="absolute left-[5.43%] top-[7.14%] z-10 whitespace-pre-line font-['Inter'] text-[clamp(20px,2.78svh,30px)] font-medium leading-[1.07] text-neutral-800">
                      Positioning
                      <br />
                      Map: Brand
                    </h2>
                    <Image
                      src="/assets/icons/chat-badge/positioning-map.svg"
                      alt=""
                      width={164}
                      height={111}
                      unoptimized
                      className="absolute bottom-[5%] left-[5%] h-auto w-[90%]"
                    />
                  </>
                ) : isProjectReport ? (
                  <>
                    <h2 className="absolute left-[5.43%] top-[7.14%] z-10 whitespace-pre-line font-['Inter'] text-[clamp(20px,2.78svh,30px)] font-medium leading-[1.07] text-neutral-800">
                      Project
                      <br />
                      Report
                    </h2>
                    <Image
                      src="/assets/icons/chat-badge/project-report.svg"
                      alt=""
                      width={164}
                      height={51}
                      unoptimized
                      className="absolute bottom-0 left-[5%] h-auto w-[90%]"
                    />
                  </>
                ) : index % 3 === 1 ? (
                  <>
                    <h2 className="absolute left-2.5 top-2.5 whitespace-pre-line font-['Inter'] text-[clamp(20px,2.22svh,24px)] font-medium leading-7 text-black">
                      {artifact.title.replace(': ', ':\n')}
                    </h2>
                    <div className="absolute bottom-0 left-0 h-[clamp(46px,5.93svh,64px)] w-full bg-[#DDF444]" />
                  </>
                ) : index % 3 === 2 ? (
                  <>
                    <h2 className="absolute left-2.5 top-2.5 whitespace-pre-line font-['Inter'] text-[clamp(20px,2.22svh,24px)] font-medium leading-7 text-black">
                      {artifact.title.replace(': ', ':\n')}
                    </h2>
                    <div className="absolute bottom-4 left-3 h-[clamp(38px,4.44svh,48px)] w-[clamp(84px,10.37svh,112px)] rounded-full bg-blue-600" />
                    <div className="absolute bottom-4 left-[clamp(84px,10.37svh,112px)] h-[clamp(38px,4.44svh,48px)] w-[clamp(84px,10.37svh,112px)] rounded-full bg-indigo-400" />
                  </>
                ) : (
                  <>
                    <h2 className="absolute left-2.5 top-2.5 whitespace-pre-line font-['Inter'] text-[clamp(20px,2.22svh,24px)] font-medium leading-7 text-black">
                      {artifact.title.replace(': ', ':\n')}
                    </h2>
                    <div className="absolute -bottom-8 -right-8 h-[clamp(84px,10.37svh,112px)] w-[clamp(84px,10.37svh,112px)] rounded-full bg-indigo-300" />
                  </>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </aside>
  )
}

function getBudgetHeadline(value: string) {
  const normalized = value.replace(/\s+/g, ' ').trim()

  if (!normalized || normalized === '미정') {
    return 'Scope'
  }

  const dollarBudget = normalized.match(/\$\s*([\d,.]+)\s*([KMB])?/i)
  if (dollarBudget) {
    return `$${dollarBudget[1]}${dollarBudget[2]?.toUpperCase() ?? ''}+`
  }

  const manwonBudget = normalized.match(/([\d,]+)\s*만\s*원/)
  if (manwonBudget) {
    const manwon = Number(manwonBudget[1].replace(/,/g, ''))
    return `$${Math.max(1, Math.round(manwon / 100))}K+`
  }

  const eokBudget = normalized.match(/([\d,.]+)\s*억\s*원/)
  if (eokBudget) {
    const eok = Number(eokBudget[1].replace(/,/g, ''))
    return `$${Math.max(100, Math.round(eok * 100))}K+`
  }

  return 'Scope'
}

function formatDurationEn(raw: string): string {
  if (!raw) return 'TBD'
  const match = raw.match(/(\d+)\s*(개월|달|주|년|해)/)
  if (!match) return raw
  const num = Number(match[1])
  const unit = match[2]
  if (unit === '개월' || unit === '달') return `${num} Month${num !== 1 ? 's' : ''}`
  if (unit === '주') return `${num} Week${num !== 1 ? 's' : ''}`
  if (unit === '년' || unit === '해') return `${num} Year${num !== 1 ? 's' : ''}`
  return raw
}

function getFeatureSummary(features: string) {
  const selectedFeatures = features
    .split(/,|\n/)
    .map((item) => item.trim())
    .filter(Boolean)

  if (
    selectedFeatures.length === 0 ||
    selectedFeatures.every((feature) => feature === '미정')
  ) {
    return '핵심 기능 정리 필요'
  }

  return selectedFeatures.join(' · ')
}

function getFeatureTextSize(features: string) {
  const featureCount = features
    .split(/,|\n/)
    .map((item) => item.trim())
    .filter((item) => item && item !== '미정').length

  if (featureCount >= 5) {
    return 'text-[clamp(5px,1cqw,8px)] leading-[1.15]'
  }

  if (featureCount >= 3) {
    return 'text-[clamp(6px,1.25cqw,10px)] leading-[1.2]'
  }

  return 'text-[clamp(7px,1.5cqw,12px)] leading-[1.3]'
}

function formatProjectIdea(ideaSummary: string) {
  const idea = ideaSummary.replace(/\s+/g, ' ').trim()

  if (!idea || idea === '미정') {
    return '제품 아이디어를 구체화하는 것이 목표입니다.'
  }

  if (/개발이\s*목표입니다[.!]?$/.test(idea)) {
    return `${idea.replace(/[.!?]+$/, '')}.`
  }

  const conciseIdea = idea
    .slice(0, 150)
    .replace(/[.!?]+$/, '')
    .replace(
      /(?:을|를)?\s*(?:만들고|제작하고|개발하고)\s*싶(?:어|어요|습니다|다)?$/,
      ''
    )
    .replace(
      /(?:을|를)?\s*(?:만들|제작하|개발하)(?:려고|고자)\s*(?:해|해요|합니다|한다)?$/,
      ''
    )
    .replace(/(?:을|를)?\s*(?:만들|제작할|개발할)\s*예정(?:입니다)?$/, '')
    .trim()

  return /개발$/.test(conciseIdea)
    ? `${conciseIdea}이 목표입니다.`
    : `${conciseIdea} 개발이 목표입니다.`
}

function ProjectDirectionCard({ data }: { data: ProjectDirectionData }) {
  const duration = formatDurationEn(
    data.budgetAndDuration.split('/')[1]?.trim() ?? ''
  )

  return (
    <section className="w-full max-w-[50rem] [container-type:inline-size] overflow-hidden rounded-[clamp(12px,2.5cqw,20px)] bg-white p-[clamp(12px,3cqw,24px)] outline outline-[3px] outline-offset-[-3px] outline-zinc-200">
      <div className="grid aspect-[47/20] w-full grid-cols-12 gap-[clamp(4px,1.25cqw,10px)]">
        <div className="col-span-7 flex min-w-0 flex-col justify-between overflow-hidden pr-[clamp(4px,1cqw,8px)]">
          <div className="flex flex-col items-start gap-[clamp(10px,2.5cqw,20px)]">
            <h2 className="font-['Inter'] text-[clamp(20px,4.5cqw,36px)] font-medium leading-[1.1] text-black">
              Project
              <br />
              Direction
            </h2>
            <Image
              src="/assets/icons/chat-modal/project-direction-arrow.svg"
              alt=""
              width={42}
              height={42}
              className="h-[clamp(24px,5.25cqw,42px)] w-[clamp(24px,5.25cqw,42px)]"
            />
          </div>
          <div className="flex min-w-0 flex-col items-start gap-[clamp(6px,1.5cqw,12px)] overflow-hidden">
            <h3 className="max-w-full truncate font-['Pretendard'] text-[clamp(15px,3cqw,24px)] font-medium leading-tight text-black">
              {data.category}
            </h3>
            <p className="line-clamp-3 max-w-full font-['Pretendard'] text-[clamp(10px,1.75cqw,14px)] font-medium leading-[1.45] text-black">
              {formatProjectIdea(data.ideaSummary)}
            </p>
          </div>
        </div>

        <div className="col-span-5 grid min-w-0 grid-cols-12 grid-rows-[52.5%_45%] gap-[clamp(4px,1cqw,8px)] overflow-hidden">
          <div className="col-span-12 flex min-w-0 flex-col items-start justify-between overflow-hidden rounded-[clamp(10px,2.5cqw,20px)] bg-black px-[clamp(10px,3cqw,24px)] py-[clamp(10px,3.5cqw,28px)]">
            <h3 className="font-['Inter'] text-[clamp(17px,4.5cqw,36px)] font-medium leading-none text-white">
              Target Timeline
            </h3>
            {duration === '6 Months' ? (
              <Image
                src="/assets/icons/chat-modal/project-direction-timeline.svg"
                alt="6 Months"
                width={179}
                height={44}
                className="h-auto w-[clamp(90px,22.375cqw,179px)] max-w-full"
              />
            ) : (
              <div className="max-w-full truncate rounded-full bg-violet-200 px-[clamp(8px,2.5cqw,20px)] py-[clamp(5px,1.25cqw,10px)] font-['Inter'] text-[clamp(14px,3.75cqw,30px)] font-semibold leading-none text-black">
                {duration}
              </div>
            )}
          </div>

          <div className="col-span-7 flex min-w-0 flex-col items-start justify-between overflow-hidden rounded-[clamp(10px,2.5cqw,20px)] bg-violet-200 px-[clamp(8px,2.5cqw,20px)] pb-[clamp(7px,1.75cqw,14px)] pt-[clamp(9px,2.5cqw,20px)]">
            <div className="font-['Inter'] text-[clamp(17px,4.5cqw,36px)] font-medium leading-none text-black">
              {getBudgetHeadline(data.budgetAndDuration)}
            </div>
            <div className="flex w-full min-w-0 flex-col items-start">
              <div className="font-['Inter'] text-[clamp(9px,1.75cqw,14px)] font-medium leading-tight text-black">
                Project Scope
              </div>
              <div className="w-full truncate font-['Pretendard'] text-[clamp(8px,1.5cqw,12px)] font-medium leading-tight text-black">
                {data.budgetAndDuration.split('/')[0]?.trim() || '미정'}
              </div>
            </div>
          </div>

          <div className="col-span-5 flex min-w-0 flex-col items-center justify-between overflow-hidden rounded-[clamp(10px,2.5cqw,20px)] bg-indigo-300 p-[clamp(6px,1.75cqw,14px)]">
            <div className="w-full whitespace-nowrap rounded-full bg-white px-[clamp(2px,0.75cqw,6px)] py-[clamp(2px,0.625cqw,5px)] text-center font-['Inter'] text-[clamp(7px,1.5cqw,12px)] font-semibold leading-normal tracking-[-0.02em] text-black">
              Key features
            </div>
            <div className="p-[clamp(2px,0.75cqw,6px)]">
              <Image
                src="/assets/icons/chat-modal/project-direction-key.svg"
                alt=""
                width={43}
                height={43}
                className="h-[clamp(18px,4cqw,32px)] w-[clamp(18px,4cqw,32px)]"
              />
            </div>
            <div
              className={`w-full break-keep text-center font-['Pretendard'] font-medium text-black ${getFeatureTextSize(data.features)}`}
            >
              {getFeatureSummary(data.features)}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function useDismissModalOnEscape(isOpen: boolean, onClose: () => void) {
  useEffect(() => {
    if (!isOpen) {
      return
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])
}

function LibraryArtifactModal({
  artifact,
  onClose,
  projectDirection,
}: {
  artifact: LibraryArtifact | null
  onClose: () => void
  projectDirection: ProjectDirectionData | null
}) {
  useDismissModalOnEscape(Boolean(artifact), onClose)

  if (!artifact) {
    return null
  }

  const hasProjectDirection =
    artifact.kind === 'project_direction' && projectDirection

  return (
    <div
      className="absolute inset-0 z-[80] flex items-center justify-center bg-neutral-900/70 p-4 sm:p-6 lg:p-10"
      role="dialog"
      aria-modal="true"
      aria-label={artifact.title}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <div className="max-h-[calc(100svh-48px)] w-full max-w-[920px] overflow-y-auto rounded-[24px] bg-white p-6 shadow-[0px_24px_60px_0px_rgba(0,0,0,0.24)]">
        <div className="flex justify-center">
          {hasProjectDirection ? (
            <ProjectDirectionCard data={projectDirection} />
          ) : (
            <LibraryPlaceholderCard artifact={artifact} />
          )}
        </div>
      </div>
    </div>
  )
}

function LibraryPlaceholderCard({ artifact }: { artifact: LibraryArtifact }) {
  return (
    <div className="w-full max-w-[800px] overflow-hidden rounded-[20px] bg-white p-8 outline outline-[3px] outline-offset-[-3px] outline-zinc-200">
      <div className="rounded-[20px] bg-slate-100 p-8">
        <p className="mb-4 font-['Inter'] text-4xl font-medium leading-10 text-black">
          {artifact.title.replace(': ', ':\n')}
        </p>
        <p className="font-['Pretendard'] text-base font-medium leading-7 text-neutral-700">
          이 라이브러리 항목은 클릭 동작과 모달 구조가 먼저 연결되었습니다.
          이후 해당 단계의 생성 결과 컴포넌트를 같은 위치에 연결하면 됩니다.
        </p>
      </div>
    </div>
  )
}

function ProjectReportModal({
  data,
  onClose,
  onDownload,
}: {
  data: RfpDocument | null
  onClose: () => void
  onDownload: () => void
}) {
  useDismissModalOnEscape(Boolean(data), onClose)

  if (!data) {
    return null
  }

  return (
    <div
      className="absolute inset-0 z-[80] flex items-center justify-center bg-neutral-900/70 p-4 sm:p-6 lg:p-10"
      role="dialog"
      aria-modal="true"
      aria-label="Project Report"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <article className="flex max-h-[calc(100svh-32px)] w-full max-w-[1000px] flex-col overflow-hidden rounded-[24px] bg-[#f5f3ff] shadow-[0px_24px_60px_rgba(0,0,0,0.24)] sm:max-h-[calc(100svh-48px)]">
        <header className="flex shrink-0 items-center justify-between gap-4 bg-neutral-900 px-5 py-4 text-white sm:px-8">
          <div className="min-w-0">
            <p className="font-['Inter'] text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">
              Project Report
            </p>
            <h2 className="truncate font-['Pretendard'] text-xl font-bold sm:text-2xl">
              {data.projectName}
            </h2>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => void onDownload()}
              className="rounded-lg bg-blue-600 px-3 py-2 font-['Pretendard'] text-xs font-semibold text-white transition hover:bg-blue-700"
            >
              다운로드
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="닫기"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/20 text-xl text-white transition hover:bg-white/10"
            >
              ×
            </button>
          </div>
        </header>

        <div className="app-content-scrollbar min-h-0 overflow-y-auto p-4 sm:p-8">
          <div className="grid gap-4 lg:grid-cols-12">
            <section className="rounded-[20px] bg-white p-5 shadow-sm lg:col-span-8 sm:p-7">
              <p className="font-['Inter'] text-sm font-semibold text-blue-600">
                Product Definition
              </p>
              <p className="mt-3 font-['Pretendard'] text-xl font-bold leading-8 text-neutral-900 sm:text-2xl">
                {data.oneLineDefinition}
              </p>
              <dl className="mt-6 grid gap-4 sm:grid-cols-2">
                <ReportDefinition label="프로젝트 목표" value={data.projectGoal} />
                <ReportDefinition label="최종 활용 목적" value={data.finalPurpose} />
              </dl>
            </section>

            <section className="rounded-[20px] bg-violet-200 p-5 lg:col-span-4 sm:p-7">
              <p className="font-['Inter'] text-sm font-semibold text-neutral-700">
                Project Scope
              </p>
              <p className="mt-5 font-['Pretendard'] text-2xl font-bold text-neutral-900">
                {data.budgetRange}
              </p>
              <p className="mt-2 font-['Inter'] text-lg font-semibold text-neutral-700">
                {data.timeline}
              </p>
              <p className="mt-5 font-['Pretendard'] text-sm leading-6 text-neutral-700">
                {data.sizeOrForm}
              </p>
            </section>

            <ReportSection number="02" title="페르소나" className="lg:col-span-6">
              <ReportDefinition label="메인 타겟" value={data.mainTarget} />
              <ReportDefinition label="사용 상황(TPO)" value={data.usageContext} />
              <ReportDefinition label="핵심 니즈 / 문제" value={data.coreNeeds} />
            </ReportSection>

            <ReportSection number="03" title="제품 방향" className="lg:col-span-6">
              <ReportDefinition label="핵심 가치" value={data.coreValue} />
              <ReportTags label="스타일 키워드" items={data.styleKeywords} />
              <ReportList label="피해야 하는 방향" items={data.avoidDirections} />
            </ReportSection>

            <ReportSection number="04" title="기능 요구사항" className="lg:col-span-7">
              <ReportList label="반드시 포함할 핵심 기능" items={data.mustHaveFeatures} />
              <ReportList label="있으면 좋은 기능" items={data.niceToHaveFeatures} />
            </ReportSection>

            <ReportSection number="05" title="구현 및 제작 조건" className="lg:col-span-5">
              <ReportList label="구현 시 주의할 점" items={data.implementationNotes} />
            </ReportSection>

            <ReportSection number="06" title="레퍼런스 및 시장 인사이트" className="lg:col-span-12">
              <ReportDefinition label="참고 이미지 / 레퍼런스" value={data.referenceSummary} />
              <ReportList label="리서치 핵심 인사이트" items={data.researchInsights} columns />
            </ReportSection>

            <ReportSection number="07" title="성공 기준" className="lg:col-span-6">
              <ReportList label="Success Criteria" items={data.successCriteria} />
            </ReportSection>

            <ReportSection number="08" title="다음 액션" className="bg-neutral-900 text-white lg:col-span-6">
              <ReportList label="Next Actions" items={data.nextActions} inverted />
            </ReportSection>
          </div>
        </div>
      </article>
    </div>
  )
}

function MarketSizingModal({
  data,
  onClose,
}: {
  data: MarketSizingData | null
  onClose: () => void
}) {
  useDismissModalOnEscape(Boolean(data), onClose)

  if (!data) {
    return null
  }

  return (
    <div
      className="absolute inset-0 z-[80] flex items-center justify-center bg-neutral-900/70 p-4 sm:p-6 lg:p-10"
      role="dialog"
      aria-modal="true"
      aria-label="Tam Sam Som"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <article className="relative aspect-[1176/780] w-[min(1176px,calc(100%_-_80px),calc((100svh_-_80px)*1.5077))] overflow-hidden rounded-[20px] bg-neutral-800 p-[4.7%] text-white shadow-[0px_24px_60px_rgba(0,0,0,0.20)] [container-type:inline-size]">
        <h2 className="absolute left-[4.7%] top-[3.5%] font-['Inter'] text-[clamp(24px,3.06cqw,36px)] font-medium leading-10">
          <span className="text-[#DDF444]">T</span>am Sam Som
        </h2>
        <p className="absolute left-[4.7%] top-[11.5%] max-w-[52%] font-['Pretendard'] text-[clamp(9px,1.02cqw,12px)] font-medium leading-5 text-white">
          {data.summary}
        </p>

        <Image
          src="/assets/icons/chat-modal/tamsamsom-contents.svg"
          alt="TAM SAM SOM 시장 규모 분석"
          width={1066}
          height={558}
          unoptimized
          className="absolute bottom-[3.7%] left-[5.7%] h-auto w-[88.6%]"
        />
      </article>
    </div>
  )
}

function ConsumptionKeywordModal({
  data,
  onClose,
}: {
  data: ConsumptionKeywordData | null
  onClose: () => void
}) {
  useDismissModalOnEscape(Boolean(data), onClose)

  if (!data) {
    return null
  }

  const keywords = data.keywords.slice(0, 30)
  const keywordRows = distributeKeywords(keywords)
  const featuredKeywords = new Set(
    keywords.filter((_, index) => index % 3 === 1 || index % 5 === 0).slice(0, 12)
  )

  return (
    <div
      className="absolute inset-0 z-[80] flex items-center justify-center bg-neutral-900/70 p-4 sm:p-6 lg:p-10"
      role="dialog"
      aria-modal="true"
      aria-label="Keywords: Consumption"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <article className="relative aspect-[1176/780] w-[min(1176px,calc(100%_-_80px),calc((100svh_-_80px)*1.5077))] overflow-hidden rounded-[20px] bg-[#232326] text-white shadow-[0px_24px_60px_rgba(0,0,0,0.20)] [container-type:inline-size]">
        <h2 className="absolute left-[4.7%] top-[5.1%] whitespace-pre-line font-['Inter'] text-[clamp(24px,3.06cqw,36px)] font-medium leading-[1.1]">
          <span className="text-[#DDF444]">K</span>eywords:{'\n'}Consumption
        </h2>

        <div className="absolute left-[4.7%] top-[23.7%] w-[55%]">
          <p className="mb-[clamp(12px,1.9cqw,22px)] font-['Pretendard'] text-[clamp(14px,1.7cqw,20px)] font-bold leading-6 text-[#DDF444]">
            {data.summary}
          </p>
          <p className="font-['Pretendard'] text-[clamp(11px,1.19cqw,14px)] font-medium leading-[clamp(17px,2.04cqw,24px)] text-white">
            {data.description}
          </p>
        </div>

        <div className="absolute inset-x-0 bottom-0 h-[41%] overflow-hidden bg-[#8B8B8B]/40 px-[4.4%] pb-[3%] pt-[4.5%]">
          <span className="absolute left-[4.7%] top-[4.2%] h-[5.5%] w-0 border-l-2 border-[#DDF444]" />
          <p className="absolute left-[5.4%] top-[3.7%] font-['Pretendard'] text-[clamp(11px,1.36cqw,16px)] font-semibold leading-6 text-white">
            <span className="text-[#DDF444]">K</span>eywords
          </p>

          <div className="flex h-full min-w-0 -translate-y-[15%] flex-col justify-center gap-[clamp(6px,0.75cqw,10px)] px-[1%] pt-[5%]">
            <div className="flex min-w-0 items-center justify-start gap-x-[clamp(6px,0.85cqw,10px)]">
              <p className="mr-[1%] shrink-0 -translate-y-[8%] font-['Inter'] text-[clamp(18px,2.55cqw,30px)] font-semibold leading-8 text-white/80">
                Define
              </p>
              {keywordRows[0].map((keyword, index) => (
                <ConsumptionKeywordChip
                  key={`consumption-first-${keyword}-${index}`}
                  featured={featuredKeywords.has(keyword)}
                  label={keyword}
                />
              ))}
            </div>
            <div className="flex min-w-0 items-center justify-center gap-x-[clamp(6px,0.85cqw,10px)]">
              {keywordRows[1].map((keyword, index) => (
                <ConsumptionKeywordChip
                  key={`consumption-second-${keyword}-${index}`}
                  featured={featuredKeywords.has(keyword)}
                  label={keyword}
                />
              ))}
            </div>
            <div className="flex min-w-0 items-center justify-end gap-x-[clamp(6px,0.85cqw,10px)]">
              {keywordRows[2].map((keyword, index) => (
                <ConsumptionKeywordChip
                  key={`consumption-third-${keyword}-${index}`}
                  featured={featuredKeywords.has(keyword)}
                  label={keyword}
                />
              ))}
              <p className="ml-[1%] shrink-0 -translate-y-[8%] font-['Inter'] text-[clamp(18px,2.55cqw,30px)] font-semibold leading-8 text-white/80">
                Your Consumption
              </p>
            </div>
          </div>
        </div>
      </article>
    </div>
  )
}

function ConsumptionKeywordChip({
  featured,
  label,
}: {
  featured: boolean
  label: string
}) {
  return (
    <span
      className={`inline-flex h-9 w-fit max-w-full shrink-0 items-center justify-center whitespace-nowrap rounded-[100px] px-[clamp(9px,1.45cqw,17px)] py-3.5 font-['Pretendard'] text-[clamp(9px,1.19cqw,14px)] font-medium leading-6 outline outline-[0.52px] outline-offset-[-0.52px] outline-[#6C6C6C] ${
        featured
          ? 'bg-[#DDF444] text-[#232326] shadow-[0px_4px_4px_rgba(0,0,0,0.25)]'
          : 'bg-[#232326]/60 text-[#DDF444]'
      }`}
    >
      {label}
    </span>
  )
}

function BrandPositioningModal({
  data,
  onClose,
}: {
  data: BrandPositioningData | null
  onClose: () => void
}) {
  useDismissModalOnEscape(Boolean(data), onClose)

  if (!data) {
    return null
  }

  const brandSlots = Array.from({ length: 8 }, (_, index) =>
    data.brands[index] ?? `Brand ${index + 1}`
  )

  return (
    <div
      className="absolute inset-0 z-[80] flex items-center justify-center bg-neutral-900/70 p-4 sm:p-6 lg:p-10"
      role="dialog"
      aria-modal="true"
      aria-label="Positioning Map: Brand"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <article className="relative aspect-[1176/780] w-[min(1176px,calc(100%_-_80px),calc((100svh_-_80px)*1.5077))] overflow-hidden rounded-[20px] bg-[#232326] text-white shadow-[0px_24px_60px_rgba(0,0,0,0.20)] [container-type:inline-size]">
        <h2 className="absolute left-[4.7%] top-[5.1%] z-20 font-['Inter'] text-[clamp(24px,3.06cqw,36px)] font-medium leading-[1.1]">
          <span className="text-[#DDF444]">P</span>ositioning Map:
          <br />
          Brand
        </h2>

        <div className="absolute inset-x-[4.7%] top-[8.7%] h-[55%]">
          <div className="absolute left-1/2 top-1/2 aspect-square w-[58%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-indigo-300/20" />
          <div className="absolute left-1/2 top-1/2 aspect-square w-[37%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-indigo-300/20" />
          <div className="absolute left-1/2 top-1/2 aspect-square w-[24%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-indigo-300/30" />
          <div className="absolute left-1/2 top-1/2 aspect-square w-[12%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-indigo-300/50" />

          <div className="absolute inset-x-0 top-1/2 h-px bg-[#DDF444]" />
          <div className="absolute inset-y-0 left-1/2 w-px bg-[#DDF444]" />

          <span className="absolute left-0 top-1/2 -translate-y-1/2 font-['Pretendard'] text-[clamp(9px,1.19cqw,14px)] font-medium text-stone-300">
            프리미엄 가격
          </span>
          <span className="absolute right-0 top-1/2 -translate-y-1/2 font-['Pretendard'] text-[clamp(9px,1.19cqw,14px)] font-medium text-stone-300">
            합리적인 가격
          </span>
          <span className="absolute left-1/2 top-0 -translate-x-1/2 font-['Pretendard'] text-[clamp(9px,1.19cqw,14px)] font-medium text-stone-300">
            라이프스타일 중심
          </span>
          <span className="absolute bottom-0 left-1/2 -translate-x-1/2 font-['Pretendard'] text-[clamp(9px,1.19cqw,14px)] font-medium text-stone-300">
            기능 중심
          </span>

          <div className="absolute inset-[7%_10%] grid grid-cols-2 grid-rows-2 gap-x-[18%] gap-y-[14%]">
            {[0, 1, 2, 3].map((quadrant) => (
              <div
                key={quadrant}
                className="flex flex-wrap content-center items-center justify-center gap-[clamp(6px,0.85cqw,10px)]"
              >
                {brandSlots.slice(quadrant * 2, quadrant * 2 + 2).map((brand) => (
                  <span
                    key={brand}
                    className="inline-flex h-[clamp(26px,3.06cqw,36px)] max-w-full items-center rounded-full border border-[#DDF444] bg-[#232326] px-[clamp(9px,1.19cqw,14px)] font-['Inter'] text-[clamp(9px,1.19cqw,14px)] font-medium whitespace-nowrap"
                  >
                    {brand}
                  </span>
                ))}
              </div>
            ))}
          </div>

          <div className="absolute right-[16%] top-[2%] rounded-full border border-[#DDF444] bg-[#DDF444] px-[clamp(12px,2.04cqw,24px)] py-[clamp(4px,0.6cqw,7px)] font-['Inter'] text-[clamp(10px,1.36cqw,16px)] font-medium text-black shadow-[0_0_11px_rgba(236,255,113,1)]">
            OUR BRAND
          </div>
        </div>

        <section className="absolute inset-x-[4.6%] bottom-[5.5%] flex h-[22.5%] flex-col items-center justify-center overflow-hidden rounded-[20px] border border-[#DDF444] px-[8%] pb-[3%] pt-[5%] text-center">
          <Image
            src="/assets/icons/chat-modal/positioning-map.svg"
            alt="OUR BRAND"
            width={250}
            height={65}
            unoptimized
            className="absolute left-1/2 top-[2%] h-auto w-[23.4%] -translate-x-1/2"
          />
          <p className="font-['Pretendard'] text-[clamp(11px,1.36cqw,16px)] font-medium leading-6 text-[#DDF444]">
            {data.goal}
          </p>
          <p className="mt-[2%] line-clamp-3 font-['Pretendard'] text-[clamp(9px,1.02cqw,12px)] font-medium leading-5 text-white">
            {data.description}
          </p>
        </section>
      </article>
    </div>
  )
}

function ReportSection({
  children,
  className = '',
  number,
  title,
}: {
  children: ReactNode
  className?: string
  number: string
  title: string
}) {
  return (
    <section className={`rounded-[20px] bg-white p-5 shadow-sm sm:p-7 ${className}`}>
      <div className="mb-5 flex items-center gap-3">
        <span className="font-['Inter'] text-xs font-bold text-blue-600">{number}</span>
        <h3 className="font-['Pretendard'] text-lg font-bold">{title}</h3>
      </div>
      <div className="flex flex-col gap-5">{children}</div>
    </section>
  )
}

function ReportDefinition({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-['Pretendard'] text-xs font-bold text-zinc-500">{label}</dt>
      <dd className="mt-1 whitespace-pre-wrap font-['Pretendard'] text-sm font-medium leading-6 text-inherit">
        {value || '정리된 정보 없음'}
      </dd>
    </div>
  )
}

function ReportList({
  columns = false,
  inverted = false,
  items,
  label,
}: {
  columns?: boolean
  inverted?: boolean
  items: string[]
  label: string
}) {
  return (
    <div>
      <p className={`font-['Pretendard'] text-xs font-bold ${inverted ? 'text-violet-300' : 'text-zinc-500'}`}>
        {label}
      </p>
      <ul className={`mt-2 grid gap-2 ${columns ? 'md:grid-cols-2' : ''}`}>
        {(items.length > 0 ? items : ['정리된 정보 없음']).map((item, index) => (
          <li
            key={`${label}-${index}`}
            className="flex gap-2 font-['Pretendard'] text-sm font-medium leading-6"
          >
            <span className={inverted ? 'text-violet-300' : 'text-blue-600'}>•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function ReportTags({ label, items }: { label: string; items: string[] }) {
  return (
    <div>
      <p className="font-['Pretendard'] text-xs font-bold text-zinc-500">{label}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {(items.length > 0 ? items : ['정리된 정보 없음']).map((item) => (
          <span
            key={item}
            className="rounded-full bg-violet-100 px-3 py-1 font-['Pretendard'] text-xs font-semibold text-neutral-800"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  )
}

function PersonaCardModal({
  data,
  onClose,
}: {
  data: PersonaCardData | null
  onClose: () => void
}) {
  useDismissModalOnEscape(Boolean(data), onClose)

  if (!data) {
    return null
  }

  return (
    <div
      className="absolute inset-0 z-[80] flex items-center justify-center bg-neutral-900/70 p-4 sm:p-6 lg:p-10"
      role="dialog"
      aria-modal="true"
      aria-label="Persona Card"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <PersonaCardFull data={data} />
    </div>
  )
}

function getPersonaList(items: string[], fallback: string) {
  const cleaned = items
    .map((item) => item.replace(/\.{2,}|…/g, '').trim())
    .filter(Boolean)

  return cleaned.length > 0 ? cleaned : [fallback]
}

function PersonaCardFull({ data }: { data: PersonaCardData }) {
  const demographic = getPersonaList(data.demographicInfo, '사용자 정보 정리 필요')
  const personaStory = getPersonaList(data.personaStory, '사용 맥락 정리 필요')
  const problemNeeds = getPersonaList(data.problemNeeds, '핵심 문제 정리 필요')
  const currentBehavior = getPersonaList(data.currentBehavior, '현재 행동 정리 필요')
  const lifestyleContext = getPersonaList(
    data.lifestyleContext,
    '생활 맥락 정리 필요'
  )
  const relationshipKeyword = getPersonaList(
    data.relationshipKeyword,
    '관계 키워드 정리 필요'
  )
  const demographicLabels = [
    '이름 & 나이',
    '상태',
    '주요 환경',
    '생활 패턴',
    '핵심 특징',
  ]
  const tags = problemNeeds
    .flatMap((item) => item.split(/,|\/|·/))
    .map((item) => item.replace(/^#/, '').trim())
    .filter(Boolean)
    .slice(0, 3)

  return (
    <div className="relative aspect-[1176/780] max-h-[calc(100svh-96px)] w-[calc(100%-48px)] max-w-[1176px] overflow-hidden rounded-[20px] bg-white shadow-[0px_24px_60px_0px_rgba(0,0,0,0.24)]">
      <div className="absolute inset-[3.2%] rounded-[20px] border-2 border-slate-200 shadow-[0px_1px_4px_0px_rgba(0,0,0,0.25)]" />

      <div className="absolute bottom-[3.7%] left-[2.3%] top-[3.6%] w-[27.2%] overflow-hidden rounded-2xl bg-indigo-400">
        {data.imageUrl ? (
          <Image
            src={data.imageUrl}
            alt=""
            width={492}
            height={738}
            unoptimized
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-indigo-100 font-['Inter'] text-sm font-semibold text-indigo-500">
            Persona Image
          </div>
        )}
      </div>

      <div className="absolute bottom-[8.5%] left-[37%] right-[5.6%] top-[4.2%] flex flex-col">
        <h2 className="mb-[3.5%] font-['Inter'] text-3xl font-semibold leading-10 text-neutral-800">
          <span className="text-blue-600">P</span>ersona Card
        </h2>

        <div className="grid min-h-0 flex-1 grid-cols-2 gap-x-[8.5%] gap-y-[4.2%]">
          <PersonaInfoSection
            number="01."
            title="Demographic Info"
          >
            <div className="grid grid-cols-[86px_minmax(0,1fr)] gap-y-1.5">
              {demographicLabels.map((label, index) => (
                <FragmentPair
                  key={label}
                  label={label}
                  value={demographic[index] ?? '정리 필요'}
                />
              ))}
            </div>
          </PersonaInfoSection>

          <PersonaInfoSection number="04." title="Current Behavior">
            <PersonaBulletList items={currentBehavior} />
          </PersonaInfoSection>

          <PersonaInfoSection number="02." title="Persona Story">
            <p className="whitespace-pre-line break-words font-['Pretendard'] text-[13px] font-medium leading-[22px] text-black [overflow-wrap:anywhere]">
              {personaStory.join('\n')}
            </p>
            {tags.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-[100px] bg-[#DDF444] px-3.5 font-['Pretendard'] text-[11px] font-medium leading-7 text-black"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            ) : null}
          </PersonaInfoSection>

          <PersonaInfoSection number="05." title="Lifestyle Context">
            <PersonaBulletList items={lifestyleContext} />
          </PersonaInfoSection>

          <PersonaInfoSection number="03." title="Problem & Needs">
            <PersonaBulletList items={problemNeeds} />
          </PersonaInfoSection>

          <PersonaInfoSection number="06." title="Relationship Keyword">
            <PersonaBulletList items={relationshipKeyword} />
          </PersonaInfoSection>
        </div>
      </div>

    </div>
  )
}

function FragmentPair({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="font-['Pretendard'] text-[13px] font-semibold leading-[19px] text-blue-600">
        {label}
      </dt>
      <dd className="min-w-0 whitespace-pre-line break-words font-['Pretendard'] text-[13px] font-medium leading-[19px] text-black [overflow-wrap:anywhere]">
        {value}
      </dd>
    </>
  )
}

function PersonaInfoSection({
  children,
  number,
  title,
}: {
  children: ReactNode
  number: string
  title: string
}) {
  return (
    <section className="min-h-0 overflow-hidden">
      <div className="flex items-center gap-2 border-b border-blue-600 pb-2 font-['Inter'] text-[17px] font-semibold leading-6 text-blue-600">
        <span>{number}</span>
        <h3 className="truncate">{title}</h3>
      </div>
      <div className="pt-3">{children}</div>
    </section>
  )
}

function PersonaBulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1">
      {items.slice(0, 4).map((item, index) => (
        <li
          key={`${item}-${index}`}
          className="flex gap-3 font-['Pretendard'] text-[13px] font-medium leading-[19px] text-black"
        >
          <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-blue-600" />
          <span className="min-w-0 whitespace-pre-line break-words [overflow-wrap:anywhere]">
            {item}
          </span>
        </li>
      ))}
    </ul>
  )
}

function splitProblemStatementSection(value: string, fallbackTitle: string) {
  const lines = value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length >= 2) {
    return {
      body: lines.slice(1).join(' '),
      title: lines[0],
    }
  }

  const normalized = value.replace(/\s+/g, ' ').trim()
  const firstSentence = normalized.match(/^(.{8,52}?[.!?。！？])\s+(.+)$/)

  if (firstSentence) {
    return {
      body: firstSentence[2],
      title: firstSentence[1].replace(/[.!?。！？]+$/, ''),
    }
  }

  return {
    body: normalized,
    title: normalized || fallbackTitle,
  }
}

function ProblemStatementsModal({
  data,
  onClose,
}: {
  data: ProblemStatementsData | null
  onClose: () => void
}) {
  useDismissModalOnEscape(Boolean(data), onClose)

  if (!data) return null

  const cards = [
    {
      body: splitProblemStatementSection(data.situation, '사용 환경과 맥락').body,
      icon: '/assets/icons/chat-modal/problem-statements-context.svg',
      label: 'Context',
      number: '01',
      title: splitProblemStatementSection(data.situation, '사용 환경과 맥락').title,
    },
    {
      body: splitProblemStatementSection(data.pain, '반복되는 핵심 문제').body,
      icon: '/assets/icons/chat-modal/problem-statements-problems.svg',
      label: 'Problems',
      number: '02',
      title: splitProblemStatementSection(data.pain, '반복되는 핵심 문제').title,
    },
    {
      body: splitProblemStatementSection(data.need, '필요한 변화와 경험').body,
      icon: '/assets/icons/chat-modal/problem-statements-needs.svg',
      label: 'Needs',
      number: '03',
      title: splitProblemStatementSection(data.need, '필요한 변화와 경험').title,
    },
  ]

  return (
    <div
      className="absolute inset-0 z-[80] flex items-center justify-center bg-neutral-900/70 p-4 sm:p-6 lg:p-10"
      role="dialog"
      aria-modal="true"
      aria-label="Problem Statements"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <article className="relative aspect-[1176/780] w-[min(1176px,calc(100%_-_80px),calc((100svh_-_80px)*1.5077))] overflow-hidden rounded-[20px] bg-white shadow-[0px_24px_60px_rgba(0,0,0,0.20)] [container-type:inline-size]">
        <div className="relative h-[47.7%] w-full overflow-hidden bg-[#232326]">
          <Image
            src="/assets/icons/chat-modal/problem-statements-background1.svg"
            alt=""
            width={1176}
            height={372}
            unoptimized
            className="absolute inset-0 h-full w-full object-cover"
          />
          <h2 className="absolute left-[8.5%] top-[10.2%] font-['Inter'] text-[clamp(24px,3.06cqw,36px)] font-medium leading-[1.1] text-white">
            <span className="text-[#DDF444]">P</span>roblem
            <br />
            Statements
          </h2>
        </div>

        <div className="relative h-[52.3%] bg-white px-[8.5%] pb-[2.7%] pt-[2.55%] shadow-[0px_-4px_15px_4px_rgba(0,0,0,0.25)]">
          <div className="grid h-full grid-cols-3 gap-[1.1%]">
            {cards.map((card) => (
              <section
                key={card.number}
                className="flex min-w-0 flex-col items-center overflow-hidden rounded-[20px] bg-white px-[5.3%] pb-[5%] pt-[1.9%] text-center shadow-[0px_0px_12px_rgba(0,0,0,0.25)]"
              >
                <div className="flex h-[10%] items-center justify-center font-['Inter'] text-[clamp(9px,1.19cqw,14px)] font-semibold leading-8 text-blue-600">
                  <span>{card.number}</span>
                  <span className="mx-[0.55cqw] h-[clamp(7px,0.85cqw,10px)] w-px bg-blue-600" />
                  <span>{card.label}</span>
                </div>

                <div className="flex h-[31%] items-center justify-center">
                  <Image
                    src={card.icon}
                    alt=""
                    width={53}
                    height={48}
                    unoptimized
                    className="h-[clamp(30px,4.08cqw,48px)] w-auto"
                  />
                </div>

                <div className="h-px w-[80%] bg-indigo-200" />
                <h3 className="mt-[4%] line-clamp-2 min-h-[12%] font-['Pretendard'] text-[clamp(11px,1.36cqw,16px)] font-semibold leading-[1.35] text-black">
                  {card.title}
                </h3>
                <p className="mt-[2.8%] line-clamp-9 font-['Pretendard'] text-[clamp(8px,1.02cqw,12px)] font-normal leading-[1.65] text-black">
                  {card.body}
                </p>
              </section>
            ))}
          </div>
        </div>
      </article>
    </div>
  )
}

function KeywordCardModal({
  data,
  onClose,
}: {
  data: KeywordCardData | null
  onClose: () => void
}) {
  useDismissModalOnEscape(Boolean(data), onClose)

  if (!data) {
    return null
  }

  return (
    <div
      className="absolute inset-0 z-[80] flex items-center justify-center bg-neutral-900/70 p-4 sm:p-6 lg:p-10"
      role="dialog"
      aria-modal="true"
      aria-label={data.title}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <KeywordCard data={data} />
    </div>
  )
}

function getKeywordCardSubtitle(data: KeywordCardData) {
  const [first, second, third] = data.keywords

  if (first && second && third) {
    return `${first}, ${second}, ${third} 중심의 경험 방향`
  }

  return data.kind === 'experience_keywords'
    ? '사용자가 느끼는 경험 가치를 정리한 키워드'
    : '제품과 사용자 맥락의 관계를 정리한 키워드'
}

function KeywordCard({ data }: { data: KeywordCardData }) {
  const keywords = data.keywords.slice(0, 30)
  const featuredKeywords = new Set(
    keywords.filter((_, index) => index % 3 === 1 || index % 5 === 0).slice(0, 12)
  )

  return (
    <StructuredKeywordCard
      data={data}
      featuredKeywords={featuredKeywords}
      keywords={keywords}
      lowerBackground={
        data.kind === 'experience_keywords'
          ? 'bg-[rgba(217,217,217,0.4)]'
          : 'bg-[rgba(153,170,244,0.4)]'
      }
      suffix={
        data.kind === 'experience_keywords' ? 'Experience' : 'Relationship'
      }
    />
  )
}

function StructuredKeywordCard({
  data,
  featuredKeywords,
  keywords,
  lowerBackground,
  suffix,
}: {
  data: KeywordCardData
  featuredKeywords: Set<string>
  keywords: string[]
  lowerBackground: string
  suffix: 'Experience' | 'Relationship'
}) {
  const keywordRows = distributeKeywords(keywords)

  return (
    <div className="relative aspect-[1176/780] w-[min(1176px,calc(100%_-_80px),calc((100svh_-_80px)*1.5077))] overflow-hidden rounded-[20px] bg-blue-50 shadow-[0px_24px_60px_0px_rgba(0,0,0,0.10)] [container-type:inline-size]">

      <h2 className="absolute left-[4.7%] top-[5.1%] whitespace-pre-line font-['Inter'] text-[clamp(24px,3.06cqw,36px)] font-medium leading-[1.1] text-black">
        <span className="text-blue-600">K</span>eywords:{'\n'}{suffix}
      </h2>

      <div className="absolute left-[4.7%] top-[23.7%] w-[55%]">
        <p className="mb-[clamp(12px,1.9cqw,22px)] font-['Pretendard'] text-[clamp(14px,1.7cqw,20px)] font-bold leading-6 text-blue-600">
          {getKeywordCardSubtitle(data)}
        </p>
        <p className="font-['Pretendard'] text-[clamp(11px,1.19cqw,14px)] font-medium leading-[clamp(17px,2.04cqw,24px)] text-black">
          {data.description}
        </p>
      </div>

      <div className={`absolute inset-x-0 bottom-0 h-[41%] overflow-hidden px-[4.4%] pb-[3%] pt-[4.5%] ${lowerBackground}`}>
        <span className="absolute left-[4.7%] top-[4.2%] h-[5.5%] w-0 border-l-2 border-blue-600" />
        <p className="absolute left-[5.4%] top-[3.7%] font-['Pretendard'] text-[clamp(11px,1.36cqw,16px)] font-semibold leading-6 text-black">
          <span className="text-blue-600">K</span>eywords
        </p>

        <div className="flex h-full min-w-0 -translate-y-[15%] flex-col justify-center gap-[clamp(6px,0.75cqw,10px)] px-[1%] pt-[5%]">
          <div className="flex min-w-0 items-center justify-start gap-x-[clamp(8px,1cqw,12px)]">
            <p className="mr-[1%] shrink-0 -translate-y-[8%] font-['Inter'] text-[clamp(18px,2.55cqw,30px)] font-semibold leading-8 text-black/80">
              Define
            </p>
            {keywordRows[0].map((keyword, index) => (
              <KeywordChip
                key={`${suffix}-first-${keyword}-${index}`}
                featured={featuredKeywords.has(keyword)}
                label={keyword}
              />
            ))}
          </div>
          <div className="flex min-w-0 items-center justify-center gap-x-[clamp(8px,1cqw,12px)]">
            {keywordRows[1].map((keyword, index) => (
              <KeywordChip
                key={`${suffix}-second-${keyword}-${index}`}
                featured={featuredKeywords.has(keyword)}
                label={keyword}
              />
            ))}
          </div>
          <div className="flex min-w-0 items-center justify-end gap-x-[clamp(8px,1cqw,12px)]">
            {keywordRows[2].map((keyword, index) => (
              <KeywordChip
                key={`${suffix}-third-${keyword}-${index}`}
                featured={featuredKeywords.has(keyword)}
                label={keyword}
              />
            ))}
            <p className="ml-[1%] shrink-0 -translate-y-[8%] font-['Inter'] text-[clamp(18px,2.55cqw,30px)] font-semibold leading-8 text-black/80">
              Your {suffix}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function estimateKeywordChipWidth(keyword: string) {
  const textWidth = Array.from(keyword).reduce(
    (width, character) =>
      width + (/[ㄱ-힝]/.test(character) ? 16 : 9),
    0
  )

  return textWidth + 40
}

function distributeKeywords(keywords: string[]) {
  const rows: string[][] = [[], [], []]
  const rowWidths = [0, 0, 0]
  const rowCapacities = [880, 1060, 790]
  let rowIndex = 0

  for (const keyword of keywords) {
    const keywordWidth = estimateKeywordChipWidth(keyword)
    let targetRow = rowIndex

    while (targetRow < rows.length) {
      const gapWidth = rows[targetRow].length > 0 ? 12 : 0
      const fitsRow =
        rowWidths[targetRow] + gapWidth + keywordWidth <=
        rowCapacities[targetRow]

      if (fitsRow) {
        break
      }

      targetRow += 1
    }

    // Do not render chips that would escape the third row's available width.
    if (targetRow >= rows.length) {
      continue
    }

    rowIndex = targetRow
    rows[rowIndex].push(keyword)
    rowWidths[rowIndex] +=
      (rows[rowIndex].length > 1 ? 12 : 0) + keywordWidth
  }

  return rows
}

function KeywordChip({
  featured,
  label,
}: {
  featured: boolean
  label: string
}) {
  return (
    <span
      className={`inline-flex h-9 w-fit max-w-full shrink-0 items-center justify-center gap-2.5 whitespace-nowrap rounded-[100px] px-[clamp(10px,1.7cqw,20px)] py-3.5 font-['Pretendard'] text-[clamp(10px,1.36cqw,16px)] font-medium leading-6 outline outline-[0.52px] outline-offset-[-0.52px] outline-neutral-500 ${
        featured
          ? 'bg-blue-600 text-white shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)]'
          : 'bg-white/60 text-blue-600'
      }`}
    >
      {label}
    </span>
  )
}

function DirectionResearchWidgets({
  disabled,
  onSelect,
}: {
  disabled: boolean
  onSelect: (kind: DirectionArtifactKind) => void
}) {
  const widgets: Array<{
    description: string
    index: string
    kind: DirectionArtifactKind
    title: string
  }> = [
    {
      description: 'TAM/SAM/SOM 관점으로 진입 시장을 봅니다.',
      index: '1',
      kind: 'market_size',
      title: '시장 규모',
    },
    {
      description: '구매 동기와 소비 키워드를 정리합니다.',
      index: '2',
      kind: 'consumption_keywords',
      title: '소비 트렌드',
    },
    {
      description: '경쟁 구도와 브랜드 포지션을 비교합니다.',
      index: '3',
      kind: 'brand_positioning',
      title: '경쟁사',
    },
  ]

  return (
    <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-3">
      {widgets.map((widget) => (
        <button
          key={widget.kind}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(widget.kind)}
          className="min-h-28 rounded-[20px] border border-zinc-200 bg-white p-4 text-left shadow-sm transition hover:border-blue-200 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className="mb-3 flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 font-['Inter'] text-sm font-bold text-white">
            {widget.index}
          </span>
          <span className="block font-['Pretendard'] text-sm font-bold text-neutral-900">
            {widget.title}
          </span>
          <span className="mt-1 block font-['Pretendard'] text-xs font-medium leading-5 text-zinc-500">
            {widget.description}
          </span>
        </button>
      ))}
    </div>
  )
}

function AssistantTypingBubble() {
  return (
    <div className="flex w-full max-w-[800px] flex-col items-start gap-3 lg:w-[69.6%]">
      <div
        className="flex min-h-6 items-center px-[clamp(24px,3.33svh,36px)] py-1"
        aria-label="Aidee가 답변을 생성하고 있습니다"
      >
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400 [animation-delay:-0.24s]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400 [animation-delay:-0.12s]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400" />
        </div>
      </div>
    </div>
  )
}

function renderInlineMarkdown(text: string, keyPrefix: string) {
  const nodes: ReactNode[] = []
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g
  let lastIndex = 0
  let matchIndex = 0

  for (const match of text.matchAll(pattern)) {
    const matchText = match[0]
    const index = match.index ?? 0

    if (index > lastIndex) {
      nodes.push(text.slice(lastIndex, index))
    }

    if (matchText.startsWith('**')) {
      nodes.push(
        <strong key={`${keyPrefix}-strong-${matchIndex}`} className="font-bold">
          {matchText.slice(2, -2)}
        </strong>
      )
    } else if (matchText.startsWith('`')) {
      nodes.push(
        <code
          key={`${keyPrefix}-code-${matchIndex}`}
          className="rounded bg-white/70 px-1 py-0.5 font-mono text-[0.92em] text-neutral-800"
        >
          {matchText.slice(1, -1)}
        </code>
      )
    } else {
      const linkMatch = matchText.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
      const href = linkMatch?.[2] ?? '#'
      nodes.push(
        <a
          key={`${keyPrefix}-link-${matchIndex}`}
          href={href}
          target="_blank"
          rel="noreferrer"
          className="font-semibold text-blue-600 underline underline-offset-2"
        >
          {linkMatch?.[1] ?? matchText}
        </a>
      )
    }

    lastIndex = index + matchText.length
    matchIndex += 1
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex))
  }

  return nodes
}

function MarkdownContent({ content }: { content: string }) {
  const lines = content.replace(/\r\n/g, '\n').split('\n')
  const blocks: ReactNode[] = []
  let index = 0

  while (index < lines.length) {
    const rawLine = lines[index] ?? ''
    const line = rawLine.trim()

    if (!line) {
      index += 1
      continue
    }

    const headingMatch = line.match(/^(#{1,3})\s+(.+)$/)

    if (headingMatch) {
      const level = headingMatch[1].length
      const headingClassName =
        level === 1
          ? 'text-lg font-bold leading-7'
          : level === 2
            ? 'text-base font-bold leading-7'
            : 'text-sm font-bold leading-6'

      blocks.push(
        <div
          key={`heading-${index}`}
          className={`${headingClassName} mb-2 mt-1 text-neutral-900`}
        >
          {renderInlineMarkdown(headingMatch[2], `heading-${index}`)}
        </div>
      )
      index += 1
      continue
    }

    if (/^[-*•]\s+/.test(line)) {
      const items: string[] = []

      while (index < lines.length) {
        const itemMatch = (lines[index] ?? '').trim().match(/^[-*•]\s+(.+)$/)

        if (!itemMatch) {
          break
        }

        items.push(itemMatch[1])
        index += 1
      }

      blocks.push(
        <ul
          key={`ul-${index}-${items.length}`}
          className="my-2 list-disc space-y-1 pl-5"
        >
          {items.map((item, itemIndex) => (
            <li key={`${item}-${itemIndex}`} className="leading-7">
              {renderInlineMarkdown(item, `ul-${index}-${itemIndex}`)}
            </li>
          ))}
        </ul>
      )
      continue
    }

    if (/^\d+[.)]\s+/.test(line)) {
      const items: string[] = []

      while (index < lines.length) {
        const itemMatch = (lines[index] ?? '').trim().match(/^\d+[.)]\s+(.+)$/)

        if (!itemMatch) {
          break
        }

        items.push(itemMatch[1])
        index += 1
      }

      blocks.push(
        <ol
          key={`ol-${index}-${items.length}`}
          className="my-2 list-decimal space-y-1 pl-5"
        >
          {items.map((item, itemIndex) => (
            <li key={`${item}-${itemIndex}`} className="leading-7">
              {renderInlineMarkdown(item, `ol-${index}-${itemIndex}`)}
            </li>
          ))}
        </ol>
      )
      continue
    }

    const paragraphLines: string[] = []

    while (index < lines.length) {
      const currentLine = lines[index] ?? ''
      const trimmedLine = currentLine.trim()

      if (
        !trimmedLine ||
        /^(#{1,3})\s+/.test(trimmedLine) ||
        /^[-*•]\s+/.test(trimmedLine) ||
        /^\d+[.)]\s+/.test(trimmedLine)
      ) {
        break
      }

      paragraphLines.push(trimmedLine)
      index += 1
    }

    blocks.push(
      <p key={`p-${index}`} className="mb-2 last:mb-0">
        {paragraphLines.map((paragraphLine, paragraphIndex) => (
          <span key={`${paragraphLine}-${paragraphIndex}`}>
            {paragraphIndex > 0 ? <br /> : null}
            {renderInlineMarkdown(paragraphLine, `p-${index}-${paragraphIndex}`)}
          </span>
        ))}
      </p>
    )
  }

  return (
    <div className="max-w-full break-words font-['Pretendard'] text-[clamp(14px,1.48svh,16px)] font-medium leading-7 text-neutral-900 [overflow-wrap:anywhere]">
      {blocks}
    </div>
  )
}

function ChatBubble({
  canShowStyleReferences,
  confirmedDirectionKinds,
  confirmedKeywordKinds,
  directionArtifactKindOverride,
  disabled,
  hasConfirmedPersona,
  hasConfirmedRfp,
  hasVisualizedPersona,
  hasVisualizedRfp,
  isProblemStatementsConfirmed,
  isLatestEditablePersona,
  latestKeywordMessageIds,
  latestProblemStatementsMessageId,
  latestDirectionMessageIds,
  latestRfpMessageId,
  message,
  onChoice,
  onConfirmKeyword,
  onConfirmPersona,
  onConfirmProblemStatements,
  onDownloadRfp,
  onConfirmDirection,
  onOpenMoodboardModal,
  onVisualizeKeyword,
  onVisualizeDirection,
  onVisualizeProblemStatements,
  onVisualizePersona,
  onVisualizeRfp,
  projectId,
  userAvatarUrl,
  visualizedKeywordCards,
  visualizedDirectionArtifacts,
  visualizedProblemStatements,
}: {
  canShowStyleReferences: boolean
  confirmedDirectionKinds: Set<DirectionArtifactKind>
  confirmedKeywordKinds: Set<KeywordArtifactKind>
  directionArtifactKindOverride: DirectionArtifactKind | null
  disabled: boolean
  hasConfirmedPersona: boolean
  hasConfirmedRfp: boolean
  hasVisualizedPersona: boolean
  hasVisualizedRfp: boolean
  isProblemStatementsConfirmed: boolean
  isLatestEditablePersona: boolean
  latestKeywordMessageIds: Partial<Record<KeywordArtifactKind, string>>
  latestProblemStatementsMessageId: string | null
  latestDirectionMessageIds: Partial<Record<DirectionArtifactKind, string>>
  latestRfpMessageId: string | null
  message: ChatMessageRecord
  onChoice: (value: string) => void
  onConfirmKeyword: (
    kind: KeywordArtifactKind,
    messageId: string
  ) => void
  onConfirmPersona: (messageId: string) => void
  onConfirmProblemStatements: (messageId: string) => void
  onDownloadRfp: () => void
  onConfirmDirection: (
    kind: DirectionArtifactKind,
    messageId: string
  ) => void
  onOpenMoodboardModal: () => void
  onVisualizeKeyword: (data: KeywordCardData) => void
  onVisualizeDirection: (
    kind: DirectionArtifactKind,
    messageId: string,
    content: string
  ) => void
  onVisualizeProblemStatements: (data: ProblemStatementsData) => void
  onVisualizePersona: (
    messageId: string,
    personaCard?: PersonaCardData | null
  ) => void
  onVisualizeRfp: (messageId: string, rfp: RfpDocument) => void
  projectId: string
  userAvatarUrl?: string | null
  visualizedKeywordCards: Partial<
    Record<KeywordArtifactKind, KeywordCardData>
  >
  visualizedDirectionArtifacts: Partial<
    Record<DirectionArtifactKind, string>
  >
  visualizedProblemStatements: ProblemStatementsData | null
}) {
  const [hintModalOpen, setHintModalOpen] = useState(false)
  const [selectedHintIndex, setSelectedHintIndex] = useState<number | null>(null)
  const [selectedDesignIndex, setSelectedDesignIndex] = useState<number | null>(null)
  const [confirmedThumbnailUrl, setConfirmedThumbnailUrl] = useState<string | null>(null)
  const [meshyTaskId, setMeshyTaskId] = useState<string | null>(null)
  const [meshyStatus, setMeshyStatus] = useState<
    'idle' | 'uploading' | 'PENDING' | 'IN_PROGRESS' | 'SUCCEEDED' | 'FAILED'
  >('idle')
  const [meshyThumbnail, setMeshyThumbnail] = useState<string | null>(null)
  const [meshyError, setMeshyError] = useState<string | null>(null)
  const [moodboardImages, setMoodboardImages] = useState<MoodboardGridImage[] | null>(null)
  const isUser = message.role === 'user'
  const rfpBlock = extractRfpJsonBlock(message.content)
  const projectDirection = !isUser
    ? extractProjectDirectionCard(rfpBlock.cleanedText)
    : null
  const projectDirectionSplit = projectDirection
    ? splitProjectDirectionContent(rfpBlock.cleanedText)
    : null
  const directionWidgets = !isUser && hasDirectionWidgets(rfpBlock.cleanedText)
  const problemStatements = !isUser
    ? extractProblemStatementsData(rfpBlock.cleanedText)
    : null
  const directionArtifactKind = !isUser
    ? directionArtifactKindOverride ?? getDirectionArtifactKind(rfpBlock.cleanedText)
    : null
  const keywordCards = !isUser
    ? extractKeywordCardsData(rfpBlock.cleanedText)
    : []
  const shouldRenderGeneratedImages =
    Boolean(message.generatedImageBlock?.images.length) &&
    message.generatedImageBlock?.purpose !== 'persona' &&
    (message.generatedImageBlock?.purpose !== 'moodboard_candidate' ||
      canShowStyleReferences)
  const cleanedContent = stripInternalBlocksForDisplay(
    projectDirectionSplit?.after ?? rfpBlock.cleanedText
  )
  const beforeProjectDirection = projectDirectionSplit
    ? stripInternalBlocksForDisplay(projectDirectionSplit.before)
    : ''
  const choiceSplit = splitAssistantChoices(cleanedContent)
  const displayContent = choiceSplit.displayContent
  const isPersonaCardMessage = Boolean(message.personaCardBlock)
  const shouldShowHints =
    !isUser &&
    !isPersonaCardMessage &&
    !problemStatements &&
    !isProcessCheckPrompt(displayContent) &&
    !isStageProceedPrompt(displayContent) &&
    isAssistantQuestion(displayContent)
  const choices = isPersonaCardMessage
    ? []
    : choiceSplit.choices.length > 0
      ? choiceSplit.choices
      : shouldShowHints
        ? buildFallbackHintChoices(displayContent)
        : []

  useEffect(() => {
    if (!meshyTaskId || meshyStatus === 'SUCCEEDED' || meshyStatus === 'FAILED') return

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/meshy?taskId=${meshyTaskId}`)
        const task = await res.json()
        if (!res.ok) {
          setMeshyError(task.error || '3D 작업 상태를 확인하지 못했습니다.')
          setMeshyStatus('FAILED')
          return
        }
        setMeshyStatus(task.status)
        if (task.status === 'SUCCEEDED' && task.thumbnail_url) {
          setMeshyThumbnail(task.thumbnail_url)
        }
      } catch {
        // ignore transient errors; keep polling
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [meshyTaskId, meshyStatus])

  const isPersonaVisualizationOnly =
    Boolean(message.personaCardBlock?.imageUrl) &&
    !displayContent

  if (isPersonaVisualizationOnly) {
    return null
  }

  if (
    !displayContent &&
    !beforeProjectDirection &&
    !projectDirection &&
    !directionWidgets &&
    keywordCards.length === 0 &&
    !message.personaCardBlock &&
    !shouldRenderGeneratedImages &&
    !rfpBlock.rfp
  ) {
    return null
  }

  if (isUser) {
    return (
      <article className="ml-auto flex w-full max-w-[800px] flex-col items-end lg:w-[69.6%]">
        <div className="w-full rounded-[20px] bg-white px-[clamp(24px,3.33svh,36px)] py-[clamp(20px,2.59svh,28px)] outline outline-[2px] outline-offset-[-2px] outline-zinc-200">
          <p className="whitespace-pre-wrap font-['Pretendard'] text-[clamp(14px,1.48svh,16px)] font-medium leading-7 text-neutral-900">
            {displayContent}
          </p>
        </div>
        <div className="mr-[clamp(18px,2.22svh,24px)] flex h-[clamp(52px,5.93svh,64px)] w-[clamp(52px,5.93svh,64px)] -translate-y-[clamp(26px,2.96svh,32px)] items-center justify-center overflow-hidden rounded-2xl bg-green-200 outline outline-4 outline-white">
          {userAvatarUrl ? (
            <Image
              src={userAvatarUrl}
              alt=""
              width={64}
              height={64}
              unoptimized
              className="h-full w-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <span className="font-['Inter'] text-[clamp(18px,1.85svh,20px)] font-bold text-green-900">U</span>
          )}
        </div>
      </article>
    )
  }

  return (
    <article className="flex w-full max-w-[800px] flex-col items-start gap-3 lg:w-[69.6%]">
      {beforeProjectDirection ? (
        <div className="w-full rounded-[20px] bg-slate-200 px-[clamp(24px,3.33svh,36px)] py-[clamp(20px,2.59svh,28px)]">
          <MarkdownContent content={beforeProjectDirection} />
        </div>
      ) : null}

      {projectDirection ? <ProjectDirectionCard data={projectDirection} /> : null}
      {displayContent || shouldRenderGeneratedImages ? (
        <div className="w-full rounded-[20px] bg-slate-200 px-[clamp(24px,3.33svh,36px)] py-[clamp(20px,2.59svh,28px)]">
          {displayContent ? (
            <MarkdownContent content={displayContent} />
          ) : null}

          {shouldRenderGeneratedImages && message.generatedImageBlock ? (
            <div className="mt-5">
              {message.generatedImageBlock.purpose === 'moodboard_candidate' ? (
                moodboardImages ? (
                  <MoodboardGrid
                    images={moodboardImages}
                    onOpenModal={onOpenMoodboardModal}
                  />
                ) : (
                  <MoodboardCandidates
                    candidates={
                      (message.generatedImageBlock.unsplashMeta as UnsplashImageMeta[]) ??
                      message.generatedImageBlock.images.map((url, i) => ({
                        id: String(i),
                        photographer_name: '',
                        photographer_url: '',
                        thumb_url: url,
                        unsplash_page_url: '',
                        url,
                      }))
                    }
                    disabled={disabled}
                    projectId={projectId}
                    searchQuery={message.generatedImageBlock.prompt}
                    onBoardReady={(imgs) => {
                      setMoodboardImages(imgs)
                      onChoice('스타일 레퍼런스를 선택하고 무드보드를 만들었어요.')
                    }}
                  />
                )
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    {message.generatedImageBlock.images.map((image, index) => (
                      <Image
                        key={`${message.id}-${index}`}
                        src={image}
                        alt=""
                        width={260}
                        height={260}
                        unoptimized
                        className="aspect-square w-full rounded-xl object-cover"
                      />
                    ))}
                  </div>
                </>
              )}
              {message.generatedImageBlock.purpose === 'style_reference' ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {message.generatedImageBlock.images.map((_, index) => (
                    <button
                      key={`${message.id}-style-choice-${index}`}
                      type="button"
                      disabled={disabled}
                      onClick={() =>
                        onChoice(`${index + 1}번 스타일 레퍼런스를 선택할게요`)
                      }
                      className="rounded-full border border-zinc-200 bg-white px-4 py-1.5 font-['Pretendard'] text-xs font-semibold text-neutral-700 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 disabled:opacity-50"
                    >
                      {index + 1}번 선택
                    </button>
                  ))}
                </div>
              ) : message.generatedImageBlock.purpose === 'design' ? (
                <div className="mt-3 flex flex-col gap-3">
                  <div className="flex flex-wrap gap-2">
                    {message.generatedImageBlock.images.map((_, index) => (
                      <button
                        key={`${message.id}-design-choice-${index}`}
                        type="button"
                        disabled={disabled}
                        onClick={() => {
                          setSelectedDesignIndex(index)
                          onChoice(
                            `${index + 1}번 디자인 시안을 최종안으로 확정하고 진행할게요`
                          )
                          const image = message.generatedImageBlock?.images[index]
                          if (image) {
                            fetch('/api/projects/thumbnail', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ imageBase64: image, projectId }),
                            })
                              .then((r) => r.json())
                              .then((p: { thumbnailUrl?: string }) => {
                                if (p.thumbnailUrl) setConfirmedThumbnailUrl(p.thumbnailUrl)
                              })
                              .catch(() => null)
                          }
                        }}
                        className={`rounded-full px-4 py-1.5 font-['Pretendard'] text-xs font-semibold transition disabled:opacity-50 ${
                          selectedDesignIndex === index
                            ? 'bg-blue-700 text-white ring-2 ring-blue-400'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        {index + 1}번 시안 확정
                      </button>
                    ))}
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() =>
                        onChoice('현재 디자인 시안을 수정해서 다시 보여주세요')
                      }
                      className="rounded-full border border-zinc-200 bg-white px-4 py-1.5 font-['Pretendard'] text-xs font-semibold text-neutral-700 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 disabled:opacity-50"
                    >
                      수정안 다시 생성
                    </button>
                  </div>

                  {/* Meshy AI 3D generation — 시안 확정 후 활성화 */}
                  {selectedDesignIndex !== null && (
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        disabled={
                          disabled ||
                          meshyStatus === 'uploading' ||
                          meshyStatus === 'PENDING' ||
                          meshyStatus === 'IN_PROGRESS' ||
                          meshyStatus === 'SUCCEEDED'
                        }
                        onClick={async () => {
                          const selectedImage =
                            message.generatedImageBlock?.images[selectedDesignIndex]
                          if (!selectedImage) return
                          setMeshyStatus('uploading')
                          setMeshyError(null)
                          try {
                            const mimeType = selectedImage.startsWith('data:image/png')
                              ? 'image/png'
                              : 'image/jpeg'
                            const res = await fetch('/api/meshy', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify(
                              confirmedThumbnailUrl
                                ? { thumbnailUrl: confirmedThumbnailUrl, projectId }
                                : { imageBase64: selectedImage, mimeType, projectId }
                            ),
                            })
                            const payload = (await res.json().catch(() => null)) as {
                              error?: string
                              stage?: string
                              taskId?: string
                            } | null
                            if (!res.ok || !payload?.taskId) {
                              const stageLabel = payload?.stage
                                ? ` (${payload.stage})`
                                : ''
                              throw new Error(
                                `${payload?.error || '3D 작업을 시작하지 못했습니다.'}${stageLabel}`
                              )
                            }
                            const { taskId } = payload
                            setMeshyTaskId(taskId)
                            setMeshyStatus('PENDING')
                          } catch (error) {
                            setMeshyError(
                              error instanceof Error
                                ? error.message
                                : '3D 작업을 시작하지 못했습니다.'
                            )
                            setMeshyStatus('FAILED')
                          }
                        }}
                        className="rounded-full border border-zinc-300 bg-zinc-900 px-4 py-1.5 font-['Pretendard'] text-xs font-semibold text-white transition hover:bg-zinc-700 disabled:opacity-50"
                      >
                        {meshyStatus === 'uploading'
                          ? '업로드 중...'
                          : meshyStatus === 'PENDING' || meshyStatus === 'IN_PROGRESS'
                            ? '3D 생성 중...'
                            : meshyStatus === 'SUCCEEDED'
                              ? '3D 모델 완료 ✓'
                              : meshyStatus === 'FAILED'
                                ? '3D 생성 실패 — 재시도'
                                : `${selectedDesignIndex + 1}번 시안 3D 모델 생성하기`}
                      </button>

                      {(meshyStatus === 'PENDING' || meshyStatus === 'IN_PROGRESS') && (
                        <span className="font-['Pretendard'] text-xs text-zinc-500">
                          Meshy AI 처리 중...
                        </span>
                      )}
                      {meshyStatus === 'FAILED' && meshyError ? (
                        <span className="max-w-full font-['Pretendard'] text-xs text-red-600">
                          {meshyError}
                        </span>
                      ) : null}
                    </div>
                  )}

                  {meshyStatus === 'SUCCEEDED' && meshyThumbnail && (
                    <div className="flex flex-col gap-1">
                      <span className="font-['Pretendard'] text-xs font-semibold text-zinc-600">
                        3D 모델 미리보기
                      </span>
                      <Image
                        src={meshyThumbnail}
                        alt="3D model thumbnail"
                        width={160}
                        height={160}
                        unoptimized
                        className="rounded-lg object-cover"
                      />
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {directionWidgets ? (
        <DirectionResearchWidgets
          disabled={disabled}
          onSelect={(kind) => {
            const labelMap: Record<DirectionArtifactKind, string> = {
              brand_positioning: '경쟁사 리서치 보기',
              consumption_keywords: '소비 트렌드 리서치 보기',
              market_size: '시장 규모 리서치 보기',
            }

            onChoice(labelMap[kind])
          }}
        />
      ) : null}

      {choices.length > 0 && !directionArtifactKind ? (
        <div className="flex w-full justify-end">
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              setHintModalOpen(true)
              setSelectedHintIndex(null)
            }}
            className="rounded-[30px] bg-[#DDF444] px-5 py-[3px] font-['Inter'] text-xs font-semibold leading-5 text-black disabled:opacity-50"
          >
            힌트 보기
          </button>
        </div>
      ) : null}

      {message.personaCardBlock && isLatestEditablePersona ? (
        <div className="flex w-full flex-col items-end gap-3">
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChoice('페르소나 카드 다시 생성하기')}
              className="min-w-24 rounded-[30px] bg-blue-600 px-5 py-[3px] font-['Pretendard'] text-xs font-semibold leading-5 text-white disabled:opacity-50"
            >
              다시 생성하기
            </button>
            <button
              type="button"
              disabled={disabled || hasConfirmedPersona}
              onClick={() => onConfirmPersona(message.id)}
              className={`min-w-24 rounded-[30px] px-5 py-[3px] font-['Pretendard'] text-xs font-semibold leading-5 disabled:cursor-default ${
                hasConfirmedPersona
                  ? 'bg-neutral-500 text-white'
                  : 'bg-[#DDF444] text-black disabled:opacity-50'
              }`}
            >
              확정하기
            </button>
          </div>

          {hasConfirmedPersona &&
          !message.personaCardBlock.imageUrl &&
          !hasVisualizedPersona ? (
            <button
              type="button"
              disabled={disabled}
              onClick={() =>
                void onVisualizePersona(message.id, message.personaCardBlock)
              }
              className="inline-flex items-center gap-1 rounded-[30px] bg-[#DDF444] px-5 py-[3px] font-['Inter'] text-xs font-semibold leading-5 text-black disabled:opacity-50"
            >
              시각화 하기
              <Image
                src="/assets/icons/chat/visualize.svg"
                alt=""
                width={18}
                height={18}
                className="ml-0.5 h-[18px] w-[18px]"
              />
              <span>2</span>
            </button>
          ) : null}
        </div>
      ) : null}

      {(() => {
        const psData = problemStatements
        const isLatestPs = latestProblemStatementsMessageId === message.id

        if (!psData || !isLatestPs) return null

        return (
          <div className="flex w-full flex-col items-end gap-3">
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={disabled}
                onClick={() => onChoice('Problem Statements 다시 생성하기')}
                className="min-w-24 rounded-[30px] bg-blue-600 px-5 py-[3px] font-['Pretendard'] text-xs font-semibold leading-5 text-white disabled:opacity-50"
              >
                다시 생성하기
              </button>
              <button
                type="button"
                disabled={disabled || isProblemStatementsConfirmed}
                onClick={() => onConfirmProblemStatements(message.id)}
                className={`min-w-24 rounded-[30px] px-5 py-[3px] font-['Pretendard'] text-xs font-semibold leading-5 disabled:cursor-default ${
                  isProblemStatementsConfirmed
                    ? 'bg-neutral-500 text-white'
                    : 'bg-[#DDF444] text-black disabled:opacity-50'
                }`}
              >
                확정하기
              </button>
            </div>
            {isProblemStatementsConfirmed && !visualizedProblemStatements ? (
              <button
                type="button"
                disabled={disabled}
                onClick={() => onVisualizeProblemStatements(psData)}
                className="inline-flex items-center gap-1 rounded-[30px] bg-[#DDF444] px-5 py-[3px] font-['Inter'] text-xs font-semibold leading-5 text-black disabled:opacity-50"
              >
                시각화 하기
                <Image
                  src="/assets/icons/chat/visualize.svg"
                  alt=""
                  width={18}
                  height={18}
                  className="ml-0.5 h-[18px] w-[18px]"
                />
                <span>2</span>
              </button>
            ) : null}
          </div>
        )
      })()}

      {keywordCards.map((keywordCard) => {
        const isLatestKeywordResult =
          latestKeywordMessageIds[keywordCard.kind] === message.id

        if (!isLatestKeywordResult) {
          return null
        }

        const isConfirmed = confirmedKeywordKinds.has(keywordCard.kind)
        const visualizedCard = visualizedKeywordCards[keywordCard.kind]
        const isCurrentCardVisualized = Boolean(
          visualizedCard &&
            visualizedCard.title === keywordCard.title &&
            visualizedCard.description === keywordCard.description &&
            visualizedCard.keywords.join('\u0000') ===
              keywordCard.keywords.join('\u0000')
        )
        const label =
          keywordCard.kind === 'experience_keywords'
            ? 'Keywords: Experience'
            : 'Keywords: Relationship'

        return (
          <div
            key={`${message.id}-${keywordCard.kind}-actions`}
            className="flex w-full flex-col items-end gap-3"
          >
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={disabled}
                onClick={() => onChoice(`${label} 다시 생성하기`)}
                className="min-w-24 rounded-[30px] bg-blue-600 px-5 py-[3px] font-['Pretendard'] text-xs font-semibold leading-5 text-white disabled:opacity-50"
              >
                다시 생성하기
              </button>
              <button
                type="button"
                disabled={disabled || isConfirmed}
                onClick={() =>
                  onConfirmKeyword(keywordCard.kind, message.id)
                }
                className={`min-w-24 rounded-[30px] px-5 py-[3px] font-['Pretendard'] text-xs font-semibold leading-5 disabled:cursor-default ${
                  isConfirmed
                    ? 'bg-neutral-500 text-white'
                    : 'bg-[#DDF444] text-black disabled:opacity-50'
                }`}
              >
                확정하기
              </button>
            </div>

            {isConfirmed && !isCurrentCardVisualized ? (
              <button
                type="button"
                disabled={disabled}
                onClick={() => onVisualizeKeyword(keywordCard)}
                className="inline-flex items-center gap-1 rounded-[30px] bg-[#DDF444] px-5 py-[3px] font-['Inter'] text-xs font-semibold leading-5 text-black disabled:opacity-50"
              >
                시각화 하기
                <Image
                  src="/assets/icons/chat/visualize.svg"
                  alt=""
                  width={18}
                  height={18}
                  className="ml-0.5 h-[18px] w-[18px]"
                />
                <span>2</span>
              </button>
            ) : null}
          </div>
        )
      })}

      {directionArtifactKind &&
      latestDirectionMessageIds[directionArtifactKind] === message.id ? (
        <div className="flex w-full flex-col items-end gap-3">
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              disabled={disabled}
              onClick={() =>
                onChoice(
                  `${getDirectionArtifactLabel(directionArtifactKind)} 다시 생성하기`
                )
              }
              className="min-w-24 rounded-[30px] bg-blue-600 px-5 py-[3px] font-['Pretendard'] text-xs font-semibold leading-5 text-white disabled:opacity-50"
            >
              다시 생성하기
            </button>
            <button
              type="button"
              disabled={
                disabled || confirmedDirectionKinds.has(directionArtifactKind)
              }
              onClick={() =>
                onConfirmDirection(directionArtifactKind, message.id)
              }
              className={`min-w-24 rounded-[30px] px-5 py-[3px] font-['Pretendard'] text-xs font-semibold leading-5 disabled:cursor-default ${
                confirmedDirectionKinds.has(directionArtifactKind)
                  ? 'bg-neutral-500 text-white'
                  : 'bg-[#DDF444] text-black disabled:opacity-50'
              }`}
            >
              확정하기
            </button>
          </div>

          {confirmedDirectionKinds.has(directionArtifactKind) &&
          visualizedDirectionArtifacts[directionArtifactKind] !== message.id ? (
            <button
              type="button"
              disabled={disabled}
              onClick={() =>
                onVisualizeDirection(
                  directionArtifactKind,
                  message.id,
                  message.content
                )
              }
              className="inline-flex items-center gap-1 rounded-[30px] bg-[#DDF444] px-5 py-[3px] font-['Inter'] text-xs font-semibold leading-5 text-black disabled:opacity-50"
            >
              시각화 하기
              <Image
                src="/assets/icons/chat/visualize.svg"
                alt=""
                width={18}
                height={18}
                className="ml-0.5 h-[18px] w-[18px]"
              />
              <span>2</span>
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="flex w-full flex-wrap items-center justify-end gap-3">
        {isProcessCheckPrompt(displayContent) ? (
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChoice('프로세스 확인하기')}
            className="rounded-[30px] bg-[#DDF444] px-5 py-[3px] font-['Pretendard'] text-xs font-semibold leading-5 text-black disabled:opacity-50"
          >
            프로세스 확인하기
          </button>
        ) : null}

        {isStageProceedPrompt(displayContent) && !directionArtifactKind ? (
          <>
            <button
              type="button"
              disabled={disabled}
              onClick={() =>
                onChoice(
                  isStep1EntryPrompt(displayContent)
                    ? 'STEP 1 시작할게요'
                    : '다음 단계로 진행할게요'
                )
              }
              className="rounded-[30px] bg-blue-600 px-[clamp(16px,1.85svh,20px)] py-[3px] font-['Inter'] text-xs font-semibold leading-5 text-white disabled:opacity-50"
            >
              {isStep1EntryPrompt(displayContent) ? 'STEP 1 시작할게요' : '다음 단계로'}
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChoice('더 하고 싶은 말이 있어요')}
              className="rounded-[30px] bg-[#DDF444] px-[clamp(16px,1.85svh,20px)] py-[3px] font-['Inter'] text-xs font-semibold leading-5 text-black disabled:opacity-50"
            >
              더 하고 싶은 말이 있어요
            </button>
          </>
        ) : null}


      </div>

      {rfpBlock.rfp && latestRfpMessageId === message.id ? (
        <div className="flex w-full flex-col items-end gap-3">
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChoice('프로젝트 기획안 수정하기')}
              className="min-w-24 rounded-[30px] bg-[#DDF444] px-5 py-[3px] font-['Pretendard'] text-xs font-semibold leading-5 text-black disabled:opacity-50"
            >
              수정하기
            </button>
            <button
              type="button"
              disabled={disabled || hasConfirmedRfp}
              onClick={() => onChoice('프로젝트 기획안 확정하기')}
              className="min-w-24 rounded-[30px] bg-[#DDF444] px-5 py-[3px] font-['Pretendard'] text-xs font-semibold leading-5 text-black disabled:opacity-50"
            >
              확정하기
            </button>
          </div>

          {hasConfirmedRfp && !hasVisualizedRfp ? (
            <button
              type="button"
              disabled={disabled}
              onClick={() => onVisualizeRfp(message.id, rfpBlock.rfp!)}
              className="inline-flex items-center gap-1 rounded-[30px] bg-[#DDF444] px-5 py-[3px] font-['Inter'] text-xs font-semibold leading-5 text-black disabled:opacity-50"
            >
              시각화 하기
              <Image
                src="/assets/icons/chat/visualize.svg"
                alt=""
                width={18}
                height={18}
                className="ml-0.5 h-[18px] w-[18px]"
              />
              <span>2</span>
            </button>
          ) : null}

          {hasVisualizedRfp ? (
            <button
              type="button"
              disabled={disabled}
              onClick={() => void onDownloadRfp()}
              className="rounded-[30px] bg-blue-600 px-5 py-[3px] font-['Inter'] text-xs font-semibold leading-5 text-white disabled:opacity-50"
            >
              리포트 다운로드
            </button>
          ) : null}
        </div>
      ) : null}

      {hintModalOpen && choices.length > 0 ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={() => setHintModalOpen(false)}
        >
          <div className="absolute inset-0 bg-black/20" />
          <div
            className="relative w-[501px] overflow-hidden rounded-[10px] bg-white shadow-[inset_-2px_2px_4px_1px_rgba(0,0,0,0.15)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-px" />
            <div className="flex h-7 items-center justify-end px-6 py-[3px]">
              <button
                type="button"
                onClick={() => setHintModalOpen(false)}
                className="flex items-center justify-center"
              >
                <Image
                  src="/assets/icons/chat/x-button.svg"
                  alt="닫기"
                  width={12}
                  height={12}
                />
              </button>
            </div>
            <div>
              {choices.map((choice, index) => (
                <button
                  key={choice.key}
                  type="button"
                  onClick={() => setSelectedHintIndex(index)}
                  className={`flex w-full items-center gap-10 border-t border-gray-200 py-3 pl-6 pr-9 text-left transition ${
                    selectedHintIndex === index
                      ? 'bg-zinc-100 shadow-[0px_2px_2px_0px_rgba(0,0,0,0.10)]'
                      : 'hover:bg-zinc-50'
                  }`}
                >
                  <span className="w-10 text-center font-['Inter'] text-base font-semibold leading-6 text-neutral-900">
                    {choice.key}
                  </span>
                  <span className="w-72 font-['Pretendard'] text-sm font-semibold leading-6 text-[#1B2561]">
                    {choice.label}
                  </span>
                </button>
              ))}
            </div>
            <div className="flex h-12 items-center justify-end border-t border-gray-200 px-6">
              <button
                type="button"
                disabled={selectedHintIndex === null || disabled}
                onClick={() => {
                  if (selectedHintIndex !== null) {
                    onChoice(choices[selectedHintIndex]!.label)
                    setHintModalOpen(false)
                  }
                }}
                className="w-24 rounded-[30px] bg-[#DDF444] px-5 py-[3px] text-center font-['Inter'] text-xs font-semibold leading-5 text-black disabled:opacity-40"
              >
                선택하기
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </article>
  )
}
