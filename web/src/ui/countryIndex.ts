import type { Bbox } from '../map/globe'
import type { Language } from '../state/store'
import aliases from '../config/country-aliases.json'
import { loadData } from '../state/data'

export interface Country {
  a3: string
  a2: string
  bbox: Bbox
}

export interface CountryEntry extends Country {
  name: string
  /** Nombre y alias normalizados; el primero es el nombre en el idioma activo. */
  keys: string[]
}

export type Aliases = Record<string, { es: string[]; en: string[] }>

/** Minúsculas, sin acentos y con cualquier signo o espacio reducido a un solo espacio («EE. UU.» → «ee uu»). */
export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
}

/**
 * Índice de búsqueda en el idioma activo. Se buscan también el nombre en el otro idioma y los alias de ambos:
 * quien escribe «USA» o «Japan» con la interfaz en español también encuentra el país.
 */
export function buildIndex(countries: Country[], language: Language, extra: Aliases = aliases): CountryEntry[] {
  const other: Language = language === 'es' ? 'en' : 'es'
  const names = new Intl.DisplayNames([language], { type: 'region', fallback: 'code' })
  const otherNames = new Intl.DisplayNames([other], { type: 'region', fallback: 'code' })
  return countries.map((c) => {
    const name = names.of(c.a2) ?? c.a2
    const alias = extra[c.a3] ?? { es: [], en: [] }
    const keys = [name, otherNames.of(c.a2) ?? '', ...alias[language], ...alias[other]].map(normalize).filter(Boolean)
    return { ...c, name, keys: [...new Set(keys)] }
  })
}

// 0: coincide entera con el nombre o un alias («UK» antes que «Ukraine»); 1: el nombre empieza por la consulta;
// 2: un alias empieza por ella; 3 y 4: lo mismo en el inicio de otra palabra.
function score(keys: string[], q: string): number {
  if (keys.includes(q)) return 0
  if (keys[0].startsWith(q)) return 1
  if (keys.some((k) => k.startsWith(q))) return 2
  if (` ${keys[0]}`.includes(` ${q}`)) return 3
  if (keys.some((k) => ` ${k}`.includes(` ${q}`))) return 4
  return -1
}

/** Países cuyo nombre o alias tiene una palabra que empieza por la consulta, mejores primero. */
export function search(index: CountryEntry[], query: string, language: Language, limit = 8): CountryEntry[] {
  const q = normalize(query)
  if (!q) return []
  const collator = new Intl.Collator(language)
  return index
    .map((entry) => ({ entry, s: score(entry.keys, q) }))
    .filter((r) => r.s >= 0)
    .sort((a, b) => a.s - b.s || collator.compare(a.entry.name, b.entry.name))
    .slice(0, limit)
    .map((r) => r.entry)
}

/** Descarga `countries.json` una sola vez; si falla, el siguiente intento vuelve a pedirlo. */
export const loadCountries = () => loadData<Country[]>('geo/countries.json')
