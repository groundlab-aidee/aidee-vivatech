import { NextRequest, NextResponse } from 'next/server'

import { appendGeneratedImagesBlock, type GeneratedImageBlock } from '@/lib/chat/image-blocks'
import { insertProjectMessage } from '@/lib/chat/persistence'
import type { StageKey } from '@/lib/chat/stages'
import { createClient } from '@/lib/supabase/server'

type SaveMessageRequest = {
  projectId: string
  role: 'user' | 'assistant' | 'system'
  content: string
  seq_order: number
  stageKey: StageKey
  generatedImageBlock?: GeneratedImageBlock | null
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json()) as SaveMessageRequest
    const { projectId, role, content, seq_order: seqOrder, stageKey, generatedImageBlock } = body

    console.log('[api/project/message] Received:', {
      projectId,
      role,
      seqOrder,
      hasContent: !!content,
      hasImageBlock: !!generatedImageBlock,
    })

    // Verify project ownership
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Append generated image block to content if provided
    let finalContent = content
    if (generatedImageBlock) {
      finalContent = appendGeneratedImagesBlock({
        payload: generatedImageBlock,
        text: content,
      })
    }

    // Insert message using existing persistence function
    const message = await insertProjectMessage({
      content: finalContent,
      projectId,
      role,
      seqOrder,
      stageKey,
      supabase,
      userId: user.id,
    })

    console.log('[api/project/message] Message saved:', message?.id)
    return NextResponse.json({ message })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('[api/project/message] error:', {
      message: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    })
    return NextResponse.json(
      { error: errorMessage || 'Failed to save message' },
      { status: 500 }
    )
  }
}
