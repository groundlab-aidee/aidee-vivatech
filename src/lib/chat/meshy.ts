export type MeshyTaskStatus =
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'EXPIRED'

export type MeshyImageTo3DTask = {
  id: string
  status: MeshyTaskStatus
  progress: number
  model_urls?: {
    glb?: string
    fbx?: string
    obj?: string
    mtl?: string
    usdz?: string
  }
  thumbnail_url?: string
  texture_urls?: Array<{ base_color?: string }>
}

export async function createImageTo3DTask(
  imageUrl: string
): Promise<{ result: string }> {
  const apiKey = process.env.MESHY_API_KEY
  if (!apiKey) throw new Error('MESHY_API_KEY not configured')

  const res = await fetch('https://api.meshy.ai/openapi/v2/image-to-3d', {
    signal: AbortSignal.timeout(45_000),
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      image_url: imageUrl,
      enable_pbr: true,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Meshy API error ${res.status}: ${err}`)
  }

  return res.json()
}

export async function getMeshyTaskStatus(
  taskId: string
): Promise<MeshyImageTo3DTask> {
  const apiKey = process.env.MESHY_API_KEY
  if (!apiKey) throw new Error('MESHY_API_KEY not configured')

  const res = await fetch(
    `https://api.meshy.ai/openapi/v2/image-to-3d/${taskId}`,
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      signal: AbortSignal.timeout(15_000),
    }
  )

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Meshy API error ${res.status}: ${err}`)
  }

  return res.json()
}
