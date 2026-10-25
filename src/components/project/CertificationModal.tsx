'use client'

import { useEffect } from 'react'

export type CertificationRow = {
  name: string
  authority: string
  detail: string
  recommendation: '적극 추천' | '추천'
  reason: string
}

export type CertificationData = {
  title: string
  productContext: string
  international: CertificationRow[]
  domestic: CertificationRow[]
  note: string
  sourceSummary: string
}

export function CertificationModal({
  data,
  onClose,
}: {
  data: CertificationData
  onClose: () => void
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  function downloadBoard() {
    const text = [
      'Certification',
      data.productContext,
      ...[...data.international, ...data.domestic].map(
        (row) => `${row.name} · ${row.authority}\n${row.detail}\n${row.reason}`
      ),
      data.note,
    ].join('\n\n')
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'certification.txt'
    anchor.click()
    URL.revokeObjectURL(url)
  }

  function renderRows(rows: CertificationRow[]) {
    return rows.length ? rows.map((row) => (
      <div key={`${row.name}-${row.authority}`} className="grid gap-3 border-t border-zinc-200 p-4 sm:grid-cols-[1fr_120px_1.4fr]">
        <div>
          <p className="font-semibold text-zinc-900">{row.name}</p>
          <p className="mt-1 text-xs text-zinc-500">{row.authority} · {row.detail}</p>
        </div>
        <p className="text-sm font-semibold text-zinc-700">{row.recommendation}</p>
        <p className="text-sm leading-6 text-zinc-600">{row.reason}</p>
      </div>
    )) : <div className="border-t border-zinc-200 p-4 text-sm text-zinc-500">확인된 항목이 없습니다.</div>
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label="Certification" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className="max-h-[92svh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-7" onMouseDown={(event) => event.stopPropagation()}>
        <header className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-zinc-900">Certification</h2>
            <p className="mt-1 text-sm leading-6 text-zinc-500">세계와 국내에서 가장 많이 받는 인증 중, 이 제품에 맞는 인증을 추천합니다.</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={downloadBoard} className="rounded-lg border border-zinc-200 px-3 py-2 text-sm font-semibold">다운로드</button>
            <button type="button" onClick={onClose} className="rounded-lg border border-zinc-200 px-3 py-2 text-sm font-semibold">닫기</button>
          </div>
        </header>

        {data.productContext ? <p className="mt-6 rounded-xl bg-zinc-50 p-4 text-sm leading-6 text-zinc-600">{data.productContext}</p> : null}
        {(['international', 'domestic'] as const).map((key) => (
          <section key={key} className="mt-6 overflow-hidden rounded-xl border border-zinc-200">
            <h3 className="p-4 text-lg font-bold text-zinc-900">{key === 'international' ? '국외 인증' : '국내 인증'}</h3>
            <div className="hidden border-t border-zinc-200 bg-zinc-50 px-4 py-3 text-xs font-semibold text-zinc-500 sm:grid sm:grid-cols-[1fr_120px_1.4fr]">
              <span>인증</span><span>추천 정도</span><span>추천 이유</span>
            </div>
            {renderRows(data[key])}
          </section>
        ))}
        <p className="mt-6 text-sm leading-6 text-zinc-500">{data.note}</p>
      </section>
    </div>
  )
}
