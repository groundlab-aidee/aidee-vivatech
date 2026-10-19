'use client'

import { useEffect } from 'react'

import type { Step5Combination } from '@/components/project/Step5CombinationGrid'

const SHAPE_NAMES: Record<string, string> = {
  '직선으로 둘러싸인 다각형': '직선',
  '곡선으로 이루어진 도형': '곡선',
  '직선과 곡선이 결합된 도형': '직선과 곡선이 섞인',
}

function FormDesignIllustration({ index }: { index: number }) {
  const fills = ['#dbeafe', '#e0e7ff', '#cffafe', '#ede9fe', '#d1fae5', '#fef3c7']
  const fill = fills[index % fills.length]
  return <svg viewBox="0 0 180 140" className="h-full w-full" aria-hidden="true">
    <ellipse cx="90" cy="120" rx="54" ry="9" fill="#0f172a" opacity=".08" />
    {index % 3 === 0 ? <g stroke="#26364d" strokeWidth="2"><path d="m47 52 39-22 47 21-39 26Z" fill={fill}/><path d="M47 52v48l47 22V77M94 77l39-26v48l-39 23" fill={fill}/><path d="m86 30 8 47" fill="none" opacity=".65"/></g>
      : index % 3 === 1 ? <g stroke="#26364d" strokeWidth="2"><path d="M45 78C38 42 72 28 91 43c23-22 54-3 43 23 23 28-8 53-30 39-24 22-57 5-48-15-9-1-14-6-11-12Z" fill={fill}/><path d="M91 43v62m0-62 24-17m-24 79 25 15" fill="none"/></g>
      : <g stroke="#26364d" strokeWidth="2"><path d="M48 57 80 38l43 8 15 26-24 36-48 2-21-25Z" fill={fill}/><path d="M48 57c15 1 23 12 18 28m57-39c-7 14-5 22 15 26M66 110c19-9 33-8 48-2" fill="none"/></g>}
  </svg>
}

export function FormDesignModal({ value, onClose }: { value: Step5Combination; onClose: () => void }) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  function downloadBoard() {
    const svg = document.getElementById('form-design-board-svg')
    if (!svg) return
    const blob = new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'form-design.svg'
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label="Form Design" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <section className="max-h-[92svh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-7">
      <header className="flex items-center justify-between gap-4"><h2 className="text-2xl font-bold text-zinc-900">Form Design</h2><div className="flex items-center gap-2"><button type="button" onClick={downloadBoard} className="rounded-lg border border-zinc-200 px-3 py-2 text-sm font-semibold">다운로드</button><button type="button" onClick={onClose} aria-label="닫기" className="rounded-lg border border-zinc-200 px-3 py-2 text-sm font-semibold">닫기</button></div></header>
      <p className="mt-3 text-sm leading-6 text-zinc-600">선택하신 조형의 레퍼런스입니다. 이후 조형 디자인에서 비율과 형태를 참고할 예정입니다.</p>
      <div className="mt-4 flex flex-wrap gap-x-8 gap-y-2 rounded-xl bg-zinc-50 p-4 text-sm"><span><b>조형</b> — {value.shape}</span><span><b>형태</b> — {value.form}</span></div>
      <svg id="form-design-board-svg" viewBox="0 0 960 650" role="img" aria-label={`${value.shape}, ${value.form} 추상 조형 레퍼런스 보드`} className="mt-5 w-full rounded-xl bg-[#f4f6fa]">
        <rect width="960" height="650" rx="28" fill="#f4f6fa" />
        <text x="44" y="52" fill="#172033" fontSize="20" fontFamily="sans-serif" fontWeight="700">FORM STUDIES · {SHAPE_NAMES[value.shape] ?? '조형'} × {value.form}</text>
        {Array.from({ length: 6 }, (_, index) => {
          const x = 36 + (index % 3) * 300
          const y = 78 + Math.floor(index / 3) * 278
          return <g key={index} transform={`translate(${x} ${y})`}><rect width="280" height="250" rx="18" fill="white"/><svg x="50" y="35" width="180" height="140" viewBox="0 0 180 140"><FormDesignIllustration index={index} /></svg><text x="20" y="213" fill="#566176" fontSize="13" fontFamily="sans-serif">STUDY 0{index + 1} · {value.form}</text></g>
        })}
      </svg>
    </section>
  </div>
}
