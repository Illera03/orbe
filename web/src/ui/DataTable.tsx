import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
// colorScale arrastra d3-scale: este módulo solo se carga con import() al abrir la tabla.
import { valuesForYear } from '../map/colorScale'
import { loadIndicator, type IndicatorData, type IndicatorMeta } from '../state/data'
import { useAppStore } from '../state/store'
import { loadCountries, type Country } from './countryIndex'
import { tableRows, valueFormat, type Sort, type SortKey } from './table'

const ARIA_SORT = { asc: 'ascending', desc: 'descending' } as const

/**
 * Alternativa textual al mapa (SPEC, Accesibilidad): diálogo modal nativo con la tabla del indicador activo en el año
 * activo. `showModal()` deja el foco dentro y Escape lo cierra; quien lo abre devuelve el foco en `onClose`.
 */
export default function DataTable({ meta, onClose }: { meta: IndicatorMeta; onClose: () => void }) {
  const { t } = useTranslation()
  const language = useAppStore((s) => s.language)
  const year = useAppStore((s) => s.year) ?? meta.latestYear
  const [sort, setSort] = useState<Sort>({ key: 'value', dir: meta.order })
  const [loaded, setLoaded] = useState<{ data: IndicatorData; countries: Country[] } | null>(null)
  const [failed, setFailed] = useState(false)
  const dialog = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const d = dialog.current
    if (d && !d.open) d.showModal()
  }, [])

  useEffect(() => {
    Promise.all([loadIndicator(meta), loadCountries()]).then(
      ([data, countries]) => setLoaded({ data, countries }),
      () => setFailed(true),
    )
  }, [meta])

  const rows = useMemo(
    () => (loaded ? tableRows(loaded.countries, valuesForYear(loaded.data, year), language, sort) : []),
    [loaded, year, language, sort],
  )
  const format = valueFormat(language, meta.decimals)

  const sortBy = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: key === 'value' ? meta.order : 'asc' }))

  const header = (key: SortKey) => (
    <th scope="col" className={`table__th table__th--${key}`} aria-sort={sort.key === key ? ARIA_SORT[sort.dir] : undefined}>
      <button type="button" className="table__sort" onClick={() => sortBy(key)}>
        {t(`table.${key}`)}
        <svg className="table__arrow" width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path
            d={sort.key !== key ? 'M8 9l4-4 4 4M8 15l4 4 4-4' : sort.dir === 'asc' ? 'M6 15l6-6 6 6' : 'M6 9l6 6 6-6'}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </th>
  )

  return (
    <dialog ref={dialog} className="table panel" aria-labelledby="table-caption" onClose={onClose}>
      <button type="button" className="table__close" aria-label={t('table.close')} title={t('table.close')} onClick={() => dialog.current?.close()}>
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
      <table className="table__grid">
        <caption id="table-caption" className="table__caption">
          {t('table.caption', { name: meta.name[language], year, unit: meta.unit[language] })}
        </caption>
        <thead>
          <tr>
            {header('country')}
            {header('value')}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.a3}>
              <th scope="row">{r.name}</th>
              <td className={r.value === null ? 'table__nodata' : undefined}>{r.value === null ? t('table.noData') : format.format(r.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {!loaded && (
        <p className="table__status" role={failed ? 'alert' : 'status'}>
          {t(failed ? 'table.error' : 'table.loading')}
        </p>
      )}
    </dialog>
  )
}
