import type { Category, IndicatorMeta } from '../state/data'

/** Orden fijo de las categorías en el panel (SPEC, «Catálogo inicial»). */
export const CATEGORIES: readonly Category[] = [
  'demografia',
  'economia',
  'salud',
  'educacion',
  'medio-ambiente',
  'energia',
  'geografia',
  'sociedad',
]

/** Indicadores por categoría, en el orden de `CATEGORIES` y del catálogo; sin las categorías vacías. */
export function groupByCategory(indicators: readonly IndicatorMeta[]) {
  return CATEGORIES.map((category) => ({ category, indicators: indicators.filter((i) => i.category === category) })).filter(
    (g) => g.indicators.length > 0,
  )
}
