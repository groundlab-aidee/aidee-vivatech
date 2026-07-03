export type ChatLanguage = 'ENG' | 'KOR'

export const DEFAULT_CHAT_LANGUAGE: ChatLanguage = 'KOR'

export function normalizeChatLanguage(value: unknown): ChatLanguage {
  return value === 'ENG' ? 'ENG' : DEFAULT_CHAT_LANGUAGE
}

export function isEnglishChat(language: ChatLanguage) {
  return language === 'ENG'
}
