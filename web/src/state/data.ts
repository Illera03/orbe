/** Contrato de `data/catalog.json` y `data/indicators/<id>.json` (DAT-2). */

export type Localized = { es: string; en: string }

export type Category =
  | 'demografia'
  | 'economia'
  | 'salud'
  | 'educacion'
  | 'medio-ambiente'
  | 'energia'
  | 'geografia'
  | 'sociedad'

export interface IndicatorMeta {
  id: string
  sourceCode: string
  /** Qué extremo encabeza el ranking. */
  order: 'desc' | 'asc'
  name: Localized
  description: Localized
  unit: Localized
  decimals: number
  category: Category
  layer: 'choropleth'
  scale: {
    kind: 'sequential' | 'diverging'
    transform: 'linear' | 'log' | 'quantile'
    palette: string
    midpoint?: number
  }
  source: { name: string; url: string; accessed: string }
  license: { id: string; url: string; attribution: string; commercial: boolean }
  years: [number, number]
  latestYear: number
  /** Ruta relativa a `data/`, p. ej. `indicators/esperanza-vida.json`. */
  file: string
}

export interface Catalog {
  generated: string
  indicators: IndicatorMeta[]
}

export interface IndicatorData {
  id: string
  years: number[]
  /** Un valor por año de `years`, por código ISO alfa-3. */
  values: Record<string, (number | null)[]>
}

const cache = new Map<string, Promise<unknown>>()

/**
 * Descarga `<base>/data/<path>` una sola vez, también con peticiones simultáneas.
 * Si falla, se olvida y el siguiente intento vuelve a pedirlo.
 */
export function loadData<T>(path: string): Promise<T> {
  let pending = cache.get(path) as Promise<T> | undefined
  if (!pending) {
    pending = fetch(`${import.meta.env.BASE_URL}data/${path}`)
      .then((r) => {
        if (!r.ok) throw new Error(`${path}: HTTP ${r.status}`)
        return r.json() as Promise<T>
      })
      .catch((error: unknown) => {
        cache.delete(path)
        throw error
      })
    cache.set(path, pending)
  }
  return pending
}

export const loadCatalog = () => loadData<Catalog>('catalog.json')

export const loadIndicator = (meta: Pick<IndicatorMeta, 'file'>) => loadData<IndicatorData>(meta.file)
