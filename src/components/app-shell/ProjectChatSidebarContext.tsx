'use client'

import {
  createContext,
  useContext,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react'

import type { ExpertKey } from '@/lib/chat/experts'
import type { StageKey } from '@/lib/chat/stages'

export type ProjectChatSidebarState = {
  activeExpert: ExpertKey
  activeExperts: ExpertKey[]
  activeStageKey: StageKey
  areAgentsEnabled: boolean
  showAgents: boolean
  showProgress: boolean
}

export type ProjectAgentDebateState = {
  availableTokens: number
  isOpen: boolean
  open: () => void
}

export const defaultProjectChatSidebarState: ProjectChatSidebarState = {
  activeExpert: 'aidee',
  activeExperts: [],
  activeStageKey: 'step_0_start',
  areAgentsEnabled: false,
  showAgents: false,
  showProgress: false,
}

const ProjectChatSidebarContext = createContext<{
  debate: ProjectAgentDebateState
  setSidebarState: Dispatch<SetStateAction<ProjectChatSidebarState>>
  sidebarState: ProjectChatSidebarState
} | null>(null)

export function ProjectChatSidebarProvider({
  children,
  value,
}: {
  children: ReactNode
  value: {
    debate: ProjectAgentDebateState
    setSidebarState: Dispatch<SetStateAction<ProjectChatSidebarState>>
    sidebarState: ProjectChatSidebarState
  }
}) {
  return (
    <ProjectChatSidebarContext.Provider value={value}>
      {children}
    </ProjectChatSidebarContext.Provider>
  )
}

export function useProjectChatSidebar() {
  const context = useContext(ProjectChatSidebarContext)

  if (!context) {
    throw new Error(
      'useProjectChatSidebar must be used within ProjectChatSidebarProvider'
    )
  }

  return context
}
