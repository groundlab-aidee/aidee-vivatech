import type { SupabaseClient } from '@supabase/supabase-js'

import type {
  ProjectContextRecord,
  ReferenceImageContextRecord,
} from '@/lib/chat/context'
import {
  extractGeneratedImagesBlock,
  type GeneratedImageBlock,
} from '@/lib/chat/image-blocks'
import {
  extractPersonaCardBlock,
  type PersonaCardData,
} from '@/lib/chat/persona-card'
import {
  DEFAULT_STAGE_KEY,
  isKnownStageKey,
  type ChatAction,
  type StageKey,
} from '@/lib/chat/stages'

export type ChatRole = 'assistant' | 'system' | 'user'

export type ChatMessageRecord = {
  action?: ChatAction | null
  availableActions?: ChatAction[]
  content: string
  created_at: string | null
  generatedImageBlock: GeneratedImageBlock | null
  id: string
  personaCardBlock: PersonaCardData | null
  role: ChatRole
  seq_order: number
  stageKey: StageKey
  step1Completed?: boolean
}

type RawMessageRow = {
  content: string
  created_at: string | null
  id: string
  role: string
  seq_order: number | null
}

export async function getProjectForUser({
  projectId,
  supabase,
  userId,
}: {
  projectId: string
  supabase: SupabaseClient
  userId: string
}) {
  const { data, error } = await supabase
    .from('projects')
    .select('id, title, requirements, is_favorite')
    .eq('id', projectId)
    .eq('user_id', userId)
    .maybeSingle()

  if (
    error?.code === 'PGRST204' ||
    (error?.code === '42703' && /is_favorite/i.test(error.message))
  ) {
    const { data: fallbackData, error: fallbackError } = await supabase
      .from('projects')
      .select('id, title, requirements')
      .eq('id', projectId)
      .eq('user_id', userId)
      .maybeSingle()

    if (fallbackError) {
      throw fallbackError
    }

    return (fallbackData ?? null) as ProjectContextRecord | null
  }

  if (error) {
    throw error
  }

  return (data ?? null) as ProjectContextRecord | null
}

export async function getReferenceImages({
  projectId,
  supabase,
}: {
  projectId: string
  supabase: SupabaseClient
}) {
  const { data, error } = await supabase
    .from('project_reference_images')
    .select('file_name, image_url, analysis_status, analysis_text, analysis_json')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true })

  if (error) {
    console.warn('[chat] failed to load reference images; continuing without them.', {
      code: error.code,
      message: error.message,
    })
    return []
  }

  return (data ?? []) as ReferenceImageContextRecord[]
}

export function getMessageStage(content: string) {
  const match = content.match(/<<AIDEE_STAGE>>\s*([\s\S]*?)\s*<<\/AIDEE_STAGE>>/i)

  if (!match) {
    return DEFAULT_STAGE_KEY
  }

  try {
    const parsed = JSON.parse(match[1]) as { stageKey?: unknown }
    return isKnownStageKey(parsed.stageKey) ? parsed.stageKey : DEFAULT_STAGE_KEY
  } catch {
    return DEFAULT_STAGE_KEY
  }
}

export function appendStageBlock({
  content,
  stageKey,
}: {
  content: string
  stageKey: StageKey
}) {
  return `${content}

<<AIDEE_STAGE>>
${JSON.stringify({ stageKey })}
<</AIDEE_STAGE>>`
}

const CHAT_ACTIONS: ChatAction[] = [
  'confirm_artifact',
  'confirm_step_2_team',
  'confirm_process',
  'confirm_moodboard',
  'visualize_artifact',
  'confirm_form_design_summary',
  'start_step_2',
  'start_step_3',
  'stay_in_step_1',
  'stay_in_step_2',
  'select_step5_shape',
  'select_step5_form',
]

function isChatAction(value: unknown): value is ChatAction {
  return typeof value === 'string' && CHAT_ACTIONS.includes(value as ChatAction)
}

function getMessageAction(content: string) {
  const match = content.match(/<<AIDEE_ACTION>>\s*([\s\S]*?)\s*<<\/AIDEE_ACTION>>/i)

  if (!match) {
    return null
  }

  try {
    const parsed = JSON.parse(match[1]) as { action?: unknown }
    return isChatAction(parsed.action) ? parsed.action : null
  } catch {
    return null
  }
}

function getAvailableActions(content: string) {
  const match = content.match(
    /<<AIDEE_AVAILABLE_ACTIONS>>\s*([\s\S]*?)\s*<<\/AIDEE_AVAILABLE_ACTIONS>>/i
  )

  if (!match) {
    return []
  }

  try {
    const parsed = JSON.parse(match[1]) as { actions?: unknown }
    return Array.isArray(parsed.actions)
      ? parsed.actions.filter(isChatAction)
      : []
  } catch {
    return []
  }
}

function appendInteractionBlocks({
  action,
  availableActions,
  content,
}: {
  action?: ChatAction | null
  availableActions?: ChatAction[]
  content: string
}) {
  const blocks = [content]

  if (action) {
    blocks.push(
      `<<AIDEE_ACTION>>\n${JSON.stringify({ action })}\n<</AIDEE_ACTION>>`
    )
  }

  if (availableActions?.length) {
    blocks.push(
      `<<AIDEE_AVAILABLE_ACTIONS>>\n${JSON.stringify({ actions: availableActions })}\n<</AIDEE_AVAILABLE_ACTIONS>>`
    )
  }

  return blocks.join('\n\n')
}

export function stripInternalBlocks(content: string) {
  return content
    .replace(/\n?<<AIDEE_STAGE>>[\s\S]*?<<\/AIDEE_STAGE>>/gi, '')
    .replace(/\n?<<AIDEE_ACTION>>[\s\S]*?<<\/AIDEE_ACTION>>/gi, '')
    .replace(
      /\n?<<AIDEE_AVAILABLE_ACTIONS>>[\s\S]*?<<\/AIDEE_AVAILABLE_ACTIONS>>/gi,
      ''
    )
    .replace(/\n?<<AIDEE_STEP_1_COMPLETE>>/gi, '')
    .replace(/\n?<<AIDEE_MESSAGE_BREAK>>/gi, '')
    .replace(
      /^(?:\s*(?:#{1,6}\s*)?(?:\*{1,2}|_{1,2})?\s*(?:PILOT\s*:\s*\[[^\]\n]+\]|\[\s*PILOT\s*:\s*[^\]\n]+\])\s*(?:\*{1,2}|_{1,2})?\s*\n?)+/i,
      ''
    )
    .trim()
}

export function isStep1CompletionContent(content: string) {
  return (
    /<<AIDEE_STEP_1_COMPLETE>>/i.test(content) ||
    /전체\s*개발\s*프로세스를\s*함께\s*확인해볼까요[?？]?/i.test(content)
  )
}

export function mapMessageRow(row: RawMessageRow): ChatMessageRecord {
  const { cleanedText, imageBlock } = extractGeneratedImagesBlock(
    stripInternalBlocks(row.content)
  )
  const { cleanedText: visibleText, personaCardBlock } =
    extractPersonaCardBlock(cleanedText)

  return {
    action: getMessageAction(row.content),
    availableActions: getAvailableActions(row.content),
    content: visibleText,
    created_at: row.created_at,
    generatedImageBlock: imageBlock,
    id: row.id,
    personaCardBlock,
    role: ['assistant', 'system', 'user'].includes(row.role)
      ? (row.role as ChatRole)
      : 'user',
    seq_order: row.seq_order ?? 0,
    stageKey: getMessageStage(row.content),
    step1Completed:
      getMessageStage(row.content) === 'step_1_idea' &&
      isStep1CompletionContent(row.content),
  }
}

export async function getProjectMessages({
  projectId,
  supabase,
}: {
  projectId: string
  supabase: SupabaseClient
}) {
  const { data, error } = await supabase
    .from('messages')
    .select('id, role, content, seq_order, created_at')
    .eq('project_id', projectId)
    .order('seq_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) {
    throw error
  }

  return ((data ?? []) as RawMessageRow[]).map(mapMessageRow)
}

export async function insertProjectMessage({
  action,
  availableActions,
  content,
  projectId,
  role,
  seqOrder,
  stageKey,
  supabase,
  userId,
}: {
  action?: ChatAction | null
  availableActions?: ChatAction[]
  content: string
  projectId: string
  role: ChatRole
  seqOrder: number
  stageKey: StageKey
  supabase: SupabaseClient
  userId: string
}) {
  const payload = {
    content: appendStageBlock({
      content: appendInteractionBlocks({ action, availableActions, content }),
      stageKey,
    }),
    project_id: projectId,
    role,
    seq_order: seqOrder,
  }
  const { data, error } = await supabase
    .from('messages')
    .insert({
      ...payload,
      user_id: userId,
    })
    .select('id, role, content, seq_order, created_at')
    .single()

  if (
    error &&
    error.code === 'PGRST204' &&
    /'user_id' column of 'messages'/i.test(error.message)
  ) {
    const { data: retryData, error: retryError } = await supabase
      .from('messages')
      .insert(payload)
      .select('id, role, content, seq_order, created_at')
      .single()

    if (retryError) {
      throw retryError
    }

    return mapMessageRow(retryData as RawMessageRow)
  }

  if (error) {
    throw error
  }

  return mapMessageRow(data as RawMessageRow)
}
