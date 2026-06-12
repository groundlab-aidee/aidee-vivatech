import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !key) {
    throw new Error('Supabase admin env vars missing')
  }

  return createAdminClient(supabaseUrl, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

// POST /api/projects/thumbnail
// body: { imageBase64: string, projectId: string }
// returns: { thumbnailUrl: string }
export async function POST(request: Request) {
  try {
    const { imageBase64, projectId } = await request.json()

    if (typeof imageBase64 !== 'string' || !imageBase64) {
      return NextResponse.json({ error: 'imageBase64 is required' }, { status: 400 })
    }

    if (typeof projectId !== 'string' || !projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, requirements')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const dataUrlMatch = imageBase64.match(/^data:([^;]+);base64,([\s\S]+)$/)
    if (!dataUrlMatch) {
      return NextResponse.json({ error: 'Invalid base64 image' }, { status: 400 })
    }

    const mimeType = dataUrlMatch[1]
    const buffer = Buffer.from(dataUrlMatch[2], 'base64')
    const rawExt = mimeType.split('/')[1] ?? 'png'
    const extension = rawExt === 'jpeg' ? 'jpg' : rawExt
    const filePath = `projects/${projectId}/generated/thumbnails/${crypto.randomUUID()}.${extension}`

    const admin = getSupabaseAdmin()
    const { error: uploadError } = await admin.storage
      .from('project-reference-images')
      .upload(filePath, buffer, { contentType: mimeType, upsert: false })

    if (uploadError) {
      throw uploadError
    }

    const { data: publicUrlData } = admin.storage
      .from('project-reference-images')
      .getPublicUrl(filePath)

    const thumbnailUrl = publicUrlData.publicUrl

    const requirements =
      project.requirements && typeof project.requirements === 'object' && !Array.isArray(project.requirements)
        ? (project.requirements as Record<string, unknown>)
        : {}

    const { error: updateError } = await supabase
      .from('projects')
      .update({
        requirements: {
          ...requirements,
          thumbnail_image_url: thumbnailUrl,
          thumbnail_image_source: 'generated',
        },
      })
      .eq('id', projectId)

    if (updateError) {
      throw updateError
    }

    return NextResponse.json({ thumbnailUrl })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[api/projects/thumbnail] POST failed', { message })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
