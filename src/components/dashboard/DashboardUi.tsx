'use client'

import type { ReactNode } from 'react'

export function DashboardSegmentedControl<T extends string>({
  ariaLabel,
  items,
  onChange,
  value,
}: {
  ariaLabel: string
  items: Array<{ label: string; value: T }>
  onChange: (value: T) => void
  value: T
}) {
  return (
    <div
      className="grid w-full min-w-0 rounded-lg bg-[#CDE14D] p-0.5 shadow-[inset_1px_1px_2px_0px_rgba(0,0,0,0.25)]"
      style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
      role="group"
      aria-label={ariaLabel}
    >
      {items.map((item) => {
        const selected = value === item.value

        return (
          <button
            key={item.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(item.value)}
            className={`rounded-md px-2 py-1 text-xs leading-4 transition ${
              selected
                ? 'bg-white font-medium text-black shadow-[0px_1px_3px_0px_rgba(36,34,31,0.10)]'
                : 'font-normal text-black/60 hover:text-black'
            }`}
          >
            {item.label}
          </button>
        )
      })}
    </div>
  )
}

export function DashboardEmptyState({
  description,
  icon,
  title,
}: {
  description: string
  icon: ReactNode
  title: string
}) {
  return (
    <div className="flex min-h-40 flex-1 flex-col items-center justify-center rounded-xl bg-[var(--semantic-surface-overlay-default)] px-6 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--semantic-surface-overlay-raised-strong)] text-lg text-[var(--semantic-text-quinary)]">
        {icon}
      </div>
      <p className="mt-3 text-sm font-semibold text-[var(--semantic-text-tertiary)]">
        {title}
      </p>
      <p className="mt-1 text-xs font-medium leading-5 text-[var(--semantic-text-quinary)]">
        {description}
      </p>
    </div>
  )
}
