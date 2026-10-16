'use client'

import { useState } from 'react'

import { AgentNodeGraph } from '@/components/project/AgentNodeGraph'

export type AgentCustomizationTopic = {
  description: string
  keywords: string[]
  title: string
}

export type AgentCustomizationData = {
  name: string
  roleDescription: string
  topics: AgentCustomizationTopic[]
}

type AgentCustomizationModalProps = {
  agent: AgentCustomizationData
  initialSelections: Record<string, string[]>
  onClose: () => void
  onComplete: (selections: Record<string, string[]>) => void
}

export function AgentCustomizationModal({
  agent,
  initialSelections,
  onClose,
  onComplete,
}: AgentCustomizationModalProps) {
  const [selectedKeywords, setSelectedKeywords] = useState<
    Record<string, string[]>
  >(() =>
    Object.fromEntries(
      agent.topics.map((topic) => [
        topic.title,
        [...(initialSelections[topic.title] ?? [])],
      ])
    )
  )
  const canComplete =
    agent.topics.length === 4 &&
    agent.topics.every(
      (topic) => (selectedKeywords[topic.title] ?? []).length > 0
    )

  function toggleKeyword(topicTitle: string, keyword: string) {
    setSelectedKeywords((current) => {
      const topicKeywords = current[topicTitle] ?? []
      const nextTopicKeywords = topicKeywords.includes(keyword)
        ? topicKeywords.filter((item) => item !== keyword)
        : [...topicKeywords, keyword]

      return {
        ...current,
        [topicTitle]: nextTopicKeywords,
      }
    })
  }

  return (
    <div
      className="agent-customization-modal-backdrop fixed inset-0 z-50 flex items-center justify-center px-4"
      role="presentation"
      onClick={onClose}
    >
      <section
        aria-labelledby="agent-customization-modal-title"
        aria-modal="true"
        className="agent-customization-modal relative max-h-[90svh] w-full max-w-6xl overflow-y-auto rounded-lg border border-zinc-200 bg-white p-6 shadow-lg"
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          aria-label="닫기"
          className="agent-customization-modal__close absolute right-4 top-4"
          type="button"
          onClick={onClose}
        >
          ✕
        </button>

        <h2 id="agent-customization-modal-title">{agent.name}</h2>
        {agent.roleDescription ? <p>{agent.roleDescription}</p> : null}
        <p>
          에이전트에 어떤 분야의 경험과 전문지식을 담아낼지 직접 선택할 수
          있습니다. 아래 항목을 골라 해당 에이전트의 성격을 정해 주세요.
        </p>

        <div className="agent-customization-modal__body flex items-start gap-6 overflow-x-auto py-6">
          <div className="agent-customization-modal__topics flex min-w-0 flex-1 flex-col gap-6">
            {agent.topics.map((topic) => (
              <section key={topic.title} className="agent-customization-modal__topic flex flex-col gap-2">
                <h3>{topic.title}</h3>
                <p>{topic.description}</p>
                <div className="agent-customization-modal__keywords flex flex-wrap gap-2">
                  {topic.keywords.map((keyword) => {
                    const isSelected = (selectedKeywords[topic.title] ?? []).includes(
                      keyword
                    )

                    return (
                      <button
                        aria-pressed={isSelected}
                        className={`agent-customization-modal__keyword rounded-lg border px-3 py-2 ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50'
                            : 'border-zinc-200 bg-white'
                        }`}
                        data-selected={isSelected}
                        key={keyword}
                        type="button"
                        onClick={() => toggleKeyword(topic.title, keyword)}
                      >
                        {keyword}
                      </button>
                    )
                  })}
                </div>
              </section>
            ))}
          </div>
          <aside className="agent-customization-modal__graph shrink-0">
            <AgentNodeGraph
              agentName={agent.name}
              selectedKeywords={selectedKeywords}
            />
          </aside>
        </div>

        <div className="flex justify-center">
          <button
            type="button"
            className="agent-customization-modal__complete h-11 rounded-lg border border-zinc-200 bg-white px-8 shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!canComplete}
            onClick={() => onComplete(selectedKeywords)}
          >
            완료
          </button>
        </div>
      </section>
    </div>
  )
}
