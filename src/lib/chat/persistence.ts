import type { SupabaseClient } from '@supabase/supabase-js'

import type {
  ProjectContextRecord,
  ReferenceImageContextRecord,
} from '@/lib/chat/context'
import {
  extractGeneratedImagesBlock,
  type GeneratedImageBlock,
} from '@/lib/chat/image-blocks'
import { DEFAULT_STAGE_KEY, isKnownStageKey, type StageKey } from '@/lib/chat/stages'

export type ChatRole = 'assistant' | 'system' | 'user'

export type ChatMessageRecord = {
  content: string
  created_at: string | null
  generatedImageBlock: GeneratedImageBlock | null
  id: string
  role: ChatRole
  seq_order: number
  stageKey: StageKey
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
    .select('id, title, requirements')
    .eq('id', projectId)
    .eq('user_id', userId)
    .maybeSingle()

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

function getMessageStage(content: string) {
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

export function stripInternalBlocks(content: string) {
  return content
    .replace(/\n?<<AIDEE_STAGE>>[\s\S]*?<<\/AIDEE_STAGE>>/gi, '')
    .trim()
}

export function mapMessageRow(row: RawMessageRow): ChatMessageRecord {
  const { cleanedText, imageBlock } = extractGeneratedImagesBlock(
    stripInternalBlocks(row.content)
  )

  return {
    content: cleanedText,
    created_at: row.created_at,
    generatedImageBlock: imageBlock,
    id: row.id,
    role: ['assistant', 'system', 'user'].includes(row.role)
      ? (row.role as ChatRole)
      : 'user',
    seq_order: row.seq_order ?? 0,
    stageKey: getMessageStage(row.content),
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
  content,
  projectId,
  role,
  seqOrder,
  stageKey,
  supabase,
  userId,
}: {
  content: string
  projectId: string
  role: ChatRole
  seqOrder: number
  stageKey: StageKey
  supabase: SupabaseClient
  userId: string
}) {
  const payload = {
    content: appendStageBlock({ content, stageKey }),
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
