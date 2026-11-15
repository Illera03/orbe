import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../state/store'
import { CountrySearch } from './CountrySearch'

interface Option<T extends string> {
  value: T
  label: string
  /** Etiqueta del botón móvil que lleva a esta opción; si hay texto visible, empieza por él (WCAG 2.5.3). */
  action: string
  content: ReactNode
  lang?: string
}

// Con texto visible (ES/EN) el nombre accesible es ese texto (WCAG 2.5.3); el nombre largo va en `title`.
const nameOf = (o: Option<string>, label: string) => (typeof o.content === 'string' ? undefined : label)

/**
 * Escritorio: grupo de botones excluyentes con `aria-pressed`.
 * Móvil: un único botón táctil que pasa a la otra opción; su etiqueta es la de destino.
 * Solo uno de los dos se muestra (app.css), el otro queda con display: none y fuera del árbol accesible.
 */
function Toggle<T extends string>(props: {
  label: string
  value: T
  options: [Option<T>, Option<T>]
  onChange: (value: T) => void
}) {
  const next = props.options.find((o) => o.value !== props.value)!
  return (
    <>
      <div role="group" aria-label={props.label} className="toggle">
        {props.options.map((o) => (
          <button
            key={o.value}
            type="button"
            className="toggle__button"
            aria-pressed={o.value === props.value}
            aria-label={nameOf(o, o.label)}
            title={o.label}
            lang={o.lang}
            onClick={() => props.onChange(o.value)}
          >
            {o.content}
          </button>
        ))}
      </div>
      <button
        type="button"
        className="switch"
        aria-label={next.action}
        title={next.action}
        onClick={() => props.onChange(next.value)}
      >
        {next.content}
      </button>
    </>
  )
}

const icon = { width: 18, height: 18, viewBox: '0 0 24 24', 'aria-hidden': true, focusable: false } as const
const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const

export function TopBar() {
  const { t } = useTranslation()
  const theme = useAppStore((s) => s.theme)
  const language = useAppStore((s) => s.language)
  const projection = useAppStore((s) => s.projection)
  const setTheme = useAppStore((s) => s.setTheme)
  const setLanguage = useAppStore((s) => s.setLanguage)
  const setProjection = useAppStore((s) => s.setProjection)

  return (
    <header className="topbar panel">
      <h1 className="topbar__logo">{t('app.title')}</h1>
      <CountrySearch />
      <Toggle
        label={t('topbar.language')}
        value={language}
        onChange={setLanguage}
        options={[
          {
            value: 'es',
            label: t('topbar.languages.es'),
            action: t('topbar.actions.es'),
            content: t('topbar.languageCodes.es'),
            lang: 'es',
          },
          {
            value: 'en',
            label: t('topbar.languages.en'),
            action: t('topbar.actions.en'),
            content: t('topbar.languageCodes.en'),
            lang: 'en',
          },
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
            action: t('topbar.actions.dark'),
            content: (
              <svg {...icon}>
                <path {...stroke} d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
              </svg>
            ),
          },
          {
            value: 'light',
            label: t('topbar.themes.light'),
            action: t('topbar.actions.light'),
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
            action: t('topbar.actions.globe'),
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
            action: t('topbar.actions.mercator'),
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
