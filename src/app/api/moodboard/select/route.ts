import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import { getGeminiApiKey } from '@/lib/chat/gemini'
import {
  generateUnsplashSearchQuery,
  getUnsplashAccessKey,
  searchUnsplashPhotos,
  triggerUnsplashDownload,
} from '@/lib/chat/unsplash'

type SelectBody = {
  projectId?: unknown
  unsplashId?: unknown
  searchQuery?: unknown
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SelectBody
    const projectId = typeof body.projectId === 'string' ? body.projectId : ''
    const unsplashId = typeof body.unsplashId === 'string' ? body.unsplashId : ''
    const prevSearchQuery =
      typeof body.searchQuery === 'string' ? body.searchQuery : ''

    if (!projectId || !unsplashId) {
      return NextResponse.json(
        { error: 'projectId and unsplashId are required' },
        { status: 400 }
      )
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

    const unsplashKey = getUnsplashAccessKey()
    const geminiApiKey = getGeminiApiKey() ?? ''

    // Mark selected candidate
    await supabase
      .from('moodboard_images')
      .update({ is_selected: true })
      .eq('project_id', projectId)
      .eq('unsplash_id', unsplashId)

    // Unsplash download trigger (policy required)
    if (unsplashKey) {
      await triggerUnsplashDownload({ accessKey: unsplashKey, photoId: unsplashId })
    }

    // Generate refined search query for board
    const boardQuery = geminiApiKey
      ? await generateUnsplashSearchQuery({
          apiKey: geminiApiKey,
          conversation: `Selected style image. Previous search: "${prevSearchQuery}". Generate a related but slightly varied search query for a full mood board of 12 images with similar style.`,
        })
      : prevSearchQuery || 'minimal product design aesthetic'

    // Fetch 12 board images
    let boardImages: Awaited<ReturnType<typeof searchUnsplashPhotos>> = []
    if (unsplashKey) {
      boardImages = await searchUnsplashPhotos({
        accessKey: unsplashKey,
        query: boardQuery,
        perPage: 12,
      }).catch(() => [])
    }

    if (boardImages.length === 0) {
      return NextResponse.json({ error: 'No images found for board' }, { status: 422 })
    }

    // Delete any existing board images for this project before inserting new ones
    await supabase
      .from('moodboard_images')
      .delete()
      .eq('project_id', projectId)
      .eq('phase', 'board')

    const { data: inserted, error: insertError } = await supabase
      .from('moodboard_images')
      .insert(
        boardImages.map((img) => ({
          is_selected: false,
          phase: 'board',
          photographer_name: img.photographer_name,
          photographer_url: img.photographer_url,
          project_id: projectId,
          search_query: boardQuery,
          thumb_url: img.thumb_url,
          unsplash_id: img.id,
          unsplash_page_url: img.unsplash_page_url,
          url: img.url,
        }))
      )
      .select(
        'id, phase, unsplash_id, url, thumb_url, photographer_name, photographer_url, unsplash_page_url, search_query, is_selected'
      )

    if (insertError) throw insertError

    return NextResponse.json({ board: inserted ?? [] })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
