import { NextRequest, NextResponse } from 'next/server'

import { insertProjectMessage } from '@/lib/chat/persistence'
import type { StageKey } from '@/lib/chat/stages'
import { createClient } from '@/lib/supabase/server'

type SaveMessageRequest = {
  projectId: string
  role: 'user' | 'assistant' | 'system'
  content: string
  seq_order: number
  stageKey: StageKey
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
    const { projectId, role, content, seq_order: seqOrder, stageKey } = body

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

    // Insert message using existing persistence function
    const message = await insertProjectMessage({
      content,
      projectId,
      role,
      seqOrder,
      stageKey,
      supabase,
      userId: user.id,
    })

    return NextResponse.json({ message })
  } catch (error) {
    console.error('[api/project/message] error:', error)
    return NextResponse.json(
      { error: 'Failed to save message' },
      { status: 500 }
    )
  }
}
