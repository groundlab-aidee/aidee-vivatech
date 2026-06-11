'use client'

import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'

import {
  useAppLanguage,
  type AppLanguage,
} from '@/components/i18n/AppLanguageContext'

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

type SurveyOption = {
  label: Record<AppLanguage, string>
  value: string
}

const categoryOptions: SurveyOption[] = [
  { label: { ENG: 'Lighting', KOR: '조명' }, value: '조명' },
  { label: { ENG: 'Home decor', KOR: '인테리어 소품' }, value: '인테리어 소품' },
  { label: { ENG: 'Furniture', KOR: '가구' }, value: '가구' },
  { label: { ENG: 'Fashion & accessories', KOR: '패션·악세서리' }, value: '패션·악세서리' },
  { label: { ENG: 'Digital devices', KOR: '디지털 기기' }, value: '디지털 기기' },
  { label: { ENG: 'Other (please specify)', KOR: '기타 (직접 입력)' }, value: '기타 (직접 입력)' },
]

const featureOptions: SurveyOption[] = [
  { label: { ENG: 'Simple structure', KOR: '단순 구조물' }, value: '단순 구조물' },
  { label: { ENG: 'Light or color changes', KOR: '빛·색 변화' }, value: '빛·색 변화' },
  { label: { ENG: 'Sensor detection', KOR: '센서 감지' }, value: '센서 감지' },
  { label: { ENG: 'Easy assembly and disassembly', KOR: '조립·분해 가능' }, value: '조립·분해 가능' },
  { label: { ENG: 'IoT / smart features', KOR: 'IoT / 스마트 기능' }, value: 'IoT / 스마트 기능' },
  { label: { ENG: 'Other (please specify)', KOR: '기타 (직접 입력)' }, value: '기타 (직접 입력)' },
]

const durationOptions: SurveyOption[] = [
  { label: { ENG: '1 week', KOR: '1주' }, value: '1주' },
  { label: { ENG: '2 weeks', KOR: '2주' }, value: '2주' },
  { label: { ENG: '1 month', KOR: '1개월' }, value: '1개월' },
  { label: { ENG: '3 months', KOR: '3개월' }, value: '3개월' },
  { label: { ENG: '6 months', KOR: '6개월' }, value: '6개월' },
  { label: { ENG: '1 year', KOR: '1년' }, value: '1년' },
  { label: { ENG: 'More than 1 year', KOR: '1년 +' }, value: '1년 +' },
]

const surveyCopy = {
  ENG: {
    back: 'Back',
    cancel: 'Cancel',
    categoryPlaceholder: 'Please enter a product category.',
    close: 'Close project survey',
    create: 'Create project',
    creating: 'Creating...',
    createError: 'Failed to create the project.',
    createdProjectIdError: 'The newly created project ID could not be found.',
    featurePlaceholder: 'Please enter the features you need.',
    max: 'Max',
    min: 'Min',
    next: 'Next',
    subtitle: 'Your answers will be saved as the project requirements.',
    title: 'Set Project Goals',
  },
  KOR: {
    back: '이전',
    cancel: '취소',
    categoryPlaceholder: '카테고리를 입력해주세요.',
    close: '프로젝트 생성 닫기',
    create: '프로젝트 생성',
    creating: '생성 중...',
    createError: '프로젝트 생성에 실패했습니다.',
    createdProjectIdError: '생성된 프로젝트 ID를 확인할 수 없습니다.',
    featurePlaceholder: '필요한 기능을 입력해주세요.',
    max: '최대',
    min: '최소',
    next: '다음',
    subtitle: '답변은 프로젝트 requirements로 저장됩니다.',
    title: '프로젝트 목표 설정',
  },
} as const

const maxReferenceFiles = 4
const totalMaxBudget = 10000

export function ProjectSurveyModal({
  initialIdea,
  initialReferenceImages,
  onClose,
  onCreated,
}: ProjectSurveyModalProps) {
  const { language } = useAppLanguage()
  const copy = surveyCopy[language]
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
        throw new Error(result.error || copy.createError)
      }

      const projectId = result.project?.id

      if (!projectId) {
        throw new Error(copy.createdProjectIdError)
      }

      onCreated?.()
      router.refresh()
      router.push(`/workspace/project/${projectId}?isNew=true`)
      onClose()
    } catch (error) {
      const message =
        error instanceof Error ? error.message : copy.createError
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
        aria-label={copy.close}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <section className="relative flex max-h-[86svh] w-full max-w-[560px] flex-col overflow-hidden rounded-[28px] bg-white shadow-2xl">
        <header className="flex shrink-0 items-center justify-between border-b border-zinc-100 px-6 py-5">
          <div>
            <h2 className="text-xl font-bold text-zinc-800">{copy.title}</h2>
            <p className="mt-1 text-sm font-medium text-zinc-400">
              {copy.subtitle}
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
              language={language}
              onChange={updateData}
              onToggleCategory={(value) => toggleListValue('categories', value)}
            />
          ) : null}
          {step === 2 ? (
            <StepTwo
              data={data}
              language={language}
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
              {step === 1 ? copy.cancel : copy.back}
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
              {isSubmitting ? copy.creating : step === 2 ? copy.create : copy.next}
            </button>
          </div>
        </footer>
      </section>
    </div>
  )
}

function StepOne({
  data,
  language,
  onChange,
  onToggleCategory,
}: {
  data: SurveyData
  language: AppLanguage
  onChange: (next: Partial<SurveyData>) => void
  onToggleCategory: (value: string) => void
}) {
  const copy = surveyCopy[language]

  return (
    <div className="flex flex-col gap-8">
      <SurveyField
        label={
          language === 'ENG'
            ? '1. How far would you like to take the product development process?'
            : '1. 제품 개발의 어느 단계까지 목표로 하고 계신가요?'
        }
      >
        <RadioGroup
          language={language}
          name="goal"
          onChange={(value) => onChange({ goal: value })}
          options={[
            { label: { ENG: 'Refine the idea', KOR: '아이디어 구체화' }, value: '아이디어 구체화' },
            { label: { ENG: '2D / 3D visualization', KOR: '2D·3D 시각화' }, value: '2D·3D 시각화' },
            { label: { ENG: 'Prototype development and commercialization', KOR: '시제품 제작 및 사업화' }, value: '시제품 제작 및 사업화' },
          ]}
          value={data.goal}
        />
      </SurveyField>
      <SurveyField
        label={
          language === 'ENG'
            ? '2. What product category does your idea belong to?'
            : '2. 어떤 카테고리의 제품인가요?'
        }
      >
        <CheckboxGroup
          language={language}
          options={categoryOptions}
          selected={data.categories}
          onToggle={onToggleCategory}
        />
        {data.categories.includes('기타 (직접 입력)') ? (
          <TextInput
            value={data.otherCategory}
            onChange={(value) => onChange({ otherCategory: value })}
            placeholder={copy.categoryPlaceholder}
          />
        ) : null}
      </SurveyField>
      <SurveyField
        label={language === 'ENG' ? '3. Estimated budget range' : '3. 예상 예산 범위'}
      >
        <BudgetRangeSlider
          language={language}
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
  language,
  onChange,
  onToggleFeature,
}: {
  data: SurveyData
  language: AppLanguage
  onChange: (next: Partial<SurveyData>) => void
  onToggleFeature: (value: string) => void
}) {
  return (
    <div className="flex flex-col gap-8">
      <SurveyField
        label={
          language === 'ENG'
            ? '4. Approximately how large will the product be?'
            : '4. 제품의 대략적인 크기는 어느 정도인가요?'
        }
      >
        <RadioGroup
          language={language}
          name="size"
          onChange={(value) => onChange({ size: value })}
          options={[
            { label: { ENG: 'Palm-sized', KOR: '손바닥 크기' }, value: '손바닥 크기' },
            { label: { ENG: 'Small desktop product', KOR: '책상 위 소형 제품' }, value: '책상 위 소형 제품' },
            { label: { ENG: 'Furniture or equipment-sized', KOR: '가구/설비 크기' }, value: '가구/설비 크기' },
            { label: { ENG: 'Not decided yet', KOR: '아직 미정' }, value: '아직 미정' },
          ]}
          value={data.size}
        />
      </SurveyField>
      <SurveyField
        label={
          language === 'ENG'
            ? '5. Select the features that are important to you.'
            : '5. 중요하게 생각하는 기능을 선택해주세요.'
        }
      >
        <CheckboxGroup
          language={language}
          options={featureOptions}
          selected={data.features}
          onToggle={onToggleFeature}
        />
        {data.features.includes('기타 (직접 입력)') ? (
          <TextInput
            value={data.otherFeature}
            onChange={(value) => onChange({ otherFeature: value })}
            placeholder={surveyCopy[language].featurePlaceholder}
          />
        ) : null}
      </SurveyField>
      <SurveyField
        label={
          language === 'ENG'
            ? '6. What is your preferred development timeline?'
            : '6. 희망 개발 기간은 어느 정도인가요?'
        }
      >
        <DurationSelector
          language={language}
          onChange={(value) => onChange({ duration: value })}
          value={data.duration}
        />
      </SurveyField>
      <SurveyField
        label={
          language === 'ENG'
            ? '7. How do you plan to use the product?'
            : '7. 사용 용도가 어떻게 되시나요?'
        }
      >
        <RadioGroup
          language={language}
          name="usage"
          onChange={(value) => onChange({ usage: value })}
          options={[
            { label: { ENG: 'Personal use or display', KOR: '개인 소장 및 전시용' }, value: '개인 소장 및 전시용' },
            { label: { ENG: 'Mass-market sales', KOR: '대량 판매' }, value: '대량 판매' },
            { label: { ENG: 'Crowdfunding', KOR: '크라우드 펀딩' }, value: '크라우드 펀딩' },
            { label: { ENG: 'Brand launch', KOR: '브랜드 런칭' }, value: '브랜드 런칭' },
          ]}
          value={data.usage}
        />
      </SurveyField>
    </div>
  )
}

function formatBudget(value: number, language: AppLanguage) {
  if (value >= totalMaxBudget) {
    return language === 'ENG' ? '₩100M+' : '1억 원'
  }

  return language === 'ENG'
    ? `₩${value / 100}M`
    : `${value.toLocaleString()} 만 원`
}

function DurationSelector({
  language,
  onChange,
  value,
}: {
  language: AppLanguage
  onChange: (value: string) => void
  value: string
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {durationOptions.map((duration) => (
        <button
          key={duration.value}
          type="button"
          onClick={() => onChange(duration.value)}
          className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
            value === duration.value
              ? 'bg-blue-100 text-blue-600 outline outline-1 outline-blue-600'
              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
          }`}
        >
          {duration.label[language]}
        </button>
      ))}
    </div>
  )
}

function BudgetRangeSlider({
  language,
  maxBudget,
  minBudget,
  onChange,
}: {
  language: AppLanguage
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
        <BudgetValue
          label={surveyCopy[language].min}
          language={language}
          value={minBudget}
        />
        <BudgetValue
          label={surveyCopy[language].max}
          language={language}
          value={maxBudget}
        />
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

function BudgetValue({
  label,
  language,
  value,
}: {
  label: string
  language: AppLanguage
  value: number
}) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="text-[10px] font-medium leading-4 text-zinc-400">
        {label}
      </span>
      <div className="rounded-lg border border-gray-100 bg-white px-3 py-1.5 shadow-sm">
        <span className="whitespace-nowrap text-sm font-medium text-neutral-900">
          {formatBudget(value, language)}
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
  language,
  name,
  onChange,
  options,
  value,
}: {
  language: AppLanguage
  name: string
  onChange: (value: string) => void
  options: SurveyOption[]
  value: string
}) {
  return (
    <div className="flex flex-col gap-2">
      {options.map((option) => (
        <label
          key={option.value}
          className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 transition hover:bg-zinc-50"
        >
          <input
            type="radio"
            name={name}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
            className="h-4 w-4 accent-blue-600"
          />
          <span className="text-sm font-medium text-zinc-600">
            {option.label[language]}
          </span>
        </label>
      ))}
    </div>
  )
}

function CheckboxGroup({
  language,
  onToggle,
  options,
  selected,
}: {
  language: AppLanguage
  onToggle: (value: string) => void
  options: SurveyOption[]
  selected: string[]
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {options.map((option) => (
        <label
          key={option.value}
          className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 transition hover:bg-zinc-50"
        >
          <input
            type="checkbox"
            checked={selected.includes(option.value)}
            onChange={() => onToggle(option.value)}
            className="h-4 w-4 accent-blue-600"
          />
          <span className="text-sm font-medium text-zinc-600">
            {option.label[language]}
          </span>
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
