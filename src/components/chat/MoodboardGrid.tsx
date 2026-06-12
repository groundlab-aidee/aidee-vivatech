'use client'

import Image from 'next/image'

export type MoodboardGridImage = {
  id: string
  is_selected: boolean
  photographer_name: string
  photographer_url: string
  thumb_url: string
  unsplash_page_url: string
  url: string
}

type Props = {
  images: MoodboardGridImage[]
  onOpenModal?: () => void
}

export function MoodboardGrid({ images, onOpenModal }: Props) {
  if (images.length === 0) return null

  return (
    <div className="mt-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="font-['Pretendard'] text-sm font-semibold text-zinc-700">
          무드보드
        </p>
        {onOpenModal ? (
          <button
            type="button"
            onClick={onOpenModal}
            className="font-['Pretendard'] text-xs text-blue-600 hover:underline"
          >
            전체 보기
          </button>
        ) : null}
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {images.slice(0, 12).map((img, i) => (
          <div key={img.id} className="flex flex-col gap-0.5">
            <div className="relative aspect-video w-full overflow-hidden rounded-md">
              <Image
                src={img.url}
                alt={`무드보드 ${i + 1}`}
                fill
                unoptimized
                className="object-cover"
              />
            </div>
            <p className="truncate font-['Inter'] text-[9px] leading-tight text-zinc-400">
              <a
                href={img.photographer_url + '?utm_source=aidee&utm_medium=referral'}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline"
              >
                {img.photographer_name}
              </a>{' '}
              /{' '}
              <a
                href={img.unsplash_page_url + '?utm_source=aidee&utm_medium=referral'}
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
    </div>
  )
}
