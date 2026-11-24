import { useEffect, useMemo, useState } from 'react'
import { loadIndicator, type IndicatorData } from '../state/data'
import { useAppStore } from '../state/store'
import { buildIndex, loadCountries, type Country } from './countryIndex'

type Loaded = { id: string; data: IndicatorData; lib: typeof import('../map/colorScale'); countries: Country[] }

/**
 * Datos del indicador activo para el tooltip y la clasificación: valores del año activo por alfa-3 y países con
 * su nombre en el idioma activo. Todo sale de la caché de `loadData` y del mismo trozo que ya pide la coropleta.
 */
export function useIndicatorValues() {
  const language = useAppStore((s) => s.language)
  const year = useAppStore((s) => s.year)
  const meta = useAppStore((s) => s.catalog?.indicators.find((i) => i.id === s.indicatorId))
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const [failed, setFailed] = useState<string | null>(null)

  useEffect(() => {
    if (!meta) return
    let live = true
    // valuesForYear vive con d3-scale (≈ 17 KB): se importa bajo demanda, fuera del JS inicial.
    Promise.all([loadIndicator(meta), import('../map/colorScale'), loadCountries()]).then(
      ([data, lib, countries]) => live && setLoaded({ id: meta.id, data, lib, countries }),
      () => live && setFailed(meta.id),
    )
    return () => {
      live = false
    }
  }, [meta])

  const ready = meta && loaded?.id === meta.id ? loaded : null
  const values = useMemo(() => (ready && year != null ? ready.lib.valuesForYear(ready.data, year) : null), [ready, year])
  const countries = useMemo(() => (ready ? buildIndex(ready.countries, language) : null), [ready, language])
  return { meta, year, language, values, countries, failed: !!meta && failed === meta.id }
}
