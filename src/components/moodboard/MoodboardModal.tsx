'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'

type MoodboardImage = {
  id: string
  photographer_name: string
  photographer_url: string
  thumb_url: string
  unsplash_page_url: string
  url: string
}

type Props = {
  isOpen: boolean
  onClose: () => void
  projectId: string
}

export function MoodboardModal({ isOpen, onClose, projectId }: Props) {
  const [images, setImages] = useState<MoodboardImage[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    setLoading(true)

    fetch(`/api/moodboard?projectId=${projectId}`)
      .then((r) => r.json())
      .then((data: { board?: MoodboardImage[] }) => {
        setImages(data.board ?? [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [isOpen, projectId])

  if (!isOpen) return null

  return (
    <div
      className="absolute inset-0 z-[80] flex items-center justify-center bg-neutral-900/70 p-4 sm:p-6 lg:p-10"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4">
          <h2 className="font-['Pretendard'] text-base font-bold text-zinc-900">
            무드보드
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto p-6">
          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <span className="font-['Pretendard'] text-sm text-zinc-400">
                불러오는 중...
              </span>
            </div>
          ) : images.length === 0 ? (
            <div className="flex h-40 items-center justify-center">
              <span className="font-['Pretendard'] text-sm text-zinc-400">
                무드보드 이미지가 없습니다.
              </span>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {images.map((img, i) => (
                <div key={img.id} className="flex flex-col gap-1">
                  <div className="relative aspect-video w-full overflow-hidden rounded-lg">
                    <Image
                      src={img.url}
                      alt={`무드보드 ${i + 1}`}
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  </div>
                  <p className="truncate font-['Inter'] text-[10px] text-zinc-400">
                    <a
                      href={
                        img.photographer_url +
                        '?utm_source=aidee&utm_medium=referral'
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline"
                    >
                      {img.photographer_name}
                    </a>{' '}
                    on{' '}
                    <a
                      href={
                        img.unsplash_page_url +
                        '?utm_source=aidee&utm_medium=referral'
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline"
                    >
                      Unsplash
                    </a>
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
