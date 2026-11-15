import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { flyToBounds } from '../map/globe'
import { useAppStore } from '../state/store'
import { buildIndex, loadCountries, search, type Country, type CountryEntry } from './countryIndex'

const icon = { width: 18, height: 18, viewBox: '0 0 24 24', 'aria-hidden': true, focusable: false } as const
const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const

/**
 * Buscador de países con el patrón combobox de ARIA (lista con `aria-activedescendant`).
 * Escritorio: campo siempre visible. Móvil: un botón de 44 px despliega el campo bajo la barra (app.css).
 * `countries.json` se descarga al enfocar el campo, no en el arranque.
 * La lista va en un portal fuera de la barra: dentro, el `backdrop-filter` de la barra anula el de la lista.
 * Va dentro de <main> (axe: region). <main> no está en el DOM durante el primer render, así que el destino se
 * resuelve al montar y el portal (con la región viva) ya no cambia de sitio.
 */
export function CountrySearch() {
  const { t } = useTranslation()
  const language = useAppStore((s) => s.language)
  const markInteraction = useAppStore((s) => s.markInteraction)
  const [countries, setCountries] = useState<Country[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [query, setQuery] = useState('')
  /** País elegido (alfa-3): su nombre se muestra en el idioma activo aunque este cambie después. */
  const [chosen, setChosen] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const [expanded, setExpanded] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const toggle = useRef<HTMLButtonElement>(null)
  const popup = useRef<HTMLDivElement>(null)
  const listId = useId()

  const index = useMemo(() => (countries ? buildIndex(countries, language) : []), [countries, language])
  const value = (chosen && index.find((c) => c.a3 === chosen)?.name) || query
  const results = useMemo(() => search(index, value, language), [index, value, language])
  const showList = open && results.length > 0

  const [host, setHost] = useState<Element | null>(null)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- el DOM solo existe tras montar
    setHost(document.querySelector('main') ?? document.body)
  }, [])

  useEffect(() => {
    if (expanded) input.current?.focus()
  }, [expanded])

  // La lista se coloca bajo la barra, alineada con el campo; la separación la pone app.css.
  useLayoutEffect(() => {
    if (!open) return
    const place = () => {
      const field = input.current?.getBoundingClientRect()
      const bar = input.current?.closest('header')?.getBoundingClientRect()
      if (!field || !bar || !popup.current) return
      Object.assign(popup.current.style, { top: `${bar.bottom}px`, left: `${field.left}px`, width: `${field.width}px` })
    }
    place()
    window.addEventListener('resize', place)
    return () => window.removeEventListener('resize', place)
  }, [open, expanded])

  const load = () => {
    if (countries) return
    setFailed(false)
    loadCountries().then(setCountries, () => setFailed(true))
  }

  const close = () => {
    setOpen(false)
    setActive(-1)
  }

  const collapse = () => {
    setExpanded(false)
    toggle.current?.focus()
  }

  const choose = (country: CountryEntry) => {
    markInteraction()
    flyToBounds(country.bbox)
    setChosen(country.a3)
    setQuery(country.name)
    close()
    if (expanded) collapse()
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    const n = results.length
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setOpen(true)
        // Alt+↓ solo abre la lista, sin mover la opción activa (APG).
        if (n && !e.altKey) setActive((a) => (showList ? (a + 1) % n : 0))
        break
      case 'ArrowUp':
        e.preventDefault()
        setOpen(true)
        if (n) setActive((a) => (showList && a > 0 ? a - 1 : n - 1))
        break
      case 'Enter':
        if (showList) {
          e.preventDefault()
          choose(results[Math.max(active, 0)])
        }
        break
      case 'Escape':
        if (showList) close()
        else if (value) {
          setChosen(null)
          setQuery('')
        }
        else if (expanded) collapse()
        break
    }
  }

  let status = ''
  if (open && value.trim()) {
    if (failed) status = t('search.error')
    else if (!countries) status = t('search.loading')
    else status = results.length ? t('search.results', { count: results.length }) : t('search.noResults')
  }

  return (
    <>
      <button
        ref={toggle}
        type="button"
        className="switch"
        aria-expanded={expanded}
        aria-controls="search-slot"
        aria-label={expanded ? t('search.close') : t('search.open')}
        title={expanded ? t('search.close') : t('search.open')}
        onClick={() => setExpanded((x) => !x)}
      >
        <svg {...icon}>
          {expanded ? (
            <path {...stroke} d="M6 6l12 12M18 6L6 18" />
          ) : (
            <>
              <circle {...stroke} cx="11" cy="11" r="7" />
              <path {...stroke} d="M20 20l-4-4" />
            </>
          )}
        </svg>
      </button>
      <div id="search-slot" className="topbar__search search" data-open={expanded || undefined}>
        <input
          ref={input}
          className="search__input"
          type="text"
          role="combobox"
          aria-label={t('search.label')}
          aria-autocomplete="list"
          aria-expanded={showList}
          aria-controls={listId}
          aria-activedescendant={showList && active >= 0 ? `${listId}-${active}` : undefined}
          placeholder={t('search.placeholder')}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          enterKeyHint="search"
          value={value}
          onFocus={load}
          onBlur={close}
          onChange={(e) => {
            // Sin load(): tras un fallo, se reintenta al volver a enfocar y no con cada tecla.
            setChosen(null)
            setQuery(e.target.value)
            setOpen(true)
            setActive(-1)
          }}
          onKeyDown={onKeyDown}
        />
      </div>
      {host &&
        createPortal(
          <div ref={popup} className="search__popup">
            <ul id={listId} role="listbox" aria-label={t('search.label')} className="search__list panel" hidden={!showList}>
              {results.map((c, i) => (
                <li
                  key={c.a3}
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={i === active}
                  className="search__option"
                  // Sin esto el campo pierde el foco y la lista se cierra antes del clic.
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => choose(c)}
                >
                  {c.name}
                </li>
              ))}
            </ul>
            {/* Con resultados el aviso solo lo oye el lector de pantalla; sin ellos (o con error) se ve bajo el campo. */}
            <p role="status" className={showList || !status ? 'visually-hidden' : 'search__status panel'}>
              {status}
            </p>
          </div>,
          host,
        )}
    </>
  )
}
