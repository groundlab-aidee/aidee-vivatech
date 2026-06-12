import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')

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

    // Verify project ownership
    const { data: project } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const { data: images, error } = await supabase
      .from('moodboard_images')
      .select(
        'id, phase, unsplash_id, url, thumb_url, photographer_name, photographer_url, unsplash_page_url, search_query, is_selected'
      )
      .eq('project_id', projectId)
      .order('created_at', { ascending: true })

    if (error) throw error

    const candidates = (images ?? []).filter((img) => img.phase === 'candidate')
    const board = (images ?? []).filter((img) => img.phase === 'board')

    return NextResponse.json({ board, candidates })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
