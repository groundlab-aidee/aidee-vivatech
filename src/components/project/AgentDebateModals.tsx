'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'

import type { ExpertKey } from '@/lib/chat/experts'

export const DEBATE_TOKEN_COST = 1

type DebateAgent = {
  icon: string
  key: Exclude<ExpertKey, 'aidee'>
  name: string
}

const DEBATE_AGENTS: DebateAgent[] = [
  { icon: '/assets/icons/chat/strategist.svg', key: 'planner', name: '기획전략가' },
  { icon: '/assets/icons/chat/designer.svg', key: 'style_designer', name: '디자이너' },
  { icon: '/assets/icons/chat/engineer.svg', key: 'engineer', name: '엔지니어' },
  { icon: '/assets/icons/chat/marketer.svg', key: 'marketer', name: '마케터' },
]

type DebateRemark = {
  agent: DebateAgent
  id: string
  text: string
}

export function AgentDebateModals({
  availableTokens,
  projectId,
  isConfirmOpen,
  isDebateOpen,
  onCloseConfirm,
  onEnd,
  onRefundToken,
  onStart,
}: {
  availableTokens: number
  projectId: string | null
  isConfirmOpen: boolean
  isDebateOpen: boolean
  onCloseConfirm: () => void
  onEnd: () => void
  onRefundToken: () => void
  onStart: () => void
}) {
  const [questionDraft, setQuestionDraft] = useState('')
  const [question, setQuestion] = useState('')
  const [remarks, setRemarks] = useState<DebateRemark[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationError, setGenerationError] = useState<string | null>(null)
  const remarksRef = useRef<HTMLDivElement | null>(null)
  const generationControllerRef = useRef<AbortController | null>(null)
  const hasRefundedTokenRef = useRef(false)
  const hasEnoughTokens = availableTokens >= DEBATE_TOKEN_COST

  useEffect(() => {
    if (!isConfirmOpen) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onCloseConfirm()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isConfirmOpen, onCloseConfirm])

  useEffect(() => {
    const container = remarksRef.current
    if (container) container.scrollTop = container.scrollHeight
  }, [remarks, isGenerating])

  function resetAndEnd() {
    generationControllerRef.current?.abort()
    generationControllerRef.current = null
    setQuestionDraft('')
    setQuestion('')
    setRemarks([])
    setIsGenerating(false)
    setGenerationError(null)
    hasRefundedTokenRef.current = false
    onEnd()
  }

  async function requestRemark(agent: DebateAgent) {
    if (!question || isGenerating) return

    const controller = new AbortController()
    generationControllerRef.current = controller
    setGenerationError(null)
    setIsGenerating(true)
    try {
      const response = await fetch('/api/debate', {
        body: JSON.stringify({
          agentName: agent.name,
          question,
          projectId,
          remarks: remarks.map((remark, index) => ({
            agentName: remark.agent.name,
            text: remark.text,
            turnNumber: index + 1,
          })),
          turnNumber: remarks.length + 1,
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
        signal: controller.signal,
      })
      const result = (await response.json().catch(() => null)) as {
        error?: string
        text?: string
      } | null

      if (!response.ok || !result?.text?.trim()) {
        throw new Error(result?.error || '토론 발언 생성에 실패했습니다.')
      }

      setRemarks((current) => [
        ...current,
        {
          agent,
          id: `${Date.now()}-${current.length}`,
          text: result.text!.trim(),
        },
      ])
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return

      setGenerationError(
        error instanceof Error
          ? error.message
          : '토론 발언 생성에 실패했습니다.'
      )
      if (remarks.length === 0 && !hasRefundedTokenRef.current) {
        hasRefundedTokenRef.current = true
        onRefundToken()
      }
    } finally {
      generationControllerRef.current = null
      setIsGenerating(false)
    }
  }

  return (
    <>
      {isConfirmOpen ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/30 px-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) onCloseConfirm()
          }}
        >
          <section
            aria-labelledby="agent-debate-confirm-title"
            aria-modal="true"
            className="relative w-full max-w-sm rounded-lg border border-zinc-200 bg-white p-6 shadow-lg"
            role="dialog"
          >
            <button
              aria-label="닫기"
              className="absolute right-4 top-4"
              onClick={onCloseConfirm}
              type="button"
            >
              ✕
            </button>
            <h2 className="pr-8 font-semibold" id="agent-debate-confirm-title">
              AI 에이전트 간 토론을 시작하시겠습니까?
            </h2>
            <p className="mt-3">토큰이 {DEBATE_TOKEN_COST} 차감됩니다.</p>
            {!hasEnoughTokens ? (
              <p className="mt-2 text-sm text-red-600">보유 토큰이 부족합니다.</p>
            ) : null}
            <button
              className="mt-6 h-11 w-full rounded-lg border border-zinc-200 bg-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!hasEnoughTokens}
              onClick={onStart}
              type="button"
            >
              토론 시작
            </button>
          </section>
        </div>
      ) : null}

      {isDebateOpen ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/30 px-4">
          <section
            aria-labelledby="agent-debate-title"
            aria-modal="true"
            className="flex shrink-0 flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white p-6 shadow-lg"
            role="dialog"
            style={{
              height: 'min(608px, 90svh)',
              width: 'min(900px, calc(100vw - 32px))',
            }}
          >
            <h2 className="font-semibold" id="agent-debate-title">에이전트 토론창</h2>
            <div className="mt-4 grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_220px] gap-4">
              <div className="flex min-h-0 flex-col rounded-lg border border-zinc-200 p-4">
                {question ? (
                  <div className="grid shrink-0 grid-cols-[auto_minmax(0,1fr)] items-start gap-2 border-b border-zinc-200 pb-3">
                    <span className="rounded border border-zinc-200 px-2 py-1 text-sm">질문</span>
                    <p className="whitespace-pre-wrap">{question}</p>
                  </div>
                ) : null}

                <div ref={remarksRef} className="min-h-0 flex-1 overflow-y-auto py-4">
                  {question ? (
                    <div className="flex flex-col gap-4">
                      {remarks.map((remark) => (
                        <article key={remark.id}>
                          <div className="flex items-center gap-2">
                            <Image src={remark.agent.icon} alt="" width={24} height={24} unoptimized />
                            <span>{remark.agent.name}</span>
                          </div>
                          <p className="mt-2 rounded-lg bg-zinc-100 p-3">{remark.text}</p>
                        </article>
                      ))}
                      {isGenerating ? <p>생각 중...</p> : null}
                      {generationError ? (
                        <p className="text-sm text-red-600">{generationError}</p>
                      ) : null}
                    </div>
                  ) : (
                    <div className="flex h-full items-center justify-center text-center">
                      <p>질문을 남기고, 토론을 시작할 에이전트를 오른쪽에서 선택해주세요.</p>
                    </div>
                  )}
                </div>

                {question ? (
                  <p className="shrink-0 border-t border-zinc-200 pt-3">
                    토론을 마치려면 [토론 종료]를 클릭해주세요. 토론 내용은 저장되지 않습니다.
                  </p>
                ) : (
                  <div className="shrink-0 border-t border-zinc-200 pt-3">
                    <p>질문은 토론 시작 전에 한 번만 입력할 수 있습니다. 하나의 주제에 집중해 질문해 주세요.</p>
                    <div className="mt-2 flex items-end gap-2 rounded-lg border border-zinc-200 p-3">
                      <textarea
                        className="min-h-20 min-w-0 flex-1 resize-none outline-none"
                        onChange={(event) => setQuestionDraft(event.target.value)}
                        placeholder="예) 이 제품에서는 가격과 디자인 중 무엇을 더 중요하게 봐야 할까요?"
                        value={questionDraft}
                      />
                      <button
                        className="h-11 shrink-0 rounded-lg border border-zinc-200 bg-white px-4 shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={!questionDraft.trim()}
                        onClick={() => setQuestion(questionDraft.trim())}
                        type="button"
                      >
                        질문 남기기
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <aside className="flex min-h-0 flex-col">
                <div className="flex flex-col gap-2">
                  {DEBATE_AGENTS.map((agent) => (
                    <button
                      className="flex h-11 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={!question || isGenerating}
                      key={agent.key}
                      onClick={() => void requestRemark(agent)}
                      type="button"
                    >
                      <Image src={agent.icon} alt="" width={24} height={24} unoptimized />
                      {agent.name}
                    </button>
                  ))}
                </div>
                <p className="mt-3">에이전트를 클릭하면 해당 에이전트가 발언합니다.</p>
                <p className="mt-1 text-sm text-zinc-500">프로젝트 대화가 쌓일수록 더 구체적이고 깊이 있는 토론이 가능합니다.</p>
                <button
                  className="mt-auto h-11 rounded-lg border border-zinc-200 bg-white shadow-sm"
                  onClick={resetAndEnd}
                  type="button"
                >
                  토론 종료
                </button>
              </aside>
            </div>
          </section>
        </div>
      ) : null}
    </>
  )
}
