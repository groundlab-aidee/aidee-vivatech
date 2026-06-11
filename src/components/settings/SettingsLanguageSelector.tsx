'use client'

import {
  useAppLanguage,
  type AppLanguage,
} from '@/components/i18n/AppLanguageContext'

const options: Array<{ label: string; value: AppLanguage }> = [
  { label: '한국어', value: 'KOR' },
  { label: 'English', value: 'ENG' },
]

export function SettingsLanguageSelector() {
  const { language, setLanguage } = useAppLanguage()

  return (
    <div className="flex w-full min-w-0 max-w-72 rounded-lg bg-[#DDF444] p-0.5 shadow-[inset_1px_1px_6px_0.5px_rgba(0,0,0,0.10)]">
      {options.map((option) => {
        const isActive = language === option.value

        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={isActive}
            onClick={() => setLanguage(option.value)}
            className={`min-w-0 flex-1 truncate rounded-md px-1 py-1 text-xs leading-4 transition ${
              isActive
                ? 'bg-white font-medium text-neutral-900 shadow-[0px_1px_3px_0px_rgba(36,34,31,0.10)]'
                : 'font-normal text-neutral-900/60 hover:text-neutral-900'
            }`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
