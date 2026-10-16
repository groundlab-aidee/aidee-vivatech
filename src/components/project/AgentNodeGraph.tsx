'use client'

import { useEffect, useRef, useState } from 'react'

import {
  addKeyword,
  catCenter,
  CENTER_D,
  fitLabel,
  GRAPH_H,
  GRAPH_W,
  layoutAll,
  removeKeyword,
  SECTIONS,
  type GraphState,
  type SectionKey,
  type Selection,
} from '@/lib/chat/nodeGraphLayout'

type AgentNodeGraphProps = {
  agentName: string
  selectedKeywords: Record<string, string[]>
}

const SECTION_KEY_BY_TITLE: Record<string, SectionKey> = {
  '활동 영역': 'region',
  '전문 분야': 'field',
  '보유 기술': 'skill',
  '전문 직업': 'job',
}

const COLORS: Record<
  SectionKey | 'center',
  { background: string; foreground: string }
> = {
  center: { background: '#3f3f46', foreground: '#ffffff' },
  region: { background: '#2563eb', foreground: '#ffffff' },
  field: { background: '#0891b2', foreground: '#ffffff' },
  skill: { background: '#7c3aed', foreground: '#ffffff' },
  job: { background: '#ea580c', foreground: '#ffffff' },
}

function toSelection(selectedKeywords: Record<string, string[]>): Selection {
  const selection: Selection = { region: [], field: [], skill: [], job: [] }

  for (const [title, keywords] of Object.entries(selectedKeywords)) {
    const key = SECTION_KEY_BY_TITLE[title]
    if (!key) continue
    selection[key] = keywords.filter(
      (keyword): keyword is string => typeof keyword === 'string'
    )
  }

  return selection
}

function cloneState(state: GraphState): GraphState {
  return {
    region: state.region.map((node) => (node ? { ...node } : null)),
    field: state.field.map((node) => (node ? { ...node } : null)),
    skill: state.skill.map((node) => (node ? { ...node } : null)),
    job: state.job.map((node) => (node ? { ...node } : null)),
  }
}

function sameWords(a: string[], b: string[]) {
  return a.length === b.length && a.every((word, index) => word === b[index])
}

function getSingleChange(previous: Selection, next: Selection) {
  const changedKeys = SECTIONS.map((section) => section.key).filter(
    (key) => !sameWords(previous[key], next[key])
  )
  if (changedKeys.length !== 1) return null

  const key = changedKeys[0]
  const before = previous[key]
  const after = next[key]

  if (
    after.length === before.length + 1 &&
    before.every((word, index) => word === after[index])
  ) {
    return { key, kind: 'add' as const, label: after[after.length - 1] }
  }

  if (after.length === before.length - 1) {
    const removedIndex = before.findIndex((word, index) => word !== after[index])
    const index = removedIndex === -1 ? before.length - 1 : removedIndex
    const withoutRemoved = before.filter(
      (_, currentIndex) => currentIndex !== index
    )
    if (sameWords(withoutRemoved, after)) {
      return { key, kind: 'remove' as const, index }
    }
  }

  return null
}

export function AgentNodeGraph({
  agentName,
  selectedKeywords,
}: AgentNodeGraphProps) {
  const initialSelection = toSelection(selectedKeywords)
  const previousSelectionRef = useRef<Selection>(initialSelection)
  const [graphState, setGraphState] = useState<GraphState>(() =>
    layoutAll(initialSelection)
  )

  useEffect(() => {
    const nextSelection = toSelection(selectedKeywords)
    const change = getSingleChange(
      previousSelectionRef.current,
      nextSelection
    )

    // 외부 선택 상태를 새 그래프 상태로 반영한다.
    setGraphState((current) => {
      if (!change) return layoutAll(nextSelection)

      const next = cloneState(current)
      if (change.kind === 'add') {
        addKeyword(next, change.key, change.label)
      } else {
        removeKeyword(next, change.key, change.index)
      }
      return next
    })
    previousSelectionRef.current = nextSelection
  }, [selectedKeywords])

  return (
    <div
      aria-label={`${agentName} 노드 그래프`}
      className="agent-node-graph relative shrink-0 overflow-hidden border border-zinc-200 bg-zinc-50"
      role="img"
      style={{ height: GRAPH_H, width: GRAPH_W }}
    >
      {SECTIONS.flatMap((section) =>
        graphState[section.key].map((node) => {
          if (!node) return null
          const label = fitLabel(node.label, node.d)

          return (
            <div
              className="pointer-events-none absolute z-0 flex items-center justify-center rounded-full text-center font-medium transition-[left,top] duration-300"
              data-node-type="keyword"
              key={`${section.key}:${node.label}`}
              style={{
                backgroundColor: COLORS[section.key].background,
                color: COLORS[section.key].foreground,
                fontSize: label.fontSize,
                height: node.d,
                left: node.x - node.d / 2,
                lineHeight: 1.05,
                top: node.y - node.d / 2,
                width: node.d,
              }}
            >
              <span className="flex h-[70%] w-[70%] items-center justify-center overflow-hidden break-keep">
                <span>
                  {label.lines.map((line, index) => (
                    <span className="block" key={`${line}:${index}`}>
                      {line}
                    </span>
                  ))}
                </span>
              </span>
            </div>
          )
        })
      )}

      {SECTIONS.map((section) => {
        const center = catCenter(section)

        return (
          <div
            className="pointer-events-none absolute z-20 flex items-center justify-center rounded-full p-1 text-center font-medium"
            data-node-type="category"
            key={section.key}
            style={{
              backgroundColor: COLORS[section.key].background,
              color: COLORS[section.key].foreground,
              fontSize: 106 * 0.18,
              height: section.d,
              left: center.x - section.d / 2,
              lineHeight: 1.05,
              top: center.y - section.d / 2,
              width: section.d,
            }}
          >
            <span className="max-w-full break-keep">{section.title}</span>
          </div>
        )
      })}

      <div
        className="pointer-events-none absolute z-30 flex items-center justify-center rounded-full p-3 text-center font-semibold"
        style={{
          backgroundColor: COLORS.center.background,
          color: COLORS.center.foreground,
          height: CENTER_D,
          left: GRAPH_W / 2 - CENTER_D / 2,
          top: GRAPH_H / 2 - CENTER_D / 2,
          width: CENTER_D,
        }}
      >
        {agentName}
      </div>
    </div>
  )
}
