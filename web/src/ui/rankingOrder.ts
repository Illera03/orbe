import type { IndicatorMeta } from '../state/data'
import type { Language } from '../state/store'
import type { CountryEntry } from './countryIndex'

export interface RankedCountry extends CountryEntry {
  value: number
  /** Puesto con empates compartidos (1, 2, 2, 4). */
  rank: number
}

/**
 * Países con dato ordenados según `order` (`desc`: mayor arriba); a igual valor, por nombre en el idioma activo.
 * Solo entran los de `countries` (los que se pueden nombrar y encuadrar); los que no tienen dato quedan fuera.
 */
export function rankCountries(
  values: Map<string, number>,
  countries: CountryEntry[],
  order: IndicatorMeta['order'],
  language: Language,
): RankedCountry[] {
  const collator = new Intl.Collator(language)
  const sign = order === 'desc' ? -1 : 1
  const sorted = countries
    .filter((c) => values.has(c.a3))
    .map((c) => ({ ...c, value: values.get(c.a3)!, rank: 0 }))
    .sort((a, b) => sign * (a.value - b.value) || collator.compare(a.name, b.name))
  sorted.forEach((c, i) => (c.rank = i > 0 && c.value === sorted[i - 1].value ? sorted[i - 1].rank : i + 1))
  return sorted
}

/** Formato de los valores del indicador con sus `decimals`, en el idioma activo. */
export const numberFormat = (language: Language, decimals: number) =>
  new Intl.NumberFormat(language, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
