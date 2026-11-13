import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../state/store'

interface Option<T extends string> {
  value: T
  label: string
  content: ReactNode
  lang?: string
}

/** Grupo de botones excluyentes con `aria-pressed`. */
function Toggle<T extends string>(props: {
  label: string
  value: T
  options: Option<T>[]
  onChange: (value: T) => void
}) {
  return (
    <div role="group" aria-label={props.label} className="toggle">
      {props.options.map((o) => (
        <button
          key={o.value}
          type="button"
          className="toggle__button"
          aria-pressed={o.value === props.value}
          aria-label={o.label}
          title={o.label}
          lang={o.lang}
          onClick={() => props.onChange(o.value)}
        >
          {o.content}
        </button>
      ))}
    </div>
  )
}

const icon = { width: 18, height: 18, viewBox: '0 0 24 24', 'aria-hidden': true, focusable: false } as const
const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const

export function TopBar() {
  const { t } = useTranslation()
  const { theme, language, projection, setTheme, setLanguage, setProjection } = useAppStore()

  return (
    <header className="topbar panel">
      <h1 className="topbar__logo">{t('app.title')}</h1>
      {/* Hueco reservado para el buscador (INT-2). */}
      <div id="search-slot" className="topbar__search" />
      <Toggle
        label={t('topbar.language')}
        value={language}
        onChange={setLanguage}
        options={[
          { value: 'es', label: t('topbar.languages.es'), content: t('topbar.languageCodes.es'), lang: 'es' },
          { value: 'en', label: t('topbar.languages.en'), content: t('topbar.languageCodes.en'), lang: 'en' },
        ]}
      />
      <Toggle
        label={t('topbar.theme')}
        value={theme}
        onChange={setTheme}
        options={[
          {
            value: 'dark',
            label: t('topbar.themes.dark'),
            content: (
              <svg {...icon}>
                <path {...stroke} d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
              </svg>
            ),
          },
          {
            value: 'light',
            label: t('topbar.themes.light'),
            content: (
              <svg {...icon}>
                <circle {...stroke} cx="12" cy="12" r="4" />
                <path {...stroke} d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
              </svg>
            ),
          },
        ]}
      />
      <Toggle
        label={t('topbar.projection')}
        value={projection}
        onChange={setProjection}
        options={[
          {
            value: 'globe',
            label: t('topbar.projections.globe'),
            content: (
              <svg {...icon}>
                <circle {...stroke} cx="12" cy="12" r="9" />
                <path {...stroke} d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
              </svg>
            ),
          },
          {
            value: 'mercator',
            label: t('topbar.projections.mercator'),
            content: (
              <svg {...icon}>
                <rect {...stroke} x="3" y="5" width="18" height="14" rx="1" />
                <path {...stroke} d="M3 12h18M9 5v14M15 5v14" />
              </svg>
            ),
          },
        ]}
      />
    </header>
  )
}
