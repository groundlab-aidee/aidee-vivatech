'use client'

import {
  STEP5_FORMS,
  STEP5_SHAPES,
  type Step5Combination,
} from '@/lib/chat/step5-combination'

export { STEP5_FORMS, STEP5_SHAPES }
export type { Step5Combination }

function SolidIcon({ index, selected }: { index: number; selected: boolean }) {
  const stroke = selected ? '#fff' : '#334155'
  const fill = selected ? 'rgba(255,255,255,.18)' : '#dbeafe'
  const organic = index % 3 === 1
  const mixed = index % 3 === 2
  const curved = index >= 3
  return (
    <svg viewBox="0 0 64 48" aria-hidden="true" className="h-12 w-16">
      {organic || mixed ? (
        <path d="M10 19 C12 8 24 7 31 12 C40 5 53 13 51 23 C58 32 47 41 38 37 C28 45 17 39 17 32 C9 30 6 24 10 19Z" fill={fill} stroke={stroke} strokeWidth="2" />
      ) : curved ? (
        <><path d="M12 18 Q12 9 22 9 H39 Q51 9 51 20 V31 Q51 39 41 39 H22 Q12 39 12 30Z" fill={fill} stroke={stroke} strokeWidth="2"/><path d="M21 9 L29 3 H47 L51 9 M51 20 L58 14 V29 L51 36" fill="none" stroke={stroke} strokeWidth="2"/></>
      ) : (
        <><path d="M12 16 24 7 51 12 40 21Z" fill={fill} stroke={stroke} strokeWidth="2"/><path d="M12 16v19l28 6V21M40 21l11-9v20l-11 9" fill={fill} stroke={stroke} strokeWidth="2"/></>
      )}
      {(organic || mixed) && <path d="M30 12 39 7 54 13 50 23 M38 37 47 31" fill="none" stroke={stroke} strokeWidth="2"/>}
    </svg>
  )
}

export function Step5CombinationGrid({
  value,
  onChange,
  interactive = false,
}: {
  value: Step5Combination
  onChange?: (value: Step5Combination) => void
  interactive?: boolean
}) {
  const selectedRow = Math.max(0, STEP5_SHAPES.indexOf(value.shape as typeof STEP5_SHAPES[number]))
  const selectedColumn = Math.max(0, STEP5_FORMS.indexOf(value.form as typeof STEP5_FORMS[number]))
  return (
    <div className="w-full rounded-2xl border border-zinc-200 bg-white p-3 sm:p-4">
      <h3 className="mb-1 text-base font-bold text-zinc-900">조형 미리보기</h3>
      <p className="mb-3 text-sm text-zinc-600">{value.shape} × {value.form}</p>
      <div className="grid grid-cols-[minmax(78px,1fr)_repeat(3,minmax(0,1fr))] gap-1.5 text-center">
        <span />
        {STEP5_FORMS.map((form, column) => <span key={form} className="flex min-h-12 items-end justify-center px-0.5 pb-1 text-[10px] font-semibold leading-tight text-zinc-600 sm:text-xs">{['기하학적 형태', '유기적 형태', '복합적 형태'][column]}</span>)}
        {STEP5_SHAPES.map((shape, row) => <FragmentRow key={shape} shape={shape} row={row} selectedColumn={selectedColumn} selectedRow={selectedRow} interactive={interactive} onChange={onChange} />)}
      </div>
    </div>
  )
}

function FragmentRow({ shape, row, selectedRow, selectedColumn, interactive, onChange }: {
  shape: string
  row: number
  selectedRow: number
  selectedColumn: number
  interactive: boolean
  onChange?: (value: Step5Combination) => void
}) {
  return <>
    <div className="flex items-center justify-center px-1 text-[10px] font-semibold leading-tight text-zinc-700 sm:text-xs">{['직선', '곡선', '직선과 곡선이 섞인'][row]}</div>
    {STEP5_FORMS.map((form, column) => {
      const selected = row === selectedRow && column === selectedColumn
      const cell = <><SolidIcon index={row * 3 + column} selected={selected} /><span className="mt-1 text-[10px] font-semibold leading-tight sm:text-xs">{['직선', '곡선', '직선과 곡선이 섞인'][row]} × {form.replace(' 형태', '')}</span></>
      const className = `flex min-h-24 flex-col items-center justify-center rounded-xl border p-1.5 text-center ${selected ? 'border-blue-700 bg-blue-700 text-white' : 'border-zinc-200 bg-zinc-50 text-zinc-800'} ${interactive ? 'cursor-pointer hover:border-blue-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600' : ''}`
      return interactive ? <button key={form} type="button" aria-pressed={selected} aria-label={`${['직선', '곡선', '직선과 곡선이 섞인'][row]} × ${form}`} className={className} onClick={() => onChange?.({ shape, form })}>{cell}</button> : <div key={form} className={className}>{cell}</div>
    })}
  </>
}
