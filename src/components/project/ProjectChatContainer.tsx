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
import { ProjectFavoriteButton } from '@/components/project/ProjectFavoriteButton'
import { ProjectMoreMenu } from '@/components/project/ProjectMoreMenu'
import {
  getExpertDefinition,
  type ExpertKey,
} from '@/lib/chat/experts'
import type { GeneratedImagePurpose } from '@/lib/chat/image-blocks'
import type { PersonaCardData } from '@/lib/chat/persona-card'
import { extractRfpJsonBlock } from '@/lib/chat/rfp'
import type { StageKey } from '@/lib/chat/stages'

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

type KeywordArtifactKind = 'experience_keywords' | 'relationship_keywords'

type KeywordCardData = {
  description: string
  keywords: string[]
  kind: KeywordArtifactKind
  title: string
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
  label: string
}> = [
  {
    icon: '/assets/icons/chat/strategist.svg',
    key: 'planner',
    label: '기획전략가',
  },
  {
    icon: '/assets/icons/chat/designer.svg',
    key: 'style_designer',
    label: '스타일디자이너',
  },
  {
    icon: '/assets/icons/chat/engineer.svg',
    key: 'engineer',
    label: '엔지니어',
  },
  {
    icon: '/assets/icons/chat/marketer.svg',
    key: 'marketer',
    label: '마케터',
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
  { kind: 'persona', title: 'Persona' },
  { kind: 'experience_keywords', title: 'Keywords: Experience' },
  { kind: 'relationship_keywords', title: 'Keywords: Relationship' },
  { kind: 'problem_statements', title: 'Problem Statements' },
  { kind: 'market_sizing', title: 'TAM SAM SOM' },
  { kind: 'brand_positioning', title: 'Positioning Map: Brand' },
  { kind: 'consumption_keywords', title: 'Keywords: Consumption' },
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
    .replace(/\n?\[시스템\s*참고:[\s\S]*?\]/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function hasDirectionWidgets(content: string) {
  return /<<AIDEE_DIRECTION_WIDGETS>>[\s\S]*?<<\/AIDEE_DIRECTION_WIDGETS>>/.test(
    content
  )
}

function extractKeywordCardsData(content: string): KeywordCardData[] {
  const normalized = stripInternalBlocksForDisplay(content)
  const matches = normalized.matchAll(
    /(?:^|\n)#{1,3}\s*Keywords:\s*(Experience|Relationship)\s*\n([\s\S]*?)(?=\n#{1,3}\s|\n\s*다음\s*STEP|\s*$)/gi
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
      .flatMap((line) => line.split(/,|\/|·|#|  +/))
      .map((item) =>
        item
          .replace(/[:：].*$/, '')
          .replace(/[.!?。！？]+$/g, '')
          .trim()
      )
      .filter(
        (item) =>
          item.length >= 2 &&
          item.length <= 18 &&
          !/keywords?|experience|relationship|키워드|요약|설명/i.test(item)
      )
    const keywords = Array.from(new Set(keywordCandidates)).slice(0, 24)
    const description = rawLines
      .filter((line) => line.length > 18)
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
  const mentionsProceedQuestion = /진행할까요[?？]?/.test(normalized)
  const mentionsNextStage =
    /다음(?:으로| 단계| STEP)/i.test(normalized) ||
    /STEP\s*\d+[\s\S]*(?:넘어|진행|이동|들어가|시작)/i.test(normalized)

  return mentionsProceedQuestion && mentionsNextStage
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
  userTokenCount = 28,
}: ProjectChatContainerProps) {
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
  const [keywordCardModalData, setKeywordCardModalData] =
    useState<KeywordCardData | null>(null)
  const [visualizedKeywordCards, setVisualizedKeywordCards] = useState<
    Partial<Record<KeywordArtifactKind, KeywordCardData>>
  >({})
  const [isPending, setIsPending] = useState(false)
  const activeExpertDefinition = getExpertDefinition(activeExpert)
  const visibleMessages = useMemo(
    () => messages.filter((message) => message.role !== 'system'),
    [messages]
  )
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
  const availableArtifacts = useMemo(() => {
    const availableKinds = new Set<LibraryArtifactKind>()

    if (latestProjectDirection) {
      availableKinds.add('project_direction')
    }

    if (visualizedKeywordCards.experience_keywords) {
      availableKinds.add('experience_keywords')
    }

    if (visualizedKeywordCards.relationship_keywords) {
      availableKinds.add('relationship_keywords')
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

      if (extractRfpJsonBlock(message.content).rfp) {
        availableKinds.add('project_report')
      }
    }

    return LIBRARY_ARTIFACTS.filter((artifact) =>
      availableKinds.has(artifact.kind)
    )
  }, [latestProjectDirection, visibleMessages, visualizedKeywordCards])
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
          stageKey,
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
          currentStageKey: stageKey,
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
      setStageKey(result.nextStageKey ?? stageKey)
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
  }, [activeExpert, isPending, messages, projectId, stageKey])

  async function submitMessage(
    message: string,
    forceImageGeneration?: ForceImageGeneration
  ) {
    if (!message.trim()) {
      return
    }

    const assistantMessage = await requestAssistantResponse({
      forceImageGeneration,
      message,
    })

    if (assistantMessage?.personaCardBlock?.imageUrl) {
      setPersonaCardModalData(assistantMessage.personaCardBlock)
    }
  }

  async function visualizePersonaCard(personaCard?: PersonaCardData | null) {
    if (personaCard?.imageUrl) {
      setPersonaCardModalData(personaCard)
      return
    }

    if (latestVisualizedPersonaCard) {
      setPersonaCardModalData(latestVisualizedPersonaCard)
      return
    }

    const assistantMessage = await requestAssistantResponse({
      forceImageGeneration: 'persona_card',
      message: '',
    })

    if (assistantMessage?.personaCardBlock?.imageUrl) {
      setPersonaCardModalData(assistantMessage.personaCardBlock)
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
    const hasAssistantMessage = visibleMessages.some(
      (message) => message.role === 'assistant'
    )

    setSidebarState({
      activeExpert,
      activeExperts: STAGE_EXPERTS[stageKey],
      activeStageKey: stageKey,
      showProgress: hasAssistantMessage,
    })

    return () => setSidebarState(defaultProjectChatSidebarState)
  }, [activeExpert, setSidebarState, stageKey, visibleMessages])

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
        throw new Error(result?.error || 'RFP 다운로드에 실패했습니다.')
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${projectTitle || 'aidee-rfp'}.md`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'RFP 다운로드에 실패했습니다.'
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
                  disabled={isPending}
                  hasVisualizedPersona={Boolean(latestVisualizedPersonaCard)}
                  onChoice={(value) => submitMessage(value)}
                  onDownloadRfp={downloadRfp}
                  onVisualizeKeyword={visualizeKeywordCard}
                  onVisualizePersona={visualizePersonaCard}
                  userAvatarUrl={userAvatarUrl}
                  visualizedKeywordCards={visualizedKeywordCards}
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
                    AI 전문가 선택
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
                          className={`h-7 w-7 shrink-0 object-contain transition duration-150 group-hover:brightness-100 group-hover:grayscale-0 ${
                            isActive
                              ? 'brightness-100 grayscale-0'
                              : 'brightness-0 grayscale opacity-60'
                          }`}
                        />
                        <span className="min-w-0 flex-1 font-['Inter'] text-sm font-semibold leading-6">
                          {expert.label}
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
                aria-label="AI 전문가 선택"
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

      <KeywordCardModal
        data={keywordCardModalData}
        onClose={() => setKeywordCardModalData(null)}
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
            const isPersona = artifact.kind === 'persona'
            const isExperienceKeywords =
              artifact.kind === 'experience_keywords'
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
                    : isPersona
                      ? 'bg-[#DCD6D8]'
                      : isExperienceKeywords
                        ? 'bg-violet-100'
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
                    <h2 className="whitespace-pre-line font-['Inter'] text-[clamp(20px,2.78svh,30px)] font-semibold leading-[1.07] text-black">
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
                ) : isPersona ? (
                  <>
                    <h2 className="absolute left-[5.43%] top-[7.14%] z-10 font-['Inter'] text-[clamp(20px,2.78svh,30px)] font-semibold leading-[1.7] text-[#232323]">
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
                    <h2 className="absolute left-[5.43%] top-[7.14%] z-10 whitespace-pre-line font-['Inter'] text-[clamp(20px,2.78svh,30px)] font-semibold leading-[1.07] text-black">
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

  if (/억/.test(normalized)) {
    return '$100K+'
  }

  const firstNumber = normalized.match(/\d[\d,]*/)?.[0]

  return firstNumber ? `${firstNumber.replace(/,/g, '')}만+` : 'Scope'
}

function getPrimaryFeature(features: string) {
  const [firstFeature] = features
    .split(/,|\/|·|\n/)
    .map((item) => item.trim())
    .filter(Boolean)

  if (!firstFeature || firstFeature === '미정') {
    return '핵심 기능 정리 필요'
  }

  return firstFeature.length > 26
    ? `${firstFeature.slice(0, 26).trim()}...`
    : firstFeature
}

function ProjectDirectionCard({ data }: { data: ProjectDirectionData }) {
  return (
    <div className="w-full max-w-[800px] overflow-hidden rounded-[20px] bg-white px-[clamp(18px,2.22svh,24px)] py-[clamp(20px,2.59svh,28px)] outline outline-[3px] outline-offset-[-3px] outline-zinc-200">
      <div className="flex items-center gap-2.5">
        <div className="flex h-[clamp(240px,29.63svh,320px)] min-w-0 flex-1 flex-col justify-between overflow-hidden">
          <div className="flex flex-col gap-[clamp(14px,1.85svh,20px)]">
            <h2 className="font-['Inter'] text-[clamp(28px,3.33svh,36px)] font-medium leading-10 text-black">
              Project
              <br />
              Direction
            </h2>
            <div className="flex h-[clamp(32px,3.7svh,40px)] w-[clamp(32px,3.7svh,40px)] flex-col items-start justify-start gap-1.5 overflow-hidden rounded-3xl px-3.5 pb-3 pt-3.5 outline outline-1 outline-offset-[-1px] outline-neutral-400">
              <div className="h-2.5 w-2.5 origin-top-left -rotate-45 outline outline-1 outline-offset-[-0.5px] outline-neutral-400" />
              <div className="h-2 w-2 origin-top-left -rotate-45 outline outline-1 outline-offset-[-0.5px] outline-neutral-400" />
            </div>
          </div>

          <div className="flex flex-col gap-3 overflow-hidden">
            <h3 className="font-['Pretendard'] text-[clamp(20px,2.22svh,24px)] font-medium leading-6 text-black">
              {data.category}
            </h3>
            <p className="max-w-96 font-['Pretendard'] text-[clamp(13px,1.3svh,14px)] font-medium leading-5 text-black">
              {data.goal !== '미정' ? data.goal : data.ideaSummary}
            </p>
          </div>
        </div>

        <div className="flex h-[clamp(240px,29.63svh,320px)] w-[clamp(240px,29.63svh,320px)] shrink-0 flex-wrap content-center items-center justify-center gap-2 overflow-hidden">
          <div className="flex w-[clamp(240px,29.63svh,320px)] flex-col items-start justify-start gap-[clamp(14px,1.85svh,20px)] overflow-hidden rounded-[20px] bg-black px-[clamp(18px,2.22svh,24px)] pb-[clamp(18px,2.22svh,24px)] pt-[clamp(20px,2.59svh,28px)]">
            <h3 className="font-['Inter'] text-[clamp(28px,3.33svh,36px)] font-medium leading-6 text-white">
              Target Timeline
            </h3>
            <div className="rounded-[100px] bg-violet-200 px-5 py-2.5">
              <p className="w-[clamp(112px,13.33svh,144px)] text-center font-['Inter'] text-[clamp(24px,2.78svh,30px)] font-semibold leading-6 text-black">
                {data.budgetAndDuration.split('/')[1]?.trim() || 'TBD'}
              </p>
            </div>
          </div>

          <div className="flex h-[clamp(108px,13.33svh,144px)] w-[clamp(132px,16.3svh,176px)] flex-col items-start justify-between overflow-hidden rounded-[20px] bg-violet-200 px-[clamp(15px,1.85svh,20px)] pb-[clamp(11px,1.3svh,14px)] pt-[clamp(15px,1.85svh,20px)]">
            <p className="font-['Pretendard'] text-[clamp(28px,3.33svh,36px)] font-medium leading-6 text-black">
              {getBudgetHeadline(data.budgetAndDuration)}
            </p>
            <div>
              <p className="font-['Inter'] text-[clamp(13px,1.3svh,14px)] font-medium leading-6 text-black">
                Project Scope
              </p>
              <p className="font-['Pretendard'] text-xs font-medium leading-6 text-black">
                {data.budgetAndDuration.split('/')[0]?.trim() || '미정'}
              </p>
            </div>
          </div>

          <div className="flex h-[clamp(108px,13.33svh,144px)] w-[clamp(96px,11.85svh,128px)] flex-col items-center justify-start gap-[5px] overflow-hidden rounded-[20px] bg-indigo-300 p-[clamp(10px,1.3svh,14px)]">
            <div className="self-stretch rounded-[100px] bg-white px-2.5 py-[5px] text-center">
              <span className="font-['Pretendard'] text-[clamp(12px,1.3svh,14px)] font-semibold leading-6 text-black">
                Key Features
              </span>
            </div>
            <div className="p-2.5">
              <div className="h-6 w-6 outline outline-2 outline-offset-[-1px] outline-black" />
            </div>
            <p className="w-20 text-center font-['Pretendard'] text-[clamp(11px,1.11svh,12px)] font-medium leading-4 text-black">
              {getPrimaryFeature(data.features)}
            </p>
          </div>
        </div>
      </div>
    </div>
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-6"
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
      className="absolute inset-0 z-[70] flex items-center justify-center bg-neutral-900/70 p-6"
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
            <p className="line-clamp-4 font-['Pretendard'] text-[13px] font-medium leading-[22px] text-black">
              {personaStory.join(' ')}
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
      <dd className="line-clamp-1 min-w-0 font-['Pretendard'] text-[13px] font-medium leading-[19px] text-black">
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
          <span className="line-clamp-1 min-w-0">{item}</span>
        </li>
      ))}
    </ul>
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
      className="absolute inset-0 z-[70] flex items-center justify-center bg-neutral-900/70 p-6"
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
  const keywords = data.keywords.slice(0, 28)
  const featuredKeywords = new Set(
    keywords.filter((_, index) => index % 3 === 1 || index % 5 === 0).slice(0, 12)
  )
  const keywordRows = [
    keywords.slice(0, 7),
    keywords.slice(7, 15),
    keywords.slice(15, 22),
    keywords.slice(22, 28),
  ]

  return (
    <div className="relative aspect-[1176/780] max-h-[calc(100svh-48px)] w-full max-w-[1176px] overflow-hidden rounded-[20px] bg-white shadow-[0px_24px_60px_0px_rgba(0,0,0,0.10)]">
      <div className="absolute inset-x-0 top-[58.8%] h-[41.2%] bg-zinc-300/40" />

      <div className="absolute left-[4.7%] top-[5.1%]">
        <h2 className="whitespace-pre-line font-['Inter'] text-[clamp(24px,3.7svh,36px)] font-medium leading-[1.1] text-black">
          <span className="text-blue-600">K</span>
          {data.title.replace(/^K/i, '').replace(': ', ':\n')}
        </h2>
      </div>

      <div className="absolute left-[4.7%] top-[23.7%] w-[55%]">
        <p className="mb-[clamp(12px,2.04svh,22px)] font-['Pretendard'] text-[clamp(14px,2.04svh,20px)] font-bold leading-6 text-blue-600">
          {getKeywordCardSubtitle(data)}
        </p>
        <p className="font-['Pretendard'] text-[clamp(11px,1.3svh,14px)] font-medium leading-[clamp(17px,2.22svh,24px)] text-black">
          {data.description}
        </p>
      </div>

      <span className="absolute left-[4.7%] top-[62.6%] h-[1.8%] w-0 border-l-2 border-blue-600" />

      <div className="absolute bottom-[5%] left-0 right-0 h-[32.8%] overflow-hidden rounded-[20px] shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)]">
        <p className="absolute left-[5.4%] top-0 font-['Pretendard'] text-[clamp(11px,1.48svh,16px)] font-semibold leading-6 text-black">
          <span className="text-blue-600">K</span>eywords
        </p>

        <div className="flex h-full flex-col justify-center gap-[clamp(6px,1.02svh,11px)] px-[4.4%] pt-[1.6%]">
          <div className="flex min-w-0 items-center gap-[clamp(6px,1.02svh,11px)] pl-[9.5%]">
            <p className="mr-[2%] shrink-0 font-['Inter'] text-[clamp(18px,2.78svh,30px)] font-semibold leading-8 text-black/80">
              Define
            </p>
            {keywordRows[0].map((keyword, index) => (
              <KeywordChip
                key={`top-${keyword}-${index}`}
                featured={featuredKeywords.has(keyword)}
                label={keyword}
              />
            ))}
          </div>
          <div className="flex min-w-0 items-center gap-[clamp(6px,1.02svh,11px)]">
            {keywordRows[1].map((keyword, index) => (
              <KeywordChip
                key={`second-${keyword}-${index}`}
                featured={featuredKeywords.has(keyword)}
                label={keyword}
              />
            ))}
          </div>
          <div className="flex min-w-0 items-center gap-[clamp(6px,1.02svh,11px)] pl-[9.5%]">
            {keywordRows[2].map((keyword, index) => (
              <KeywordChip
                key={`third-${keyword}-${index}`}
                featured={featuredKeywords.has(keyword)}
                label={keyword}
              />
            ))}
          </div>
          <div className="flex min-w-0 items-center gap-[clamp(6px,1.02svh,11px)]">
            {keywordRows[3].map((keyword, index) => (
              <KeywordChip
                key={`bottom-${keyword}-${index}`}
                featured={featuredKeywords.has(keyword)}
                label={keyword}
              />
            ))}
            <p className="ml-auto shrink-0 font-['Inter'] text-[clamp(18px,2.78svh,30px)] font-semibold leading-8 text-black/80">
              Your {data.kind === 'experience_keywords' ? 'Experience' : 'Relationship'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
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
      className={`inline-flex h-[clamp(26px,3.33svh,36px)] min-w-0 shrink items-center justify-center truncate rounded-[100px] px-[clamp(10px,1.85svh,20px)] font-['Pretendard'] text-[clamp(10px,1.48svh,16px)] font-medium leading-6 outline outline-[0.52px] outline-offset-[-0.52px] outline-neutral-500 ${
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
  disabled,
  hasVisualizedPersona,
  message,
  onChoice,
  onDownloadRfp,
  onVisualizeKeyword,
  onVisualizePersona,
  userAvatarUrl,
  visualizedKeywordCards,
}: {
  disabled: boolean
  hasVisualizedPersona: boolean
  message: ChatMessageRecord
  onChoice: (value: string) => void
  onDownloadRfp: () => void
  onVisualizeKeyword: (data: KeywordCardData) => void
  onVisualizePersona: (personaCard?: PersonaCardData | null) => void
  userAvatarUrl?: string | null
  visualizedKeywordCards: Partial<
    Record<KeywordArtifactKind, KeywordCardData>
  >
}) {
  const isUser = message.role === 'user'
  const rfpBlock = extractRfpJsonBlock(message.content)
  const projectDirection = !isUser
    ? extractProjectDirectionCard(rfpBlock.cleanedText)
    : null
  const projectDirectionSplit = projectDirection
    ? splitProjectDirectionContent(rfpBlock.cleanedText)
    : null
  const directionWidgets = !isUser && hasDirectionWidgets(rfpBlock.cleanedText)
  const keywordCards = !isUser
    ? extractKeywordCardsData(rfpBlock.cleanedText)
    : []
  const cleanedContent = stripInternalBlocksForDisplay(
    projectDirectionSplit?.after ?? rfpBlock.cleanedText
  )
  const beforeProjectDirection = projectDirectionSplit
    ? stripInternalBlocksForDisplay(projectDirectionSplit.before)
    : ''
  const choiceSplit = splitAssistantChoices(cleanedContent)
  const displayContent = choiceSplit.displayContent
  const shouldShowHints =
    !isUser &&
    !isStageProceedPrompt(displayContent) &&
    isAssistantQuestion(displayContent)
  const choices =
    choiceSplit.choices.length > 0
      ? choiceSplit.choices
      : shouldShowHints
        ? buildFallbackHintChoices(displayContent)
        : []

  if (
    !displayContent &&
    !beforeProjectDirection &&
    !projectDirection &&
    !directionWidgets &&
    keywordCards.length === 0 &&
    !message.personaCardBlock &&
    !message.generatedImageBlock?.images.length &&
    !rfpBlock.rfp
  ) {
    return null
  }

  if (isUser) {
    return (
      <article className="ml-auto flex w-full max-w-[800px] flex-col items-end lg:w-[69.6%]">
        <div className="w-full rounded-[20px] bg-white px-[clamp(24px,3.33svh,36px)] py-[clamp(20px,2.59svh,28px)] outline outline-[3px] outline-offset-[-3px] outline-zinc-200">
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
        <div className="w-full rounded-[20px] bg-slate-200 px-[clamp(24px,3.33svh,36px)] py-[clamp(20px,2.59svh,28px)] outline outline-[3px] outline-offset-[-3px] outline-zinc-200">
          <MarkdownContent content={beforeProjectDirection} />
        </div>
      ) : null}

      {projectDirection ? <ProjectDirectionCard data={projectDirection} /> : null}
      {displayContent || message.generatedImageBlock?.images.length ? (
        <div className="w-full rounded-[20px] bg-slate-200 px-[clamp(24px,3.33svh,36px)] py-[clamp(20px,2.59svh,28px)] outline outline-[3px] outline-offset-[-3px] outline-zinc-200">
          {displayContent ? (
            <MarkdownContent content={displayContent} />
          ) : null}

          {message.generatedImageBlock?.images.length ? (
            <div className="mt-5">
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
                <div className="mt-3 flex flex-wrap gap-2">
                  {message.generatedImageBlock.images.map((_, index) => (
                    <button
                      key={`${message.id}-design-choice-${index}`}
                      type="button"
                      disabled={disabled}
                      onClick={() =>
                        onChoice(
                          `${index + 1}번 디자인 시안을 최종안으로 확정하고 진행할게요`
                        )
                      }
                      className="rounded-full bg-blue-600 px-4 py-1.5 font-['Pretendard'] text-xs font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
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

      <div className="flex flex-wrap items-center gap-3">
        {isStageProceedPrompt(displayContent) ? (
          <>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChoice('다음 단계로 진행할게요')}
              className="rounded-[30px] bg-blue-600 px-[clamp(16px,1.85svh,20px)] py-[3px] font-['Inter'] text-xs font-semibold leading-5 text-white disabled:opacity-50"
            >
              다음 단계로
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

        {choices.length > 0 ? (
          <>
            <span className="rounded-[30px] bg-[#DDF444] px-[clamp(16px,1.85svh,20px)] py-[3px] font-['Inter'] text-xs font-semibold leading-5 text-black">
              힌트 보기
            </span>
            {choices.map((choice) => (
              <button
                key={`${message.id}-${choice.key}`}
                type="button"
                disabled={disabled}
                onClick={() => onChoice(choice.value)}
                className="rounded-[30px] border border-zinc-200 bg-white px-4 py-[3px] font-['Pretendard'] text-xs font-semibold leading-5 text-neutral-700 shadow-sm transition hover:bg-zinc-50 disabled:opacity-50"
              >
                {choice.label}
              </button>
            ))}
          </>
        ) : null}

        {rfpBlock.rfp ? (
          <button
            type="button"
            disabled={disabled}
            onClick={() => void onDownloadRfp()}
            className="rounded-[30px] bg-blue-600 px-[clamp(16px,1.85svh,20px)] py-[3px] font-['Inter'] text-xs font-semibold leading-5 text-white disabled:opacity-50"
          >
            RFP 다운로드
          </button>
        ) : null}

        {message.personaCardBlock &&
        !message.personaCardBlock.imageUrl &&
        !hasVisualizedPersona ? (
          <button
            type="button"
            disabled={disabled}
            onClick={() => void onVisualizePersona(message.personaCardBlock)}
            className="inline-flex items-center gap-1 rounded-[30px] bg-blue-600 px-[clamp(16px,1.85svh,20px)] py-[3px] font-['Inter'] text-xs font-semibold leading-5 text-white disabled:opacity-50"
          >
            시각화 하기
            <span className="ml-0.5 flex h-4 w-4 items-center justify-center">
              <span className="h-2.5 w-2.5 rounded-sm border border-white" />
            </span>
            <span>2</span>
          </button>
        ) : null}

        {keywordCards.map((keywordCard) =>
          visualizedKeywordCards[keywordCard.kind] ? null : (
            <button
              key={keywordCard.kind}
              type="button"
              disabled={disabled}
              onClick={() => onVisualizeKeyword(keywordCard)}
              className="inline-flex items-center gap-1 rounded-[30px] bg-[#DDF444] px-[clamp(16px,1.85svh,20px)] py-[3px] font-['Inter'] text-xs font-semibold leading-5 text-black disabled:opacity-50"
            >
              {keywordCard.kind === 'experience_keywords'
                ? 'Experience 시각화'
                : 'Relationship 시각화'}
              <span className="ml-0.5 flex h-4 w-4 items-center justify-center">
                <span className="h-2.5 w-2.5 rounded-sm border border-black" />
              </span>
              <span>2</span>
            </button>
          )
        )}
      </div>
    </article>
  )
}
