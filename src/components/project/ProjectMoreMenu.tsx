'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

import { useAppLanguage } from '@/components/i18n/AppLanguageContext'

const menuItems = [
  {
    icon: '/assets/icons/chat/share.svg',
    id: 'share',
    label: { ENG: 'Share', KOR: '공유' },
  },
  {
    icon: '/assets/icons/chat/add-member.svg',
    id: 'add-member',
    label: { ENG: 'Add member', KOR: '멤버 추가' },
  },
  {
    icon: '/assets/icons/chat/delete.svg',
    id: 'delete',
    label: { ENG: 'Delete', KOR: '삭제' },
  },
] as const

const BLUE_ICON_FILTER =
  'brightness(0) saturate(100%) invert(33%) sepia(94%) saturate(2916%) hue-rotate(224deg) brightness(101%) contrast(101%)'
const GRAY_ICON_FILTER =
  'brightness(0) saturate(100%) invert(40%) sepia(8%) saturate(393%) hue-rotate(202deg) brightness(91%) contrast(85%)'
const RED_ICON_FILTER =
  'brightness(0) saturate(100%) invert(36%) sepia(93%) saturate(1736%) hue-rotate(337deg) brightness(99%) contrast(89%)'

type ProjectMoreMenuProps = {
  align?: 'left' | 'right'
  onDeleted?: (projectId: string) => void
  placement?: 'bottom' | 'top'
  projectId: string
  redirectAfterDelete?: string
  triggerClassName?: string
}

export function ProjectMoreMenu({
  align = 'right',
  onDeleted,
  placement = 'bottom',
  projectId,
  redirectAfterDelete,
  triggerClassName = '',
}: ProjectMoreMenuProps) {
  const router = useRouter()
  const { language } = useAppLanguage()
  const [isOpen, setIsOpen] = useState(false)
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  async function deleteProject() {
    if (isDeleting) {
      return
    }

    setIsDeleting(true)

    try {
      const response = await fetch('/api/projects/delete', {
        body: JSON.stringify({ projectId }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })

      if (!response.ok) {
        const result = (await response.json().catch(() => null)) as {
          error?: string
          step?: string
        } | null
        throw new Error(
          [result?.step, result?.error].filter(Boolean).join(': ') ||
            'Failed to delete project'
        )
      }

      onDeleted?.(projectId)

      if (redirectAfterDelete) {
        router.push(redirectAfterDelete)
        router.refresh()
      } else {
        router.refresh()
      }
    } catch (error) {
      console.error('Failed to delete project.', error)
    } finally {
      setIsDeleting(false)
    }
  }

  useEffect(() => {
    if (!isOpen) {
      return
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target

      if (target instanceof Node && !menuRef.current?.contains(target)) {
        setIsOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        aria-label="프로젝트 더보기"
        aria-expanded={isOpen}
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
          setIsOpen((current) => !current)
        }}
        className={`group ${triggerClassName}`}
      >
        <Image
          src="/assets/icons/project/more-horizontal.svg"
          alt=""
          width={24}
          height={24}
          unoptimized
          className={`h-6 w-6 object-contain transition group-hover:[filter:brightness(0)_saturate(100%)_invert(33%)_sepia(94%)_saturate(2916%)_hue-rotate(224deg)_brightness(101%)_contrast(101%)] ${
            isOpen
              ? '[filter:brightness(0)_saturate(100%)_invert(33%)_sepia(94%)_saturate(2916%)_hue-rotate(224deg)_brightness(101%)_contrast(101%)]'
              : '[filter:brightness(0)_saturate(100%)_invert(40%)_sepia(8%)_saturate(393%)_hue-rotate(202deg)_brightness(91%)_contrast(85%)]'
          }`}
        />
      </button>

      {isOpen ? (
        <div
          className={`absolute z-40 w-44 overflow-hidden rounded-[20px] bg-white shadow-[0px_3px_4px_0px_rgba(0,0,0,0.10)] outline outline-[3px] outline-offset-[-3px] outline-gray-100 ${
            align === 'right' ? 'right-0' : 'left-0'
          } ${
            placement === 'top'
              ? 'bottom-[calc(100%+8px)]'
              : 'top-[calc(100%+8px)]'
          }`}
        >
          {menuItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onBlur={() => setHoveredItem(null)}
              onFocus={() => setHoveredItem(item.id)}
              onMouseEnter={() => setHoveredItem(item.id)}
              onMouseLeave={() => setHoveredItem(null)}
              onClick={(event) => {
                event.preventDefault()
                event.stopPropagation()
                setIsOpen(false)
                if (item.id === 'delete') {
                  void deleteProject()
                }
              }}
              disabled={isDeleting}
              className="flex h-12 w-full items-center gap-5 rounded-lg px-5 py-3 text-left transition hover:rounded-[20px] hover:bg-gray-200"
            >
              <Image
                src={item.icon}
                alt=""
                width={24}
                height={24}
                unoptimized
                className="h-6 w-6 object-contain transition"
                style={{
                  filter: item.id === 'delete'
                    ? RED_ICON_FILTER
                    : hoveredItem === item.id
                      ? BLUE_ICON_FILTER
                      : GRAY_ICON_FILTER,
                }}
              />
              <span
                className={`min-w-0 flex-1 font-['Inter'] text-sm font-semibold leading-6 transition ${
                  item.id === 'delete'
                    ? 'text-red-500'
                    : hoveredItem === item.id
                      ? 'text-blue-600'
                      : 'text-zinc-500'
                }`}
              >
                {item.label[language]}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
