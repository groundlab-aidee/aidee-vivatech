import { NextResponse } from 'next/server'

export const maxDuration = 60

// Meshy serves GLB files from these hosts via signed URLs.
// model-viewer fetches the GLB client-side, which hits CORS on Meshy's CDN —
// so we proxy it through same-origin to avoid "Failed to fetch".
const ALLOWED_HOSTS = [
  'assets.meshy.ai',
  'asset.meshy.ai',
  'storage.meshy.ai',
  'meshy.ai',
]

function isAllowedHost(hostname: string) {
  return ALLOWED_HOSTS.some(
    (allowed) => hostname === allowed || hostname.endsWith(`.${allowed}`)
  )
}

// GET /api/meshy/model?url=<encoded glb url>
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const rawUrl = searchParams.get('url')

    if (!rawUrl) {
      return NextResponse.json({ error: 'url is required' }, { status: 400 })
    }

    let target: URL
    try {
      target = new URL(rawUrl)
    } catch {
      return NextResponse.json({ error: 'invalid url' }, { status: 400 })
    }

    if (target.protocol !== 'https:' || !isAllowedHost(target.hostname)) {
      return NextResponse.json({ error: 'url not allowed' }, { status: 403 })
    }

    const upstream = await fetch(target.toString(), {
      signal: AbortSignal.timeout(45_000),
    })

    if (!upstream.ok || !upstream.body) {
      return NextResponse.json(
        { error: `Upstream fetch failed: ${upstream.status}` },
        { status: 502 }
      )
    }

    const contentType =
      upstream.headers.get('content-type') || 'model/gltf-binary'

    return new NextResponse(upstream.body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[api/meshy/model] GET failed', { message })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
