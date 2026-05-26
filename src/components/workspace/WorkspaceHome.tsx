'use client'

import Image from 'next/image'
import type { ChangeEvent, DragEvent } from 'react'
import { useEffect, useRef, useState } from 'react'

const MAX_REFERENCE_FILES = 4
const MAX_REFERENCE_FILE_SIZE = 10 * 1024 * 1024
const ACCEPTED_IMAGE_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
]

export function WorkspaceHome() {
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [referenceImages, setReferenceImages] = useState<File[]>([])
  const [referencePreviews, setReferencePreviews] = useState<string[]>([])
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  function addReferenceFiles(files: File[]) {
    if (files.length === 0) {
      return
    }

    const validFiles = files.filter(
      (file) =>
        ACCEPTED_IMAGE_TYPES.includes(file.type) &&
        file.size <= MAX_REFERENCE_FILE_SIZE
    )

    const remainingSlots = MAX_REFERENCE_FILES - referenceImages.length
    const filesToAdd = validFiles.slice(0, Math.max(remainingSlots, 0))

    if (filesToAdd.length === 0) {
      setUploadError('PNG, JPG, JPEG, WEBP 형식의 10MB 이하 이미지를 최대 4개까지 추가할 수 있습니다.')
      return
    }

    setUploadError(null)
    setReferenceImages((current) => [...current, ...filesToAdd])
    setReferencePreviews((current) => [
      ...current,
      ...filesToAdd.map((file) => URL.createObjectURL(file)),
    ])
  }

  function handleFileInputChange(event: ChangeEvent<HTMLInputElement>) {
    addReferenceFiles(Array.from(event.target.files ?? []))
    event.target.value = ''
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setIsDragging(false)
    setIsUploadOpen(true)
    addReferenceFiles(Array.from(event.dataTransfer.files))
  }

  function removeReferenceImage(index: number) {
    const previewToRemove = referencePreviews[index]

    if (previewToRemove) {
      URL.revokeObjectURL(previewToRemove)
    }

    setReferenceImages((current) => current.filter((_, itemIndex) => itemIndex !== index))
    setReferencePreviews((current) => current.filter((_, itemIndex) => itemIndex !== index))
    setUploadError(null)
  }

  useEffect(() => {
    return () => {
      referencePreviews.forEach((preview) => URL.revokeObjectURL(preview))
    }
  }, [referencePreviews])

  return (
    <div
      className="relative flex min-h-full flex-col items-center px-5 pb-12 pt-20 sm:px-8 lg:px-10 lg:pt-24"
      onDragOver={(event) => {
        event.preventDefault()
        setIsDragging(true)
      }}
      onDragLeave={(event) => {
        if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
          return
        }

        setIsDragging(false)
      }}
      onDrop={handleDrop}
    >
      <h1 className="w-full max-w-[1498px] text-center text-3xl font-bold leading-[48px] text-neutral-900 sm:text-4xl sm:leading-[64px]">
        간단한 아이디어로 시작해 보세요.
      </h1>

      <div className="mt-12 flex w-full flex-col lg:w-[calc(100%-clamp(320px,36.04%,568px))]">
        {isUploadOpen ? (
          <div
            role="button"
            tabIndex={0}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                fileInputRef.current?.click()
              }
            }}
            className="relative z-0 -mt-[21px] flex h-44 w-full cursor-pointer flex-col items-start justify-start overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 px-6 py-4 text-left transition hover:border-blue-200 hover:bg-blue-50/40"
          >
            <div className="flex items-start gap-4">
              <Image
                src="/assets/icons/chat/img-load.svg"
                alt=""
                width={32}
                height={32}
                unoptimized
                className="h-8 w-8 shrink-0 object-contain"
              />
              <div className="flex flex-col gap-[3px]">
                <span className="text-sm font-bold leading-6 text-zinc-500">
                  이미지 파일을 드래그 하거나 클릭해서 추가해주세요.
                </span>
                <span className="text-xs font-bold leading-6 text-neutral-400">
                  최대 4개&nbsp;&nbsp;&nbsp;파일당 최대 용량
                  10MB&nbsp;&nbsp;&nbsp;지원 형식: PNG, JPG, JPEG, WEBP
                </span>
              </div>
            </div>

            {uploadError ? (
              <p className="mt-3 text-xs font-semibold text-red-500">{uploadError}</p>
            ) : null}
          </div>
        ) : null}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/webp"
          multiple
          onChange={handleFileInputChange}
          className="hidden"
        />

        {referencePreviews.length > 0 ? (
          <div className={isUploadOpen ? 'relative z-20 -mt-14 mb-3 flex gap-2 px-4' : 'mb-3 flex gap-2'}>
            {referencePreviews.map((preview, index) => (
              <div
                key={`${preview}-${index}`}
                className="group relative h-12 w-12 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm"
              >
                <Image
                  src={preview}
                  alt=""
                  fill
                  sizes="48px"
                  unoptimized
                  className="object-cover"
                />
                <button
                  type="button"
                  aria-label="이미지 제거"
                  onClick={() => removeReferenceImage(index)}
                  className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-[10px] font-bold text-white opacity-0 transition group-hover:opacity-100"
                >
                  X
                </button>
              </div>
            ))}
          </div>
        ) : null}

        <form
          onSubmit={(event) => event.preventDefault()}
          className={
            isUploadOpen
              ? 'relative z-10 -mt-[47px] flex h-[clamp(56px,7.037svh,76px)] w-full items-center justify-between overflow-hidden rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-[0px_4px_3px_0px_rgba(0,0,0,0.10)]'
              : 'relative z-10 flex h-[clamp(56px,7.037svh,76px)] w-full items-center justify-between overflow-hidden rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-[0px_4px_3px_0px_rgba(0,0,0,0.10)]'
          }
        >
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <button
              type="button"
              aria-label="첨부 파일 추가"
              aria-expanded={isUploadOpen}
              onClick={() => setIsUploadOpen((current) => !current)}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-neutral-500 transition hover:bg-gray-100"
            >
              <Image
                src="/assets/icons/chat/img-add.svg"
                alt=""
                width={24}
                height={24}
                unoptimized
                className="h-6 w-6 object-contain"
              />
            </button>
            <label className="sr-only" htmlFor="workspace-prompt">
              제품 아이디어 입력
            </label>
            <textarea
              id="workspace-prompt"
              rows={1}
              placeholder="어떤 제품을 만들고 싶은가요?"
              className="h-8 flex-1 resize-none border-0 bg-transparent py-1 text-[16px] font-medium leading-6 text-neutral-900 outline-none placeholder:text-neutral-400 sm:text-[18px]"
            />
          </div>
          <button
            type="submit"
            aria-label="전송"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-blue-600 transition hover:bg-blue-50"
          >
            <Image
              src="/assets/icons/chat/chat-send.svg"
              alt=""
              width={28}
              height={28}
              unoptimized
              className="h-7 w-7 object-contain"
            />
          </button>
        </form>
      </div>

      {isDragging ? (
        <div className="absolute inset-0 z-50 flex items-center justify-center rounded-[19px] bg-white/90">
          <div className="flex w-80 flex-col items-center text-center">
            <Image
              src="/assets/icons/chat/img-load.svg"
              alt=""
              width={96}
              height={96}
              unoptimized
              className="h-24 w-24 object-contain"
            />
            <p className="mt-8 text-xl font-bold leading-6 text-blue-600">
              참고 이미지가 있다면 업로드해주세요
            </p>
            <p className="mt-4 text-sm font-medium leading-4 text-zinc-500">
              최대 4개&nbsp;&nbsp;파일당 최대 용량 10MB&nbsp;&nbsp;지원 형식:
              PNG, JPG, JPEG, WEBP
            </p>
            <p className="mt-14 text-xs font-medium leading-6 text-neutral-700">
              추가하려면 여기에 파일을 드롭하세요
            </p>
          </div>
        </div>
      ) : null}
    </div>
  )
}
