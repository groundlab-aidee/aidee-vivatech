'use client'

import Image from 'next/image'
import { useState } from 'react'

import type { UnsplashImageMeta } from '@/lib/chat/image-blocks'

type MoodboardBoardImage = UnsplashImageMeta & {
  id: string
  is_selected: boolean
}

type Props = {
  candidates: UnsplashImageMeta[]
  disabled?: boolean
  projectId: string
  searchQuery: string
  onBoardReady: (images: MoodboardBoardImage[]) => void
}

export function MoodboardCandidates({
  candidates,
  disabled,
  onBoardReady,
  projectId,
  searchQuery,
}: Props) {
  const [selecting, setSelecting] = useState<string | null>(null)

  async function handleSelect(img: UnsplashImageMeta) {
    if (selecting) return
    setSelecting(img.id)

    try {
      const res = await fetch('/api/moodboard/select', {
        body: JSON.stringify({ projectId, searchQuery, unsplashId: img.id }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })

      if (!res.ok) throw new Error('무드보드 생성 실패')
      const data = (await res.json()) as { board: MoodboardBoardImage[] }
      onBoardReady(data.board)
    } catch {
      setSelecting(null)
    }
  }

  return (
    <div className="mt-4 flex flex-col gap-3">
      <p className="font-['Pretendard'] text-sm font-semibold text-zinc-700">
        스타일 레퍼런스 후보 3장 — 하나를 선택하면 무드보드가 생성됩니다.
      </p>
      <div className="grid grid-cols-3 gap-2">
        {candidates.map((img, i) => (
          <div key={img.id} className="flex flex-col gap-1">
            <div className="relative aspect-video w-full overflow-hidden rounded-lg">
              <Image
                src={img.url}
                alt={`스타일 레퍼런스 ${i + 1}`}
                fill
                unoptimized
                className="object-cover"
              />
            </div>
            <p className="truncate font-['Inter'] text-[10px] text-zinc-400">
              <a
                href={img.photographer_url + '?utm_source=aidee&utm_medium=referral'}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline"
              >
                {img.photographer_name}
              </a>{' '}
              on{' '}
              <a
                href={img.unsplash_page_url + '?utm_source=aidee&utm_medium=referral'}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline"
              >
                Unsplash
              </a>
            </p>
            <button
              type="button"
              disabled={disabled || selecting !== null}
              onClick={() => void handleSelect(img)}
              className="rounded-full bg-zinc-900 px-3 py-1 font-['Pretendard'] text-xs font-semibold text-white transition hover:bg-zinc-700 disabled:opacity-50"
            >
              {selecting === img.id ? '생성 중...' : `${i + 1}번 선택`}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
