import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { flyToBounds } from '../map/globe'
import { useAppStore } from '../state/store'
import { MOBILE } from './catalog'
import { numberFormat, rankCountries, type RankedCountry } from './rankingOrder'
import { useIndicatorValues } from './useIndicatorValues'

/** Donde empieza plegada: móvil y escritorio estrecho, donde abierta junto al catálogo taparía casi todo el mapa. */
const FOLDED = '(max-width: 1023px), (pointer: coarse)'

const NEXT: Record<string, (i: number, n: number) => number> = {
  ArrowDown: (i, n) => Math.min(i + 1, n - 1),
  ArrowUp: (i) => Math.max(i - 1, 0),
  Home: () => 0,
  End: (_, n) => n - 1,
}

/**
 * Clasificación del indicador activo en el año activo, según `order` del catálogo; los países sin dato quedan fuera
 * y se cuentan al pie. Nada sin indicador.
 * Escritorio: panel derecho plegable, abierto al empezar desde 1024 px. Móvil: botón de 44 px al final de la fila inferior que abre
 * una hoja. Las filas son botones con tabulación itinerante (una sola parada de Tab; flechas, Inicio y Fin) y al
 * pulsarlas la cámara vuela al país. Se resalta la fila del país bajo el puntero.
 */
export function Ranking() {
  const { t } = useTranslation()
  const { meta, year, language, values, countries, failed } = useIndicatorValues()
  const hovered = useAppStore((s) => s.hoveredCountry)
  const markInteraction = useAppStore((s) => s.markInteraction)
  const [open, setOpen] = useState(() => !globalThis.matchMedia?.(FOLDED).matches)
  const [active, setActive] = useState(0)
  const toggle = useRef<HTMLButtonElement>(null)
  const list = useRef<HTMLOListElement>(null)

  const rows = useMemo(
    () => (meta && values && countries ? rankCountries(values, countries, meta.order, language) : null),
    [meta, values, countries, language],
  )
  const format = useMemo(() => numberFormat(language, meta?.decimals ?? 0), [language, meta])
  const current = rows ? Math.min(active, rows.length - 1) : 0

  useEffect(() => {
    const query = globalThis.matchMedia?.(FOLDED)
    // Si el ancho cambió entre el primer render y la suscripción, ese cambio no llega como evento.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sincroniza con matchMedia, un sistema externo
    if (query) setOpen(!query.matches)
    const onChange = (e: MediaQueryListEvent) => setOpen(!e.matches)
    query?.addEventListener('change', onChange)
    return () => query?.removeEventListener('change', onChange)
  }, [])

  // La fila del país bajo el puntero se trae a la vista dentro de la lista.
  useEffect(() => {
    if (open && hovered) list.current?.querySelector(`[data-a3="${hovered}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [open, hovered])

  if (!meta) return null

  const collapse = () => {
    setOpen(false)
    toggle.current?.focus()
  }

  // En móvil la hoja se cierra para ver el vuelo; en escritorio el panel sigue abierto.
  const choose = (row: RankedCountry) => {
    markInteraction()
    flyToBounds(row.bbox)
    if (globalThis.matchMedia?.(MOBILE).matches) collapse()
  }

  const onListKey = (e: KeyboardEvent) => {
    const next = NEXT[e.key]
    if (!next || !rows?.length) return
    e.preventDefault()
    const i = next(current, rows.length)
    setActive(i)
    list.current?.querySelectorAll('button')[i]?.focus()
  }

  const missing = rows && countries ? countries.length - rows.length : 0

  return (
    <section
      className="ranking panel"
      aria-labelledby="ranking-title"
      data-open={open || undefined}
      onKeyDown={(e) => e.key === 'Escape' && open && collapse()}
    >
      <h2 id="ranking-title" className="ranking__heading">
        <button
          ref={toggle}
          type="button"
          className="ranking__toggle"
          aria-expanded={open}
          aria-controls="ranking-body"
          onClick={() => setOpen((x) => !x)}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M4 6h16M4 12h11M4 18h6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span className="ranking__label">{t('ranking.title')}</span>
          <svg className="ranking__chevron" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </h2>
      <div id="ranking-body" className="ranking__body" hidden={!open}>
        {failed && !rows ? (
          <p className="ranking__status" role="alert">
            {t('ranking.error')}
          </p>
        ) : !rows ? (
          <p className="ranking__status" role="status">
            {t('ranking.loading')}
          </p>
        ) : (
          <>
            <p className="ranking__caption">{t('ranking.caption', { unit: meta.unit[language], year })}</p>
            <ol ref={list} className="ranking__list" onKeyDown={onListKey}>
              {rows.map((row, i) => {
                const value = format.format(row.value)
                return (
                  <li key={row.a3}>
                    <button
                      type="button"
                      className="ranking__row"
                      data-a3={row.a3}
                      data-hovered={row.a3 === hovered || undefined}
                      tabIndex={i === current ? 0 : -1}
                      onFocus={() => setActive(i)}
                      onClick={() => choose(row)}
                    >
                      {/* Nombre accesible «Puesto 1: Mónaco, 86,5 años», que contiene el texto visible (WCAG 2.5.3). */}
                      <span className="visually-hidden">{t('ranking.rank')} </span>
                      <span className="ranking__rank">{row.rank}</span>
                      <span className="visually-hidden">: </span>
                      <span className="ranking__name">{row.name}</span>
                      <span className="visually-hidden">, </span>
                      <span className="ranking__value">{value}</span>
                      <span className="visually-hidden"> {meta.unit[language]}</span>
                    </button>
                  </li>
                )
              })}
            </ol>
            {missing > 0 && <p className="ranking__caption">{t('ranking.missing', { count: missing })}</p>}
          </>
        )}
      </div>
    </section>
  )
}
