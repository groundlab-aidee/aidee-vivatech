import type { ChatLanguage } from '@/lib/chat/language'
import type { ChatIntent, LegacyStageKey } from '@/lib/chat/structured-response'
import { STEP_0_1_PROMPT_EN } from './en'
import { STEP_0_1_PROMPT_KO } from './ko'

export function buildStepZeroOnePrompt({
  clientIntent,
  currentStage,
  language,
  projectContext,
}: {
  clientIntent: ChatIntent | null
  currentStage: LegacyStageKey
  language: ChatLanguage
  projectContext: string
}) {
  const languagePrompt = language === 'ENG'
    ? STEP_0_1_PROMPT_EN
    : STEP_0_1_PROMPT_KO

  return `${languagePrompt}

[CURRENT_STAGE]
${currentStage === 'step_0_start' ? 'STEP_0_START' : 'STEP_1_IDEA'}

[CLIENT_INTENT]
${clientIntent ?? 'NONE'}

[PROJECT_CONTEXT]
${projectContext}`.trim()
}
