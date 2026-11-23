import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { initIndicator, useAppStore } from '../state/store'
import { groupByCategory } from './catalog'

// La misma consulta que app.css usa para la disposición móvil.
const MOBILE = '(max-width: 640px), (pointer: coarse)'

/**
 * Catálogo de indicadores por categoría, generado solo con `catalog.json`.
 * Escritorio: panel izquierdo plegable, abierto al empezar. Móvil: hoja inferior que abre un botón de 44 px.
 * Cada indicador es un botón con `aria-pressed`; volver a pulsar el activo lo quita.
 */
export function CatalogPanel() {
  const { t } = useTranslation()
  const language = useAppStore((s) => s.language)
  const catalog = useAppStore((s) => s.catalog)
  const indicatorId = useAppStore((s) => s.indicatorId)
  const setIndicator = useAppStore((s) => s.setIndicator)
  const clearIndicator = useAppStore((s) => s.clearIndicator)
  const [open, setOpen] = useState(() => !globalThis.matchMedia?.(MOBILE).matches)
  const [failed, setFailed] = useState(false)
  const toggle = useRef<HTMLButtonElement>(null)

  // El panel se monta una vez con la app: aquí arranca la carga del catálogo y la lectura de ?indicador=.
  const load = useCallback(() => {
    setFailed(false)
    initIndicator().catch(() => setFailed(true))
  }, [])
  // eslint-disable-next-line react-hooks/set-state-in-effect -- la carga es externa; solo marca el fallo
  useEffect(load, [load])

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && open) {
      setOpen(false)
      toggle.current?.focus()
    }
  }

  return (
    <section className="catalog panel" aria-labelledby="catalog-title" data-open={open || undefined} onKeyDown={onKeyDown}>
      <h2 id="catalog-title" className="catalog__heading">
        <button
          ref={toggle}
          type="button"
          className="catalog__toggle"
          aria-expanded={open}
          aria-controls="catalog-body"
          onClick={() => setOpen((x) => !x)}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M4 6h16M4 12h16M4 18h10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          {t('catalog.title')}
          <svg className="catalog__chevron" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </h2>
      <div id="catalog-body" className="catalog__body" hidden={!open}>
        {failed ? (
          <p className="catalog__status" role="alert">
            {t('catalog.error')}{' '}
            <button type="button" className="catalog__retry" onClick={load}>
              {t('catalog.retry')}
            </button>
          </p>
        ) : !catalog ? (
          <p className="catalog__status" role="status">
            {t('catalog.loading')}
          </p>
        ) : (
          groupByCategory(catalog.indicators).map(({ category, indicators }) => (
            <section key={category} className="catalog__group" aria-labelledby={`catalog-${category}`}>
              <h3 id={`catalog-${category}`} className="catalog__category">
                {t(`categories.${category}`)}
              </h3>
              <ul className="catalog__list">
                {indicators.map((i) => {
                  const active = i.id === indicatorId
                  return (
                    <li key={i.id}>
                      <button
                        type="button"
                        className="catalog__option"
                        aria-pressed={active}
                        aria-describedby={`catalog-desc-${i.id}`}
                        onClick={() => (active ? clearIndicator() : setIndicator(i.id))}
                      >
                        {i.name[language]}
                      </button>
                      <p id={`catalog-desc-${i.id}`} className="catalog__description">
                        {i.description[language]}
                      </p>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))
        )}
      </div>
    </section>
  )
}
