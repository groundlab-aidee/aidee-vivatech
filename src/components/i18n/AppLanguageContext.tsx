'use client'

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from 'react'

export type AppLanguage = 'ENG' | 'KOR'

const LANGUAGE_STORAGE_KEY = 'aidee:language'
const LANGUAGE_CHANGE_EVENT = 'aidee:language-change'
let memoryLanguage: AppLanguage = 'KOR'

type AppLanguageContextValue = {
  language: AppLanguage
  setLanguage: (language: AppLanguage) => void
}

const AppLanguageContext = createContext<AppLanguageContextValue | null>(null)

function getLanguageSnapshot(): AppLanguage {
  try {
    const savedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY)
    memoryLanguage = savedLanguage === 'ENG' ? 'ENG' : 'KOR'
    return memoryLanguage
  } catch {
    return memoryLanguage
  }
}

function subscribeToLanguage(onStoreChange: () => void) {
  window.addEventListener('storage', onStoreChange)
  window.addEventListener(LANGUAGE_CHANGE_EVENT, onStoreChange)

  return () => {
    window.removeEventListener('storage', onStoreChange)
    window.removeEventListener(LANGUAGE_CHANGE_EVENT, onStoreChange)
  }
}

function getServerLanguageSnapshot(): AppLanguage {
  return 'KOR'
}

export function AppLanguageProvider({ children }: { children: ReactNode }) {
  const language = useSyncExternalStore(
    subscribeToLanguage,
    getLanguageSnapshot,
    getServerLanguageSnapshot
  )
  const value = useMemo<AppLanguageContextValue>(
    () => ({
      language,
      setLanguage(nextLanguage) {
        memoryLanguage = nextLanguage
        try {
          window.localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage)
        } catch {
          // Continue with the current tab when browser storage is unavailable.
        }
        window.dispatchEvent(new Event(LANGUAGE_CHANGE_EVENT))
      },
    }),
    [language]
  )

  useEffect(() => {
    document.documentElement.lang = language === 'ENG' ? 'en' : 'ko'
  }, [language])

  return (
    <AppLanguageContext.Provider value={value}>
      {children}
    </AppLanguageContext.Provider>
  )
}

export function useAppLanguage() {
  const context = useContext(AppLanguageContext)

  if (!context) {
    throw new Error('useAppLanguage must be used within AppLanguageProvider')
  }

  return context
}
