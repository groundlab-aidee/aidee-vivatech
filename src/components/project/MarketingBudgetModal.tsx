'use client'

import { useEffect } from 'react'

import { formatBudgetAmount, type MarketingBudgetData } from '@/lib/chat/marketing-budget'

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!)
}

export function MarketingBudgetModal({ data, onClose }: { data: MarketingBudgetData; onClose: () => void }) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const allocatedTotal = data.allocations.every((item) => item.amount !== null)
    ? data.allocations.reduce((sum, item) => sum + (item.amount ?? 0), 0)
    : null
  const allocationMismatch = allocatedTotal !== null && data.totalBudget.amount !== null && allocatedTotal !== data.totalBudget.amount

  function download() {
    const allocations = data.allocations.map((item) => `<li><b>${escapeHtml(item.name)}</b>: ${escapeHtml(formatBudgetAmount(item.amount, data.currency))} (${escapeHtml(item.source)})</li>`).join('')
    const activities = data.activities.map((item) => `<li><b>${escapeHtml(item.name)}</b><br>목적: ${escapeHtml(item.purpose)} · 대상: ${escapeHtml(item.target)}</li>`).join('')
    const html = `<!doctype html><html lang="ko"><meta charset="utf-8"><title>Marketing Budget</title><body style="font-family:Arial,sans-serif;max-width:1000px;margin:40px auto;color:#172033"><h1>Marketing Budget</h1><p>설정한 전체 예산을 바탕으로, 마케팅에 쓰기를 추천하는 금액을 정리합니다.</p><h2>전체 예산: ${escapeHtml(formatBudgetAmount(data.totalBudget.amount, data.currency))} · ${escapeHtml(data.totalBudget.source)}</h2><h3>예산 배분</h3><ul>${allocations}</ul><h3>추천 마케팅 예산: ${escapeHtml(formatBudgetAmount(data.recommendation.amount, data.currency))}</h3><p>${data.recommendation.percent === null ? '비율 미정' : `전체 예산의 약 ${data.recommendation.percent}%`} · 예상값 · ${escapeHtml(data.recommendation.reason)}</p><h3>마케팅 체크리스트</h3><ul>${activities}</ul></body></html>`
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'marketing-budget.html'
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-3 sm:p-6" role="dialog" aria-modal="true" aria-label="Marketing Budget" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <section className="max-h-[94svh] w-full max-w-6xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-7">
      <header className="flex items-center justify-between gap-4"><h2 className="text-2xl font-bold text-zinc-900">Marketing Budget</h2><div className="flex gap-2"><button type="button" onClick={download} className="rounded-lg border border-zinc-200 px-3 py-2 text-sm font-semibold">다운로드</button><button type="button" aria-label="닫기" onClick={onClose} className="rounded-lg border border-zinc-200 px-3 py-2 text-sm font-semibold">닫기</button></div></header>
      <p className="mt-3 text-sm leading-6 text-zinc-600">설정한 전체 예산을 바탕으로, 마케팅에 쓰기를 추천하는 금액을 정리합니다.</p>
      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <section className="rounded-2xl bg-indigo-50 p-5 sm:p-6">
          <div className="text-sm font-semibold text-indigo-900">전체 예산 <span className="ml-2 rounded-full bg-white/80 px-2 py-1 text-xs">{data.totalBudget.source}</span></div>
          <div className="mt-1 text-3xl font-bold text-zinc-950">{formatBudgetAmount(data.totalBudget.amount, data.currency)}</div>
          <div className="mt-6 space-y-4">
            {data.allocations.length ? data.allocations.map((item, index) => {
              const marketing = /마케팅|알리기|판매 준비/.test(item.name)
              const percent = item.amount !== null && data.totalBudget.amount ? Math.min(100, Math.max(0, item.amount / data.totalBudget.amount * 100)) : 0
              return <div key={`${item.name}-${index}`}>
                <div className={`mb-1 flex items-baseline justify-between gap-3 text-sm ${marketing ? 'font-bold text-blue-700' : 'font-semibold text-zinc-700'}`}><span>{item.name} <small className="ml-1 font-normal text-zinc-500">{item.source}</small></span><span>{formatBudgetAmount(item.amount, data.currency)}</span></div>
                <div className="h-2.5 overflow-hidden rounded-full bg-white"><div className={`h-full rounded-full ${marketing ? 'bg-blue-600' : 'bg-indigo-300'}`} style={{ width: `${percent}%` }} /></div>
              </div>
            }) : <p className="text-sm text-zinc-500">배분 항목 미정</p>}
          </div>
          {allocationMismatch ? <p className="mt-3 text-xs font-semibold text-amber-700">배분 합계 {formatBudgetAmount(allocatedTotal, data.currency)}가 전체 예산과 일치하지 않습니다.</p> : null}
          <div className="mt-6 border-t border-indigo-200 pt-5">
            <div className="text-sm font-semibold text-zinc-700">추천 마케팅 예산 <span className="ml-1 text-xs font-normal text-zinc-500">{data.recommendation.source}값</span></div>
            <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1"><strong className="text-3xl font-bold text-blue-700">{formatBudgetAmount(data.recommendation.amount, data.currency)}</strong><span className="text-sm text-blue-700">{data.recommendation.percent === null ? '비율 미정' : `전체 예산의 약 ${data.recommendation.percent}%를 마케팅에 쓰기를 권장합니다.`}</span></div>
            <p className="mt-2 text-sm leading-5 text-zinc-600">{data.recommendation.reason}</p><p className="mt-2 text-xs text-zinc-500">추천 금액과 비율은 예상값입니다.</p>
          </div>
        </section>
        <section>
          <h3 className="mb-3 text-lg font-bold text-zinc-900">마케팅 체크리스트</h3>
          <div className="space-y-3">{data.activities.length ? data.activities.map((item, index) => <article key={`${item.name}-${index}`} className="flex gap-3 rounded-xl border border-zinc-200 p-4"><span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs text-white">✓</span><div className="min-w-0"><h4 className="font-bold text-zinc-900">{item.name}</h4><div className="mt-2 grid gap-2 text-sm sm:grid-cols-2"><p><b className="text-blue-700">목적</b><span className="ml-2 text-zinc-600">{item.purpose}</span></p><p><b className="text-blue-700">대상</b><span className="ml-2 text-zinc-600">{item.target}</span></p></div></div></article>) : <p className="rounded-xl border border-zinc-200 p-4 text-sm text-zinc-500">마케팅 활동 미정</p>}</div>
        </section>
      </div>
    </section>
  </div>
}
