import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { IndicatorMeta } from '../state/data'
import { useAppStore, type Language } from '../state/store'

/** Ficha del indicador activo; nada sin indicador. */
export function SourceCard() {
  const language = useAppStore((s) => s.language)
  const year = useAppStore((s) => s.year)
  const meta = useAppStore((s) => s.catalog?.indicators.find((i) => i.id === s.indicatorId))
  return meta ? <SourceCardView meta={meta} year={year} language={language} /> : null
}

/**
 * Nombre, fuente, año, unidad y licencia con su atribución. No se pliega (como la atribución del mapa, D31).
 * Nombre, unidad y textos de la fuente salen del catálogo, no de i18n.
 * Móvil (app.css): una fila de 44 px con nombre, año y licencia; el botón «Fuente» despliega el resto.
 * En escritorio esa fila resumida y el botón no se muestran y la ficha va entera.
 */
export function SourceCardView({ meta, year, language }: { meta: IndicatorMeta; year: number | null; language: Language }) {
  const { t } = useTranslation()
  const clearIndicator = useAppStore((s) => s.clearIndicator)
  const [expanded, setExpanded] = useState(false)
  const license = (
    <>
      <a href={meta.license.url} target="_blank" rel="noreferrer">
        {meta.license.id}
        <span className="visually-hidden"> {t('source.newTab')}</span>
      </a>
      {!meta.license.commercial && <strong className="source__nc">{t('source.nonCommercial')}</strong>}
    </>
  )

  return (
    <section className="source panel" aria-labelledby="source-title" data-expanded={expanded || undefined}>
      <div className="source__head">
        <h2 id="source-title" className="source__title">
          {meta.name[language]}
        </h2>
        <p className="source__brief">
          <span>{year}</span>
          <span>{license}</span>
        </p>
        <button
          type="button"
          className="source__more"
          aria-expanded={expanded}
          aria-controls="source-details"
          onClick={() => setExpanded((x) => !x)}
        >
          {t('source.source')}
        </button>
        <button type="button" className="source__clear" aria-label={t('source.clear')} title={t('source.clear')} onClick={clearIndicator}>
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      <div id="source-details" className="source__details">
        <dl className="source__facts">
          <div>
            <dt>{t('source.source')}</dt>
            <dd>
              <a href={meta.source.url} target="_blank" rel="noreferrer">
                {meta.source.name}
                <span className="visually-hidden"> {t('source.newTab')}</span>
              </a>
            </dd>
          </div>
          <div>
            <dt>{t('source.year')}</dt>
            <dd>{year}</dd>
          </div>
          <div>
            <dt>{t('source.unit')}</dt>
            <dd>{meta.unit[language]}</dd>
          </div>
          <div>
            <dt>{t('source.license')}</dt>
            <dd>{license}</dd>
          </div>
        </dl>
        <p className="source__attribution">{meta.license.attribution}</p>
      </div>
    </section>
  )
}
