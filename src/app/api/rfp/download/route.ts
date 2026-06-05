import { NextResponse } from 'next/server'

import { extractRfpJsonBlock, formatRfpMarkdown } from '@/lib/chat/rfp'
import { createClient } from '@/lib/supabase/server'

type RfpDownloadBody = {
  projectId?: unknown
}

function sanitizeFileName(value: string) {
  return value
    .replace(/[^\w가-힣.-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80)
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RfpDownloadBody
    const projectId = typeof body.projectId === 'string' ? body.projectId : ''

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, title')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (projectError) {
      throw projectError
    }

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const { data: messages, error: messageError } = await supabase
      .from('messages')
      .select('content')
      .eq('project_id', projectId)
      .eq('role', 'assistant')
      .order('seq_order', { ascending: false })
      .limit(20)

    if (messageError) {
      throw messageError
    }

    const rfp = (messages ?? [])
      .map((message) => extractRfpJsonBlock(message.content).rfp)
      .find(Boolean)

    if (!rfp) {
      return NextResponse.json({ error: 'RFP document not found' }, { status: 404 })
    }

    const markdown = formatRfpMarkdown(rfp)
    const fileName = sanitizeFileName(`${project.title || 'aidee-rfp'}.md`)

    return new Response(markdown, {
      headers: {
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Type': 'text/markdown; charset=utf-8',
      },
    })
  } catch (error) {
    console.error('RFP download error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'RFP download error' },
      { status: 500 }
    )
  }
}
