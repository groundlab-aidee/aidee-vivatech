import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'

type FavoriteRequestBody = {
  isFavorite?: unknown
  projectId?: unknown
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as FavoriteRequestBody | null
  const projectId = typeof body?.projectId === 'string' ? body.projectId : ''
  const isFavorite = body?.isFavorite === true

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

  const { data, error } = await supabase
    .from('projects')
    .update({ is_favorite: isFavorite })
    .eq('id', projectId)
    .eq('user_id', user.id)
    .select('id, is_favorite')
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  return NextResponse.json({
    isFavorite: data.is_favorite === true,
    projectId: data.id,
  })
}
