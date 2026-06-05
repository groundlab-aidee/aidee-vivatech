'use client'

import {
  createContext,
  useContext,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react'

export type AppShellHeaderState = {
  actions: ReactNode
  title: string
}

type AppShellHeaderContextValue = {
  header: AppShellHeaderState
  setHeader: Dispatch<SetStateAction<AppShellHeaderState>>
}

export const defaultAppShellHeader: AppShellHeaderState = {
  actions: null,
  title: '',
}

const AppShellHeaderContext = createContext<AppShellHeaderContextValue | null>(
  null
)

export function AppShellHeaderProvider({
  children,
  value,
}: {
  children: ReactNode
  value: AppShellHeaderContextValue
}) {
  return (
    <AppShellHeaderContext.Provider value={value}>
      {children}
    </AppShellHeaderContext.Provider>
  )
}

export function useAppShellHeader() {
  const context = useContext(AppShellHeaderContext)

  if (!context) {
    throw new Error('useAppShellHeader must be used inside AppShellHeaderProvider')
  }

  return context
}
