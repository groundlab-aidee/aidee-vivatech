'use client'

import Image from 'next/image'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from 'react'

import type { ChatMessageRecord } from '@/lib/chat/persistence'
import {
  defaultAppShellHeader,
  useAppShellHeader,
} from '@/components/app-shell/AppShellHeaderContext'
import {
  EXPERT_DEFINITIONS,
  getExpertDefinition,
  type ExpertKey,
} from '@/lib/chat/experts'
import { extractRfpJsonBlock } from '@/lib/chat/rfp'
import type { StageKey } from '@/lib/chat/stages'

type ProjectChatContainerProps = {
  initialMessages: ChatMessageRecord[]
  initialStageKey: StageKey
  isNewProject: boolean
  projectId: string
  projectTitle: string
  userAvatarUrl?: string | null
}

type ChatApiResponse = {
  error?: string
  message?: ChatMessageRecord
  nextStageKey?: StageKey
  userMessage?: ChatMessageRecord | null
}

type ForceImageGeneration = 'design_revision' | 'initial_design' | 'style_reference'

type ChatChoice = {
  key: 'A' | 'B' | 'C'
  label: string
  value: string
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
  userAvatarUrl,
}: ProjectChatContainerProps) {
  const { setHeader } = useAppShellHeader()
  const didRequestInitialResponseRef = useRef(false)
  const messageScrollRef = useRef<HTMLDivElement | null>(null)
  const [messages, setMessages] = useState(initialMessages)
  const [stageKey, setStageKey] = useState(initialStageKey)
  const [activeExpert, setActiveExpert] = useState<ExpertKey>('aidee')
  const [input, setInput] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const activeExpertDefinition = getExpertDefinition(activeExpert)
  const visibleMessages = useMemo(
    () => messages.filter((message) => message.role !== 'system'),
    [messages]
  )

  useEffect(() => {
    setHeader({
      actions: (
        <>
          <button
            type="button"
            aria-label="프로젝트 즐겨찾기"
            className="flex h-8 w-8 items-center justify-center rounded-lg transition hover:bg-zinc-100"
          >
            <Image
              src="/assets/icons/project/star.svg"
              alt=""
              width={24}
              height={24}
              unoptimized
              className="h-6 w-6 object-contain"
            />
          </button>
          <button
            type="button"
            aria-label="프로젝트 더보기"
            className="flex h-8 w-8 items-center justify-center rounded-lg transition hover:bg-zinc-100"
          >
            <Image
              src="/assets/icons/project/more-horizontal.svg"
              alt=""
              width={24}
              height={24}
              unoptimized
              className="h-6 w-6 object-contain"
            />
          </button>
        </>
      ),
      title: projectTitle,
    })

    return () => setHeader(defaultAppShellHeader)
  }, [projectTitle, setHeader])

  const requestAssistantResponse = useCallback(({
    forceImageGeneration,
    message,
  }: {
    forceImageGeneration?: ForceImageGeneration
    message: string
  }) => {
    const trimmed = message.trim()

    if (isPending) {
      return
    }

    startTransition(async () => {
      setErrorMessage(null)

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

        setMessages((current) => [
          ...current,
          ...(result.userMessage ? [result.userMessage] : []),
          ...(result.message ? [result.message] : []),
        ])
        setStageKey(result.nextStageKey ?? stageKey)
        setInput('')
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : '채팅 응답 생성에 실패했습니다.'
        )
      }
    })
  }, [activeExpert, isPending, projectId, stageKey])

  function submitMessage(message: string, forceImageGeneration?: ForceImageGeneration) {
    if (!message.trim()) {
      return
    }

    requestAssistantResponse({ forceImageGeneration, message })
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
    <div className="flex h-full min-h-0 flex-col bg-white">
      <section
        ref={messageScrollRef}
        className="min-h-0 flex-1 overflow-y-auto px-10 py-10"
      >
        <div className="mx-auto flex w-full max-w-[1150px] flex-col gap-5">
          {visibleMessages.length > 0 ? (
            visibleMessages.map((message) => (
              <ChatBubble
                key={message.id}
                message={message}
                disabled={isPending}
                onChoice={(value) => submitMessage(value)}
                onDownloadRfp={downloadRfp}
                userAvatarUrl={userAvatarUrl}
              />
            ))
          ) : (
            <div className="flex min-h-[420px] items-center justify-center text-sm font-medium text-zinc-400">
              {isPending
                ? activeExpertDefinition.loadingLabel
                : '첫 메시지를 입력하면 프로젝트 requirements 기반 대화가 시작됩니다.'}
            </div>
          )}

          {isPending ? (
            <div className="flex w-full max-w-[600px] flex-col items-start gap-3">
              <div className="rounded-[20px] bg-slate-200 px-9 py-7 outline outline-[3px] outline-offset-[-3px] outline-zinc-200">
                <p className="font-['Pretendard'] text-base font-medium leading-7 text-neutral-900">
                  {activeExpertDefinition.loadingLabel}
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <div className="shrink-0 px-10 pb-6 pt-2">
        {errorMessage ? (
          <p className="mb-3 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
            {errorMessage}
          </p>
        ) : null}

        <div className="mb-3 flex flex-wrap gap-2">
          {EXPERT_DEFINITIONS.map((expert) => {
            const isActive = expert.key === activeExpert

            return (
              <button
                key={expert.key}
                type="button"
                onClick={() => setActiveExpert(expert.key)}
                disabled={isPending}
                className={`rounded-full px-3 py-1.5 text-xs font-bold ring-1 transition disabled:cursor-not-allowed disabled:opacity-50 ${
                  isActive
                    ? expert.accentClassName
                    : 'bg-white text-zinc-500 ring-zinc-200 hover:text-zinc-900'
                }`}
              >
                {expert.label}
              </button>
            )
          })}
        </div>

        <form
          className="mx-auto flex h-16 w-full max-w-[1171px] items-center gap-4 overflow-hidden rounded-[20px] bg-white px-6 shadow-[0px_1px_5px_1px_rgba(0,0,0,0.25)] outline outline-2 outline-offset-[-2px] outline-stone-300"
          onSubmit={(event) => {
            event.preventDefault()
            submitMessage(input)
          }}
        >
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600">
            <div className="h-3.5 w-3.5 rounded-full bg-white" />
          </div>
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault()
                submitMessage(input)
              }
            }}
            placeholder={activeExpertDefinition.inputLabel}
            className="min-w-0 flex-1 bg-transparent font-['Pretendard'] text-sm font-medium leading-6 text-neutral-900 outline-none placeholder:text-stone-300"
          />
          <button
            type="submit"
            disabled={isPending || !input.trim()}
            aria-label="메시지 전송"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-stone-300 transition hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <span className="block h-5 w-5 rounded-full border-2 border-current" />
          </button>
        </form>
      </div>
    </div>
  )
}

function ChatBubble({
  disabled,
  message,
  onChoice,
  onDownloadRfp,
  userAvatarUrl,
}: {
  disabled: boolean
  message: ChatMessageRecord
  onChoice: (value: string) => void
  onDownloadRfp: () => void
  userAvatarUrl?: string | null
}) {
  const isUser = message.role === 'user'
  const rfpBlock = extractRfpJsonBlock(message.content)
  const cleanedContent = stripInternalBlocksForDisplay(rfpBlock.cleanedText)
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

  if (!displayContent && !message.generatedImageBlock?.images.length && !rfpBlock.rfp) {
    return null
  }

  if (isUser) {
    return (
      <article className="ml-auto flex w-full max-w-[600px] flex-col items-end">
        <div className="w-full rounded-[20px] bg-white px-9 py-7 outline outline-[3px] outline-offset-[-3px] outline-zinc-200">
          <p className="whitespace-pre-wrap font-['Pretendard'] text-base font-medium leading-7 text-neutral-900">
            {displayContent}
          </p>
        </div>
        <div className="mr-6 flex h-16 w-16 -translate-y-8 items-center justify-center overflow-hidden rounded-2xl bg-green-200 outline outline-4 outline-white">
          {userAvatarUrl ? (
            <Image
              src={userAvatarUrl}
              alt=""
              width={64}
              height={64}
              unoptimized
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="font-['Inter'] text-xl font-bold text-green-900">U</span>
          )}
        </div>
      </article>
    )
  }

  return (
    <article className="flex w-full max-w-[600px] flex-col items-start gap-3">
      <div className="w-full rounded-[20px] bg-slate-200 px-9 py-7 outline outline-[3px] outline-offset-[-3px] outline-zinc-200">
        {displayContent ? (
          <p className="whitespace-pre-wrap font-['Pretendard'] text-base font-medium leading-7 text-neutral-900">
            {displayContent}
          </p>
        ) : null}

        {message.generatedImageBlock?.images.length ? (
          <div className="mt-5 grid grid-cols-2 gap-3">
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
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {isStageProceedPrompt(displayContent) ? (
          <>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChoice('다음 단계로 진행할게요')}
              className="rounded-[30px] bg-blue-600 px-5 py-[3px] font-['Inter'] text-xs font-semibold leading-5 text-white disabled:opacity-50"
            >
              다음 단계로
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChoice('더 하고 싶은 말이 있어요')}
              className="rounded-[30px] bg-yellow-300 px-5 py-[3px] font-['Inter'] text-xs font-semibold leading-5 text-black disabled:opacity-50"
            >
              더 하고 싶은 말이 있어요
            </button>
          </>
        ) : null}

        {choices.length > 0 ? (
          <>
            <span className="rounded-[30px] bg-yellow-300 px-5 py-[3px] font-['Inter'] text-xs font-semibold leading-5 text-black">
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
            className="rounded-[30px] bg-blue-600 px-5 py-[3px] font-['Inter'] text-xs font-semibold leading-5 text-white disabled:opacity-50"
          >
            RFP 다운로드
          </button>
        ) : null}
      </div>
    </article>
  )
}
