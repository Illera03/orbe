import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../state/store'
import { numberFormat } from './rankingOrder'
import { useIndicatorValues } from './useIndicatorValues'

/** Separación entre el puntero y el tooltip, en píxeles. */
const GAP = 16

/**
 * Tooltip del país bajo el puntero (`hoveredCountry`, que publica la coropleta) con el indicador activo: nombre,
 * valor con unidad y año, o «Sin dato». Sigue al puntero sin salirse de la ventana y no captura eventos.
 * Es solo visual (`aria-hidden`): la clasificación da lo mismo a teclado y lector de pantalla.
 * shortcut: sin táctil, porque la coropleta solo publica el país con `mousemove`; llega en M3 con un toque en el mapa.
 */
export function Tooltip() {
  const { t } = useTranslation()
  const hovered = useAppStore((s) => s.hoveredCountry)
  const { meta, year, language, values, countries } = useIndicatorValues()
  const box = useRef<HTMLDivElement>(null)
  const pointer = useRef({ x: 0, y: 0 })

  // Abajo a la derecha del puntero; si no cabe, al otro lado.
  const place = useCallback(() => {
    const el = box.current
    if (!el) return
    const { x, y } = pointer.current
    const { width, height } = el.getBoundingClientRect()
    const left = x + GAP + width > innerWidth ? Math.max(0, x - GAP - width) : x + GAP
    const top = y + GAP + height > innerHeight ? Math.max(0, y - GAP - height) : y + GAP
    el.style.transform = `translate(${left}px, ${top}px)`
  }, [])

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      pointer.current = { x: e.clientX, y: e.clientY }
      place()
    }
    addEventListener('pointermove', onMove, { passive: true })
    return () => removeEventListener('pointermove', onMove)
  }, [place])
  // Al cambiar el contenido cambia el tamaño: se vuelve a colocar antes de pintar.
  useLayoutEffect(place)

  const country = hovered ? countries?.find((c) => c.a3 === hovered) : undefined
  if (!meta || !country || !values || year == null) return null
  const value = values.get(country.a3)

  return (
    <div ref={box} className="tooltip panel" aria-hidden="true">
      <strong className="tooltip__name">{country.name}</strong>
      <span className="tooltip__value">
        {value == null
          ? t('values.noData')
          : t('values.withUnit', { value: numberFormat(language, meta.decimals).format(value), unit: meta.unit[language] })}{' '}
        <span className="tooltip__year">{t('values.inYear', { year })}</span>
      </span>
    </div>
  )
}
