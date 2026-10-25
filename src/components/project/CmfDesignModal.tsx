'use client'

import { useEffect } from 'react'

export type CmfDesignItem = {
  title: string
  description: string
  imageQueries?: string[]
  swatches?: string[]
}

export type CmfDesignData = {
  conceptTitle: string
  conceptDescription: string
  color: CmfDesignItem
  material: CmfDesignItem
  finish: CmfDesignItem
  references: string[]
}

const CMF_EXPLANATION = [
  ['C', '색 Color', '제품의 첫인상을 만드는 색과 색의 비율'],
  ['M', '소재 Material', '손과 몸에 닿았을 때 느껴지는 재질'],
  ['F', '마감 Finish', '표면의 광택과 결, 관리하기 쉬운 정도'],
]

export function CmfDesignModal({ data, onClose }: { data: CmfDesignData; onClose: () => void }) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  function downloadBoard() {
    const text = [
      'CMF Design',
      data.conceptTitle,
      data.conceptDescription,
      `C: ${data.color.title} — ${data.color.description}`,
      `M: ${data.material.title} — ${data.material.description}`,
      `F: ${data.finish.title} — ${data.finish.description}`,
    ].join('\n')
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'cmf-design.txt'
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const rows: Array<[string, CmfDesignItem]> = [['C', data.color], ['M', data.material], ['F', data.finish]]

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label="CMF Design" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className="max-h-[92svh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-7" onMouseDown={(event) => event.stopPropagation()}>
        <header className="flex items-center justify-between gap-4">
          <h2 className="text-2xl font-bold text-zinc-900">CMF Design</h2>
          <div className="flex gap-2">
            <button type="button" onClick={downloadBoard} className="rounded-lg border border-zinc-200 px-3 py-2 text-sm font-semibold">다운로드</button>
            <button type="button" onClick={onClose} className="rounded-lg border border-zinc-200 px-3 py-2 text-sm font-semibold">닫기</button>
          </div>
        </header>

        <div className="mt-4 grid gap-0 overflow-hidden rounded-xl border border-zinc-200 sm:grid-cols-4">
          <div className="p-3 text-sm font-bold text-zinc-900">CMF란?</div>
          {CMF_EXPLANATION.map(([letter, title, description]) => <div key={letter} className="border-t border-zinc-200 p-3 sm:border-l sm:border-t-0"><p className="text-sm font-bold text-zinc-900">{letter} {title}</p><p className="mt-1 text-xs leading-5 text-zinc-500">{description}</p></div>)}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)]">
          <section>
            <p className="text-xs font-bold tracking-[0.16em] text-zinc-500">CMF CONCEPT</p>
            <h3 className="mt-3 text-3xl font-bold text-zinc-900">{data.conceptTitle}</h3>
            <p className="mt-2 text-base leading-7 text-zinc-600">“{data.conceptDescription}”</p>
            <div className="mt-6 divide-y divide-zinc-200 rounded-xl border border-zinc-200">
              {rows.map(([letter, item]) => <div key={letter} className="grid gap-4 p-4 sm:grid-cols-[120px_minmax(0,1fr)]"><div className="flex flex-wrap gap-2 self-start">{(item.swatches?.length ? item.swatches : ['#E5E7EB']).map((swatch) => <span key={swatch} className="h-14 w-14 rounded-lg border border-black/10" style={{ background: swatch }} title={swatch} />)}</div><div><p className="text-xs font-bold tracking-[0.12em] text-zinc-500">{letter}</p><h4 className="mt-1 font-bold text-zinc-900">{item.title}</h4><p className="mt-1 text-sm leading-6 text-zinc-600">{item.description}</p></div></div>)}
            </div>
          </section>
          <section className="border-t border-zinc-200 pt-6 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
            <p className="text-xs font-bold tracking-[0.16em] text-zinc-500">REFERENCE</p>
            <h3 className="mt-3 text-lg font-bold text-zinc-900">비슷한 느낌의 실제 제품</h3>
            {data.references.length ? <div className="mt-4 grid grid-cols-2 gap-3">{data.references.map((src, index) => <img key={`${src}-${index}`} src={src} alt="비슷한 느낌의 실제 제품" className="aspect-square w-full rounded-xl bg-zinc-100 object-cover" referrerPolicy="no-referrer" />)}</div> : <p className="mt-4 rounded-xl bg-zinc-50 p-4 text-sm leading-6 text-zinc-500">확인 가능한 참고 이미지가 없습니다.</p>}
          </section>
        </div>
      </section>
    </div>
  )
}
