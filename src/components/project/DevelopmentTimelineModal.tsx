'use client'

import { useEffect } from 'react'

import { getTimelineScopeEnd, type DevelopmentTimelineData } from '@/lib/chat/development-timeline'

const STAGES = ['제품 기획', '제품 개발', '제품 검증', '양산 준비', '시장 진입']
const SUMMARY_FIELDS: Array<[keyof DevelopmentTimelineData['summary'], string]> = [
  ['category', '제품 카테고리'], ['size', '제품 크기'], ['features', '주요 기능'],
  ['scope', '개발 단계 목표'], ['budget', '예산 범위'], ['targetUnitCost', '목표 양산 단가'],
  ['desiredDuration', '희망 개발 기간'], ['salesStrategy', '판매 전략'],
]

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!)
}

export function DevelopmentTimelineModal({ data, onClose }: { data: DevelopmentTimelineData; onClose: () => void }) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const scopeEnd = getTimelineScopeEnd(data.summary.scope)

  function download() {
    const fields = SUMMARY_FIELDS.map(([key, label]) => `<li><b>${escapeHtml(label)}</b>: ${escapeHtml(String(data.summary[key] || '—'))}${key === 'desiredDuration' && data.summary.desiredDuration !== '—' ? ` (${escapeHtml(data.summary.desiredDurationSource)})` : ''}</li>`).join('')
    const stages = STAGES.map((name, index) => {
      const active = index < scopeEnd
      const stage = data.stages[index]
      const details = active ? `<ul>${stage.tasks.map((task) => `<li>□ ${escapeHtml(task)}</li>`).join('')}</ul><h3>${escapeHtml(stage.duration || '미정')}</h3><p>${escapeHtml(stage.source)}</p>` : ''
      return `<section><h2>Stage 0${index + 1}: ${name}</h2>${details}</section>`
    }).join('')
    const html = `<!doctype html><html lang="ko"><meta charset="utf-8"><title>Product Development Timeline</title><body style="font-family:Arial,sans-serif;max-width:1200px;margin:36px auto;color:#172033"><h1>Product Development Timeline</h1><p>지금까지 대화한 내용을 바탕으로, 단계별 권장 일정을 정리했습니다.</p><section style="background:#eef0ff;padding:20px"><h2>프로젝트 요약</h2><h3>${escapeHtml(data.summary.idea)}</h3><ul>${fields}</ul></section><div style="display:flex;gap:12px">${stages}</div></body></html>`
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'product-development-timeline.html'
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-3 sm:p-6" role="dialog" aria-modal="true" aria-label="Product Development Timeline" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <section className="max-h-[94svh] w-full max-w-7xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-7">
      <header className="flex items-center justify-between gap-4"><h2 className="text-xl font-bold text-zinc-900 sm:text-2xl">Product Development Timeline</h2><div className="flex shrink-0 gap-2"><button type="button" onClick={download} className="rounded-lg border border-zinc-200 px-3 py-2 text-sm font-semibold">다운로드</button><button type="button" onClick={onClose} aria-label="닫기" className="rounded-lg border border-zinc-200 px-3 py-2 text-sm font-semibold">닫기</button></div></header>
      <p className="mt-3 text-sm leading-6 text-zinc-600">지금까지 대화한 내용을 바탕으로, 단계별 권장 일정을 정리했습니다.</p>
      <section className="mt-5 rounded-2xl bg-indigo-50 p-5">
        <h3 className="text-lg font-bold text-indigo-950">프로젝트 요약</h3><p className="mt-3 text-base font-bold text-zinc-900">{data.summary.idea}</p>
        <dl className="mt-4 grid gap-x-5 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">{SUMMARY_FIELDS.map(([key, label]) => <div key={key} className="min-w-0"><dt className="text-xs font-semibold text-zinc-500">{label}</dt><dd className="mt-1 break-words text-sm font-semibold text-zinc-800">{data.summary[key] || '—'}{key === 'desiredDuration' && data.summary.desiredDuration !== '—' ? ` · ${data.summary.desiredDurationSource}` : ''}</dd></div>)}</dl>
      </section>
      <div className="mt-7 overflow-x-auto pb-2">
        <div className="min-w-[1050px]">
          <div className="relative mb-5 h-16">
            <div className="absolute left-0 right-0 top-4 h-1 rounded-full bg-zinc-200" />
            <div className="absolute left-0 top-4 h-1 rounded-full bg-blue-600" style={{ width: `${scopeEnd * 20}%` }} />
            {Array.from({ length: 5 }, (_, index) => <span key={index} className={`absolute top-[9px] h-3 w-3 -translate-x-1/2 rounded-full border-2 ${index < scopeEnd ? 'border-blue-600 bg-blue-600' : 'border-zinc-300 bg-zinc-100'}`} style={{ left: `${10 + index * 20}%` }} />)}
            {[{ end: 2, label: '제품 기획 및 개발' }, { end: 4, label: '시제품 제작' }, { end: 5, label: '양산 및 판매' }].map(({ end, label }) => <span key={label} className={`absolute top-7 whitespace-nowrap text-[11px] font-semibold ${scopeEnd === end ? 'text-blue-700' : 'text-zinc-500'} ${end === 5 ? '-translate-x-full' : '-translate-x-1/2'}`} style={{ left: `${end * 20}%` }}>{label}</span>)}
            {scopeEnd > 0 ? <span className={`absolute top-[7px] h-5 w-5 -translate-x-1/2 rounded-full border-4 border-white bg-blue-600 shadow ${scopeEnd === 5 ? '-translate-x-full' : ''}`} style={{ left: `${scopeEnd * 20}%` }} /> : null}
          </div>
          <div className="grid grid-cols-5 gap-3">{STAGES.map((name, index) => {
            const active = index < scopeEnd
            const stage = data.stages[index]
            return <article key={name} className={`relative flex min-h-[345px] flex-col rounded-2xl border p-4 ${active ? 'border-indigo-200 bg-indigo-50' : 'border-zinc-200 bg-zinc-100 text-zinc-400'}`}>
              {!active ? <span className="absolute right-3 top-3" aria-label="비활성 단계" title="비활성 단계"><svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth="2"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg></span> : null}
              <span className={`text-xs font-bold ${active ? 'text-blue-700' : 'text-zinc-400'}`}>Stage 0{index + 1}</span><h3 className={`mt-1 text-base font-bold ${active ? 'text-zinc-900' : 'text-zinc-400'}`}>{name}</h3>
              {active ? <><ul className="mt-5 space-y-3">{stage.tasks.map((task, taskIndex) => <li key={`${task}-${taskIndex}`} className="flex gap-2 text-xs leading-5 text-zinc-700"><span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border border-blue-500 text-[10px] text-blue-600">✓</span><span>{task}</span></li>)}</ul><div className="mt-auto border-t border-indigo-200 pt-4"><p className="text-xs text-zinc-500">권장 소요 기간 · {stage.source}</p><p className="mt-1 text-xl font-bold text-blue-700">{stage.duration || '미정'}</p></div></> : <div className="mt-5 flex-1" />}
            </article>
          })}</div>
        </div>
      </div>
    </section>
  </div>
}
