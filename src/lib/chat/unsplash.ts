export type UnsplashImageMeta = {
  id: string
  url: string
  thumb_url: string
  photographer_name: string
  photographer_url: string
  unsplash_page_url: string
}

export function getUnsplashAccessKey() {
  return process.env.UNSPLASH_ACCESS_KEY ?? ''
}

export async function searchUnsplashPhotos({
  accessKey,
  query,
  perPage = 3,
  orientation = 'landscape',
}: {
  accessKey: string
  query: string
  perPage?: number
  orientation?: 'landscape' | 'portrait' | 'squarish'
}): Promise<UnsplashImageMeta[]> {
  const url = new URL('https://api.unsplash.com/search/photos')
  url.searchParams.set('query', query)
  url.searchParams.set('per_page', String(perPage))
  url.searchParams.set('orientation', orientation)
  url.searchParams.set('client_id', accessKey)

  const res = await fetch(url.toString())
  if (!res.ok) throw new Error(`Unsplash search failed: ${res.status}`)

  const data = (await res.json()) as {
    results: Array<{
      id: string
      urls: { regular: string; thumb: string }
      user: { name: string; links: { html: string } }
      links: { html: string }
    }>
  }

  return (data.results ?? []).map((r) => ({
    id: r.id,
    url: r.urls.regular,
    thumb_url: r.urls.thumb,
    photographer_name: r.user.name,
    photographer_url: r.user.links.html,
    unsplash_page_url: r.links.html,
  }))
}

export async function triggerUnsplashDownload({
  accessKey,
  photoId,
}: {
  accessKey: string
  photoId: string
}) {
  // Required by Unsplash API guidelines when an image is actually used
  await fetch(
    `https://api.unsplash.com/photos/${photoId}/download?client_id=${accessKey}`
  ).catch(() => {})
}

export async function generateUnsplashSearchQuery({
  apiKey,
  conversation,
}: {
  apiKey: string
  conversation: string
}): Promise<string> {
  // Prefer mood selection (most specific), fall back to keyword selection, then full conversation
  const moodMatch = conversation.match(
    /스타일\s*분위기를\s*선택했어요\s*[:：]?\s*([\s\S]{10,400})/i
  )
  const keywordMatch = conversation.match(
    /스타일\s*키워드를\s*선택했습니다[.\n]*([\s\S]{20,400})/i
  )
  const context = moodMatch
    ? `Selected style mood:\n${moodMatch[1].slice(0, 400)}`
    : keywordMatch
      ? `Selected style keywords:\n${keywordMatch[1].slice(0, 400)}`
      : `Conversation:\n${conversation.slice(0, 2000)}`

  const prompt = [
    'Translate the following Korean product design style description into a concise English Unsplash image search query (max 6 words).',
    'Focus on emotion, color, texture, and structure to describe a product design mood.',
    'Output ONLY the search query — no explanation, no quotes, no punctuation.',
    '',
    context,
  ].join('\n')

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }], role: 'user' }],
      }),
    }
  )

  if (!res.ok) return 'minimal elegant product design'

  const data = (await res.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> }
    }>
  }
  const text =
    data?.candidates?.[0]?.content?.parts?.[0]?.text ??
    'minimal elegant product design'

  return text.trim().replace(/^["']|["']$/g, '').slice(0, 100)
}
