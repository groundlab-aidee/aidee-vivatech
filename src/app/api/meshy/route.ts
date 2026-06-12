import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

import {
  createImageTo3DTask,
  getMeshyTaskStatus,
} from '@/lib/chat/meshy'

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !key) {
    throw new Error('Supabase admin env vars missing')
  }

  return createClient(supabaseUrl, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

// POST /api/meshy
// body: { thumbnailUrl: string, projectId: string }
//    OR { imageBase64: string, mimeType?: string, projectId: string }  (fallback — thumbnail not yet saved)
// returns: { taskId: string }
export async function POST(request: Request) {
  let stage = 'parse_request'

  try {
    const { imageBase64, mimeType = 'image/png', projectId, thumbnailUrl: existingThumbnailUrl } =
      await request.json()

    if (typeof projectId !== 'string' || !projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
    }

    let thumbnailUrl: string

    if (typeof existingThumbnailUrl === 'string' && existingThumbnailUrl) {
      // Thumbnail already uploaded — skip re-upload
      thumbnailUrl = existingThumbnailUrl
    } else {
      if (typeof imageBase64 !== 'string' || !imageBase64) {
        return NextResponse.json(
          { error: 'Either thumbnailUrl or imageBase64 is required' },
          { status: 400 }
        )
      }

      const dataUrlMatch = imageBase64.match(/^data:([^;]+);base64,([\s\S]+)$/)
      if (!dataUrlMatch) {
        return NextResponse.json(
          { error: 'A valid base64 image data URL is required' },
          { status: 400 }
        )
      }

      const detectedMimeType = dataUrlMatch[1] || mimeType
      const buffer = Buffer.from(dataUrlMatch[2], 'base64')

      if (buffer.length === 0) {
        return NextResponse.json({ error: 'The image data is empty' }, { status: 400 })
      }

      const rawExtension = detectedMimeType.split('/')[1] ?? 'png'
      const extension = rawExtension === 'jpeg' ? 'jpg' : rawExtension
      const filePath = `projects/${projectId}/generated/thumbnails/${crypto.randomUUID()}.${extension}`

      stage = 'upload_image'
      const supabase = getSupabaseAdmin()
      const { error: uploadError } = await supabase.storage
        .from('project-reference-images')
        .upload(filePath, buffer, { contentType: detectedMimeType, upsert: false })

      if (uploadError) throw uploadError

      const { data: publicUrlData } = supabase.storage
        .from('project-reference-images')
        .getPublicUrl(filePath)

      if (!publicUrlData.publicUrl) throw new Error('Failed to create a public image URL')

      thumbnailUrl = publicUrlData.publicUrl
    }

    stage = 'create_meshy_task'
    const { result: taskId } = await createImageTo3DTask(thumbnailUrl)

    return NextResponse.json({ taskId })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[api/meshy] POST failed', { message, stage })
    return NextResponse.json({ error: message, stage }, { status: 500 })
  }
}

// GET /api/meshy?taskId=<id>
// returns: MeshyImageTo3DTask
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const taskId = searchParams.get('taskId')

    if (!taskId) {
      return NextResponse.json({ error: 'taskId is required' }, { status: 400 })
    }

    const task = await getMeshyTaskStatus(taskId)
    return NextResponse.json(task)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[api/meshy] GET failed', { message })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
