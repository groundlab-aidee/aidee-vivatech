'use client'

import Image from 'next/image'
import { useState } from 'react'

type ProjectFavoriteButtonProps = {
  className?: string
  initialIsFavorite?: boolean
  projectId: string
}

export function ProjectFavoriteButton({
  className = '',
  initialIsFavorite = false,
  projectId,
}: ProjectFavoriteButtonProps) {
  const [isFavorite, setIsFavorite] = useState(initialIsFavorite)
  const [isPending, setIsPending] = useState(false)

  async function toggleFavorite() {
    const nextValue = !isFavorite
    setIsFavorite(nextValue)
    setIsPending(true)

    try {
      const response = await fetch('/api/projects/favorite', {
        body: JSON.stringify({
          isFavorite: nextValue,
          projectId,
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to update favorite')
      }

      const result = (await response.json()) as { isFavorite?: boolean }
      setIsFavorite(result.isFavorite === true)
    } catch {
      setIsFavorite(!nextValue)
    } finally {
      setIsPending(false)
    }
  }

  return (
    <button
      type="button"
      aria-label={isFavorite ? '즐겨찾기 해제' : '즐겨찾기 추가'}
      aria-pressed={isFavorite}
      disabled={isPending}
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        void toggleFavorite()
      }}
      className={className}
    >
      <Image
        src={
          isFavorite
            ? '/assets/icons/project/star-selected-yellow.svg'
            : '/assets/icons/project/star.svg'
        }
        alt=""
        width={24}
        height={24}
        unoptimized
        className="h-6 w-6 object-contain"
      />
    </button>
  )
}
