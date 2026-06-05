'use client'

import Image from 'next/image'
import Link from 'next/link'
import type { ChangeEvent, DragEvent, KeyboardEvent } from 'react'
import { useEffect, useRef, useState } from 'react'

import { ProjectFavoriteButton } from '@/components/project/ProjectFavoriteButton'
import { ProjectMoreMenu } from '@/components/project/ProjectMoreMenu'
import { ProjectSurveyModal } from '@/components/workspace/ProjectSurveyModal'

const MAX_REFERENCE_FILES = 4
const MAX_REFERENCE_FILE_SIZE = 10 * 1024 * 1024
const ACCEPTED_IMAGE_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
]

export type WorkspaceProject = {
  createdAt: string
  id: string
  isFavorite?: boolean
  recommendedStage?: string
  summary?: string
  title: string
}

type WorkspaceHomeProps = {
  projects: WorkspaceProject[]
}

function formatProjectDate(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return new Intl.DateTimeFormat('ko-KR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
    .format(date)
    .replace(/\s/g, '')
    .replace(/\.$/, '')
}

function getStageLabel(stage?: string) {
  if (!stage) {
    return 'Step1'
  }

  const stageKeyMap: Record<string, string> = {
    step_0_start: 'Step1',
    step_1_idea: 'Step1',
    step_2_persona: 'Step2',
    step_2_research: 'Step2',
    step_3_direction: 'Step3',
    step_4_style: 'Step4',
    step_5_design: 'Step5',
    step_6_rfp: 'Step6',
    step_6_company: 'Step7',
  }
  const normalized = stage.trim().toLowerCase()
  const mappedStage = stageKeyMap[normalized]

  if (mappedStage) {
    return mappedStage
  }

  const compactStage = normalized.replace(/\s+/g, '')

  if (/초기|아이디어|개발조건/.test(compactStage)) {
    return 'Step1'
  }

  if (/페르소나|리서치|사용자|타겟/.test(compactStage)) {
    return 'Step2'
  }

  if (/방향|방향성/.test(compactStage)) {
    return 'Step3'
  }

  if (/스타일|컨셉|콘셉트/.test(compactStage)) {
    return 'Step4'
  }

  if (/디자인|시안|제안/.test(compactStage)) {
    return 'Step5'
  }

  if (/평가|rfp|기획안|제안요청서/.test(compactStage)) {
    return 'Step6'
  }

  if (/협력|업체|파트너|연결/.test(compactStage)) {
    return 'Step7'
  }

  const match = stage.match(/\d+/)

  return match ? `Step${Math.min(Number(match[0]), 7)}` : 'Step1'
}

export function WorkspaceHome({ projects }: WorkspaceHomeProps) {
  const [workspaceProjects, setWorkspaceProjects] = useState(projects)
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [isSurveyOpen, setIsSurveyOpen] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [referenceImages, setReferenceImages] = useState<File[]>([])
  const [referencePreviews, setReferencePreviews] = useState<string[]>([])
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const promptFormRef = useRef<HTMLFormElement | null>(null)
  const promptInputRef = useRef<HTMLTextAreaElement | null>(null)
  const referencePreviewsRef = useRef<string[]>([])

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
    const nextPreviews = filesToAdd.map((file) => URL.createObjectURL(file))
    setReferencePreviews((current) => [
      ...current,
      ...nextPreviews,
    ])
    referencePreviewsRef.current = [
      ...referencePreviewsRef.current,
      ...nextPreviews,
    ]
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
    referencePreviewsRef.current = referencePreviewsRef.current.filter(
      (_, itemIndex) => itemIndex !== index
    )
    setUploadError(null)
  }

  useEffect(() => {
    return () => {
      referencePreviewsRef.current.forEach((preview) => URL.revokeObjectURL(preview))
    }
  }, [])

  useEffect(() => {
    const textarea = promptInputRef.current

    if (!textarea) {
      return
    }

    const lineHeight = 24
    const maxRows = 5
    const maxHeight = lineHeight * maxRows

    textarea.style.height = 'auto'
    textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`
    textarea.style.overflowY =
      textarea.scrollHeight > maxHeight ? 'auto' : 'hidden'
  }, [prompt])

  function resetWorkspaceDraft() {
    referencePreviewsRef.current.forEach((preview) => URL.revokeObjectURL(preview))
    referencePreviewsRef.current = []
    setPrompt('')
    setReferenceImages([])
    setReferencePreviews([])
    setUploadError(null)
    setIsUploadOpen(false)
  }

  function handlePromptKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) {
      return
    }

    event.preventDefault()
    promptFormRef.current?.requestSubmit()
  }

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
      <div className="justify-start text-neutral-400 text-lg font-medium font-['Pretendard'] leading-[80px]">누구를 위해, 어떤 목적으로, 무엇을 만들고 싶은지 적어주세요.</div>

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
          ref={promptFormRef}
          onSubmit={(event) => {
            event.preventDefault()
            if (!prompt.trim()) {
              setUploadError('제품 아이디어를 먼저 입력해주세요.')
              return
            }

            setUploadError(null)
            setIsSurveyOpen(true)
          }}
          className={
            isUploadOpen
              ? 'relative z-10 -mt-[47px] flex min-h-[clamp(56px,7.037svh,76px)] w-full items-center justify-between overflow-hidden rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-[0px_4px_3px_0px_rgba(0,0,0,0.10)]'
              : 'relative z-10 flex min-h-[clamp(56px,7.037svh,76px)] w-full items-center justify-between overflow-hidden rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-[0px_4px_3px_0px_rgba(0,0,0,0.10)]'
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
              ref={promptInputRef}
              id="workspace-prompt"
              rows={1}
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              onKeyDown={handlePromptKeyDown}
              placeholder="어떤 제품을 만들고 싶은가요?"
              className="max-h-[120px] flex-1 resize-none border-0 bg-transparent py-1 text-[16px] font-medium leading-6 text-neutral-900 outline-none placeholder:text-neutral-400 sm:text-[18px]"
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

      <section className="mt-[clamp(96px,18.333svh,198px)] w-full max-w-[1285px] lg:w-[82.3%]">
        <h2 className="font-['Inter'] text-xl font-semibold leading-[56px] text-neutral-900 sm:text-2xl">
          최신 프로젝트
        </h2>
        {workspaceProjects.length > 0 ? (
          <div className="grid grid-cols-1 gap-x-2.5 gap-y-[clamp(32px,4.444svh,48px)] sm:grid-cols-2 lg:grid-cols-4">
            {workspaceProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onDeleted={(projectId) =>
                  setWorkspaceProjects((current) =>
                    current.filter((item) => item.id !== projectId)
                  )
                }
              />
            ))}
          </div>
        ) : (
          <p className="mt-4 rounded-xl border border-gray-200 bg-gray-50 px-5 py-6 text-sm font-medium text-zinc-500">
            아직 생성된 프로젝트가 없습니다.
          </p>
        )}
      </section>

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

      {isSurveyOpen ? (
        <ProjectSurveyModal
          initialIdea={prompt}
          initialReferenceImages={referenceImages}
          onClose={() => setIsSurveyOpen(false)}
          onCreated={resetWorkspaceDraft}
        />
      ) : null}
    </div>
  )
}

function ProjectCard({
  onDeleted,
  project,
}: {
  onDeleted: (projectId: string) => void
  project: WorkspaceProject
}) {
  return (
    <article className="group relative min-w-0 rounded-xl bg-white outline-none">
      <Link
        href={`/workspace/project/${project.id}`}
        className="block rounded-xl outline-none"
      >
        <div className="relative aspect-[320/208] overflow-hidden rounded-xl border-2 border-gray-200 bg-gray-200 shadow-[0px_8px_24px_6px_rgba(0,0,0,0.12)] transition group-hover:-translate-y-0.5 group-hover:shadow-[0px_10px_28px_8px_rgba(0,0,0,0.14)]" />

        <div className="relative aspect-[320/64] overflow-hidden rounded-xl bg-white">
          <div className="grid h-full grid-rows-[56.25%_43.75%]">
            <div className="grid min-h-0 grid-cols-[minmax(0,65%)_1fr] items-start pl-[3.75%] pr-[5.625%] pt-[2.5%]">
              <h3 className="min-w-0 truncate font-['Pretendard'] text-sm font-semibold leading-5 text-black 2xl:text-base">
                {project.title}
              </h3>
              <div />
            </div>

            <div className="flex min-h-0 items-start gap-[7.5%] px-[3.75%] py-[1.25%] font-['Pretendard'] text-xs font-medium leading-5 text-stone-300 2xl:text-sm">
              <span>{formatProjectDate(project.createdAt)}</span>
              <span>{getStageLabel(project.recommendedStage)}</span>
            </div>
          </div>
        </div>
      </Link>

      <div className="absolute right-[6.25%] top-[7.2%] z-20 flex aspect-square w-[7.5%] min-w-5 max-w-6 items-center justify-center overflow-hidden rounded">
        <ProjectFavoriteButton
          projectId={project.id}
          initialIsFavorite={project.isFavorite}
          className="flex h-full w-full items-center justify-center disabled:opacity-60"
        />
      </div>

      <div className="absolute right-[5.625%] top-[78%] z-20">
        <ProjectMoreMenu
          projectId={project.id}
          onDeleted={onDeleted}
          placement="top"
          triggerClassName="flex h-6 w-6 items-center justify-center rounded transition hover:bg-zinc-100"
        />
      </div>
    </article>
  )
}
