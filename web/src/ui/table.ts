import type { Language } from '../state/store'
import type { Country } from './countryIndex'

export type SortKey = 'country' | 'value'
export interface Sort {
  key: SortKey
  dir: 'asc' | 'desc'
}

export interface Row {
  a3: string
  name: string
  /** `null`: sin dato en el año activo. */
  value: number | null
}

/**
 * Filas de la tabla: todos los países de `countries.json`, con o sin dato, en el orden pedido.
 * Los países sin dato van siempre al final, ordenen por lo que ordenen, y entre ellos por nombre.
 * A igualdad de valor, por nombre.
 */
export function tableRows(countries: readonly Country[], values: ReadonlyMap<string, number>, language: Language, sort: Sort): Row[] {
  const names = new Intl.DisplayNames([language], { type: 'region', fallback: 'code' })
  const collator = new Intl.Collator(language)
  const sign = sort.dir === 'asc' ? 1 : -1
  return countries
    .map((c) => ({ a3: c.a3, name: names.of(c.a2) ?? c.a3, value: values.get(c.a3) ?? null }))
    .sort((a, b) => {
      if (a.value === null || b.value === null) {
        const missing = Number(a.value === null) - Number(b.value === null)
        if (missing) return missing
        return sort.key === 'country' ? sign * collator.compare(a.name, b.name) : collator.compare(a.name, b.name)
      }
      if (sort.key === 'country') return sign * collator.compare(a.name, b.name)
      return sign * (a.value - b.value) || collator.compare(a.name, b.name)
    })
}

/** Cifras con los decimales del catálogo y el formato del idioma. */
export const valueFormat = (language: Language, decimals: number) =>
  new Intl.NumberFormat(language, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
