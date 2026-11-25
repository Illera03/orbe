import { useEffect, useState, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import type { ColorScale } from '../map/colorScale'
import { loadIndicator, type IndicatorMeta } from '../state/data'
import { useAppStore } from '../state/store'
import { legendGradient, legendLabels } from './legend'

/** Leyenda y año del indicador activo, abajo en el centro; nada sin indicador. */
export function Dock() {
  const meta = useAppStore((s) => s.catalog?.indicators.find((i) => i.id === s.indicatorId))
  // key: al cambiar de indicador se descarta la escala del anterior.
  return meta ? <DockView key={meta.id} meta={meta} /> : null
}

const PAGE = 10

/**
 * Leyenda en una línea (extremos con «≤»/«≥», rampa o tramos, unidad y muestra de «Sin dato») y deslizador de año
 * limitado a `meta.years`. El deslizador es un `input type="range"` nativo (flechas, Inicio y Fin); RePág y AvPág
 * mueven 10 años en todos los navegadores. Móvil (app.css): encima de la fila de la ficha, que sube con `--dock`.
 */
function DockView({ meta }: { meta: IndicatorMeta }) {
  const { t } = useTranslation()
  const language = useAppStore((s) => s.language)
  const year = useAppStore((s) => s.year) ?? meta.latestYear
  const setYear = useAppStore((s) => s.setYear)
  const [scale, setScale] = useState<ColorScale | null>(null)

  useEffect(() => {
    let live = true
    // Los mismos módulos y datos que la coropleta: llegan de la caché, sin otra descarga.
    Promise.all([loadIndicator(meta), import('../map/colorScale')]).then(
      ([data, lib]) => live && setScale(lib.colorScaleFor(meta, data)),
      // shortcut: sin datos no hay leyenda; el aviso de error de carga, cuando la interfaz tenga uno global.
      (error: unknown) => console.error(error),
    )
    return () => {
      live = false
    }
  }, [meta])

  const labels = scale ? legendLabels(scale, language, meta.decimals) : []

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'PageUp' && e.key !== 'PageDown') return
    e.preventDefault()
    setYear(year + (e.key === 'PageUp' ? PAGE : -PAGE))
  }

  return (
    <section className="dock panel" aria-label={t('dock.title')}>
      <div className="legend">
        {scale && (
          <>
            <span className="legend__value">{labels[0]}</span>
            <span className="legend__bar" style={{ background: legendGradient(scale) }}>
              {labels.slice(1, -1).map((label, i) => (
                <span key={i} className="legend__tick" style={{ left: `${((i + 1) / (labels.length - 1)) * 100}%` }}>
                  {label}
                </span>
              ))}
            </span>
            <span className="legend__value">{labels[labels.length - 1]}</span>
            <span className="legend__unit">{meta.unit[language]}</span>
          </>
        )}
        <span className="legend__nodata">
          <span className="legend__swatch" aria-hidden="true" />
          {t('dock.noData')}
        </span>
      </div>
      <div className="year">
        <span className="year__value" aria-hidden="true">
          {year}
        </span>
        <input
          className="year__slider"
          type="range"
          aria-label={t('dock.year')}
          min={meta.years[0]}
          max={meta.years[1]}
          step={1}
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          onKeyDown={onKeyDown}
        />
      </div>
    </section>
  )
}
