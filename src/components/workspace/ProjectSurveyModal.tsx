'use client'

import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'

type ProjectSurveyModalProps = {
  initialIdea: string
  initialReferenceImages: File[]
  onClose: () => void
  onCreated?: () => void
}

type SurveyData = {
  categories: string[]
  duration: string
  features: string[]
  goal: string
  idea: string
  maxBudget: number
  minBudget: number
  otherCategory: string
  otherFeature: string
  referenceImages: File[]
  size: string
  usage: string
}

const categoryOptions = [
  '조명',
  '인테리어 소품',
  '가구',
  '패션·악세서리',
  '디지털 기기',
  '기타 (직접 입력)',
]

const featureOptions = [
  '단순 구조물',
  '빛·색 변화',
  '센서 감지',
  '조립·분해 가능',
  'IoT / 스마트 기능',
  '기타 (직접 입력)',
]

const durationOptions = ['1주', '2주', '1개월', '3개월', '6개월', '1년', '1년 +']

const maxReferenceFiles = 4
const totalMaxBudget = 10000

export function ProjectSurveyModal({
  initialIdea,
  initialReferenceImages,
  onClose,
  onCreated,
}: ProjectSurveyModalProps) {
  const router = useRouter()
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)
  const [step, setStep] = useState(1)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [data, setData] = useState<SurveyData>({
    categories: [],
    duration: '',
    features: [],
    goal: '',
    idea: initialIdea,
    maxBudget: 7500,
    minBudget: 2000,
    otherCategory: '',
    otherFeature: '',
    referenceImages: initialReferenceImages.slice(0, maxReferenceFiles),
    size: '',
    usage: '',
  })

  const isValid = useMemo(() => {
    if (step === 1) {
      const otherValid = data.categories.includes('기타 (직접 입력)')
        ? data.otherCategory.trim().length > 0
        : true

      return data.goal.length > 0 && data.categories.length > 0 && otherValid
    }

    if (step === 2) {
      const otherValid = data.features.includes('기타 (직접 입력)')
        ? data.otherFeature.trim().length > 0
        : true

      return (
        data.size.length > 0 &&
        data.features.length > 0 &&
        otherValid &&
        data.duration.length > 0 &&
        data.usage.length > 0
      )
    }

    return true
  }, [data, step])

  useEffect(() => {
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [step])

  function updateData(next: Partial<SurveyData>) {
    setData((current) => ({ ...current, ...next }))
  }

  function toggleListValue(key: 'categories' | 'features', value: string) {
    setData((current) => {
      const list = current[key]
      const nextList = list.includes(value)
        ? list.filter((item) => item !== value)
        : [...list, value]

      return { ...current, [key]: nextList }
    })
  }

  async function createProject() {
    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      const { referenceImages, ...requirements } = data
      const formData = new FormData()
      formData.set('survey', JSON.stringify(requirements))
      referenceImages.forEach((file) => {
        formData.append('referenceImages', file)
      })

      const response = await fetch('/api/projects/create', {
        body: formData,
        method: 'POST',
      })
      const result = (await response.json()) as {
        error?: string
        project?: { id?: string }
      }

      if (!response.ok) {
        throw new Error(result.error || '프로젝트 생성에 실패했습니다.')
      }

      const projectId = result.project?.id

      if (!projectId) {
        throw new Error('생성된 프로젝트 ID를 확인할 수 없습니다.')
      }

      onCreated?.()
      router.refresh()
      router.push(`/workspace/project/${projectId}?isNew=true`)
      onClose()
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '프로젝트 생성에 실패했습니다.'
      setErrorMessage(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleNext() {
    if (!isValid || isSubmitting) {
      return
    }

    if (step < 2) {
      setStep((current) => current + 1)
      return
    }

    void createProject()
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center px-4">
      <button
        type="button"
        aria-label="프로젝트 생성 닫기"
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <section className="relative flex max-h-[86svh] w-full max-w-[560px] flex-col overflow-hidden rounded-[28px] bg-white shadow-2xl">
        <header className="flex shrink-0 items-center justify-between border-b border-zinc-100 px-6 py-5">
          <div>
            <h2 className="text-xl font-bold text-zinc-800">프로젝트 목표 설정</h2>
            <p className="mt-1 text-sm font-medium text-zinc-400">
              답변은 프로젝트 requirements로 저장됩니다.
            </p>
          </div>
          <div className="text-sm font-semibold">
            <span className="text-blue-600">{step}</span>
            <span className="text-zinc-300">/2</span>
          </div>
        </header>

        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-7 py-8">
          {step === 1 ? (
            <StepOne
              data={data}
              onChange={updateData}
              onToggleCategory={(value) => toggleListValue('categories', value)}
            />
          ) : null}
          {step === 2 ? (
            <StepTwo
              data={data}
              onChange={updateData}
              onToggleFeature={(value) => toggleListValue('features', value)}
            />
          ) : null}
          {errorMessage ? (
            <p className="mt-5 rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
              {errorMessage}
            </p>
          ) : null}
        </div>

        <footer className="shrink-0 border-t border-zinc-100 p-6">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                if (step === 1) {
                  onClose()
                  return
                }

                setStep((current) => current - 1)
              }}
              className="flex-1 rounded-full bg-zinc-50 py-4 text-sm font-bold text-zinc-400 transition hover:bg-zinc-100"
            >
              {step === 1 ? '취소' : '이전'}
            </button>
            <button
              type="button"
              disabled={!isValid || isSubmitting}
              onClick={handleNext}
              className={`flex-1 rounded-full py-4 text-sm font-bold transition ${
                isValid && !isSubmitting
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 hover:bg-blue-700'
                  : 'cursor-not-allowed bg-blue-100 text-white'
              }`}
            >
              {isSubmitting ? '생성 중...' : step === 2 ? '프로젝트 생성' : '다음'}
            </button>
          </div>
        </footer>
      </section>
    </div>
  )
}

function StepOne({
  data,
  onChange,
  onToggleCategory,
}: {
  data: SurveyData
  onChange: (next: Partial<SurveyData>) => void
  onToggleCategory: (value: string) => void
}) {
  return (
    <div className="flex flex-col gap-8">
      <SurveyField label="1. 제품 개발의 어느 단계까지 목표로 하고 계신가요?">
        <RadioGroup
          name="goal"
          onChange={(value) => onChange({ goal: value })}
          options={['아이디어 구체화', '2D·3D 시각화', '시제품 제작 및 사업화']}
          value={data.goal}
        />
      </SurveyField>
      <SurveyField label="2. 어떤 카테고리의 제품인가요?">
        <CheckboxGroup
          options={categoryOptions}
          selected={data.categories}
          onToggle={onToggleCategory}
        />
        {data.categories.includes('기타 (직접 입력)') ? (
          <TextInput
            value={data.otherCategory}
            onChange={(value) => onChange({ otherCategory: value })}
            placeholder="카테고리를 입력해주세요."
          />
        ) : null}
      </SurveyField>
      <SurveyField label="3. 예상 예산 범위">
        <BudgetRangeSlider
          maxBudget={data.maxBudget}
          minBudget={data.minBudget}
          onChange={onChange}
        />
      </SurveyField>
    </div>
  )
}

function StepTwo({
  data,
  onChange,
  onToggleFeature,
}: {
  data: SurveyData
  onChange: (next: Partial<SurveyData>) => void
  onToggleFeature: (value: string) => void
}) {
  return (
    <div className="flex flex-col gap-8">
      <SurveyField label="4. 제품의 대략적인 크기는 어느 정도인가요?">
        <RadioGroup
          name="size"
          onChange={(value) => onChange({ size: value })}
          options={['손바닥 크기', '책상 위 소형 제품', '가구/설비 크기', '아직 미정']}
          value={data.size}
        />
      </SurveyField>
      <SurveyField label="5. 중요하게 생각하는 기능을 선택해주세요.">
        <CheckboxGroup
          options={featureOptions}
          selected={data.features}
          onToggle={onToggleFeature}
        />
        {data.features.includes('기타 (직접 입력)') ? (
          <TextInput
            value={data.otherFeature}
            onChange={(value) => onChange({ otherFeature: value })}
            placeholder="필요한 기능을 입력해주세요."
          />
        ) : null}
      </SurveyField>
      <SurveyField label="6. 희망 개발 기간은 어느 정도인가요?">
        <DurationSelector
          onChange={(value) => onChange({ duration: value })}
          value={data.duration}
        />
      </SurveyField>
      <SurveyField label="7. 사용 용도가 어떻게 되시나요?">
        <RadioGroup
          name="usage"
          onChange={(value) => onChange({ usage: value })}
          options={[
            '개인 소장 및 전시용',
            '대량 판매',
            '크라우드 펀딩',
            '브랜드 런칭',
          ]}
          value={data.usage}
        />
      </SurveyField>
    </div>
  )
}

function formatBudget(value: number) {
  if (value >= totalMaxBudget) {
    return '1억 원'
  }

  return `${value.toLocaleString()} 만 원`
}

function DurationSelector({
  onChange,
  value,
}: {
  onChange: (value: string) => void
  value: string
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {durationOptions.map((duration) => (
        <button
          key={duration}
          type="button"
          onClick={() => onChange(duration)}
          className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
            value === duration
              ? 'bg-blue-100 text-blue-600 outline outline-1 outline-blue-600'
              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
          }`}
        >
          {duration}
        </button>
      ))}
    </div>
  )
}

function BudgetRangeSlider({
  maxBudget,
  minBudget,
  onChange,
}: {
  maxBudget: number
  minBudget: number
  onChange: (next: Partial<SurveyData>) => void
}) {
  function handleMinChange(event: React.ChangeEvent<HTMLInputElement>) {
    const value = Math.min(Number(event.target.value), maxBudget - 500)
    onChange({ minBudget: value })
  }

  function handleMaxChange(event: React.ChangeEvent<HTMLInputElement>) {
    const value = Math.max(Number(event.target.value), minBudget + 500)
    onChange({ maxBudget: value })
  }

  return (
    <div className="flex flex-col gap-10 px-2 pt-4">
      <div className="relative h-1.5 w-full rounded-full bg-gray-200">
        <div
          className="absolute h-full rounded-full bg-blue-600"
          style={{
            left: `${(minBudget / totalMaxBudget) * 100}%`,
            right: `${100 - (maxBudget / totalMaxBudget) * 100}%`,
          }}
        />
        <input
          type="range"
          min="0"
          max={totalMaxBudget}
          step="500"
          value={minBudget}
          onChange={handleMinChange}
          className="custom-slider-handle pointer-events-none absolute z-20 h-1.5 w-full appearance-none bg-transparent accent-blue-600"
        />
        <input
          type="range"
          min="0"
          max={totalMaxBudget}
          step="500"
          value={maxBudget}
          onChange={handleMaxChange}
          className="custom-slider-handle pointer-events-none absolute z-20 h-1.5 w-full appearance-none bg-transparent accent-blue-600"
        />
      </div>
      <div className="flex items-center justify-between gap-3">
        <BudgetValue label="최소" value={minBudget} />
        <BudgetValue label="최대" value={maxBudget} />
      </div>
      <style jsx>{`
        .custom-slider-handle::-webkit-slider-thumb {
          pointer-events: auto;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #2563eb;
          border: 4px solid white;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          cursor: pointer;
          appearance: none;
        }

        .custom-slider-handle::-moz-range-thumb {
          pointer-events: auto;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #2563eb;
          border: 4px solid white;
          cursor: pointer;
        }
      `}</style>
    </div>
  )
}

function BudgetValue({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="text-[10px] font-medium leading-4 text-zinc-400">
        {label}
      </span>
      <div className="rounded-lg border border-gray-100 bg-white px-3 py-1.5 shadow-sm">
        <span className="whitespace-nowrap text-sm font-medium text-neutral-900">
          {formatBudget(value)}
        </span>
      </div>
    </div>
  )
}

function SurveyField({
  children,
  label,
}: {
  children: ReactNode
  label: string
}) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-base font-semibold leading-7 text-zinc-700">{label}</h3>
      {children}
    </section>
  )
}

function RadioGroup({
  name,
  onChange,
  options,
  value,
}: {
  name: string
  onChange: (value: string) => void
  options: string[]
  value: string
}) {
  return (
    <div className="flex flex-col gap-2">
      {options.map((option) => (
        <label
          key={option}
          className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 transition hover:bg-zinc-50"
        >
          <input
            type="radio"
            name={name}
            checked={value === option}
            onChange={() => onChange(option)}
            className="h-4 w-4 accent-blue-600"
          />
          <span className="text-sm font-medium text-zinc-600">{option}</span>
        </label>
      ))}
    </div>
  )
}

function CheckboxGroup({
  onToggle,
  options,
  selected,
}: {
  onToggle: (value: string) => void
  options: string[]
  selected: string[]
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {options.map((option) => (
        <label
          key={option}
          className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 transition hover:bg-zinc-50"
        >
          <input
            type="checkbox"
            checked={selected.includes(option)}
            onChange={() => onToggle(option)}
            className="h-4 w-4 accent-blue-600"
          />
          <span className="text-sm font-medium text-zinc-600">{option}</span>
        </label>
      ))}
    </div>
  )
}

function TextInput({
  onChange,
  placeholder,
  value,
}: {
  onChange: (value: string) => void
  placeholder: string
  value: string
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 text-sm font-medium outline-none transition focus:border-blue-300 focus:bg-white"
    />
  )
}
