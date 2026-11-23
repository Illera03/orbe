// Escala de color de la coropleta: la usan la capa del mapa y la leyenda (INT-5).
import { scaleDiverging, scaleDivergingLog, scaleSequential, scaleSequentialLog, scaleSequentialQuantile } from 'd3-scale'
import { interpolatePuOr, interpolateViridis } from 'd3-scale-chromatic'
// Sin pasar por theme/index, que inyecta CSS y fuentes: así se puede probar sin DOM.
import { DATA_SCALES } from '../theme/tokens'
import type { IndicatorData, IndicatorMeta } from '../state/data'

const SCHEMES = { Viridis: interpolateViridis, PuOr: interpolatePuOr }

// @types/d3-scale 4.0.9 declara `quantiles()` sin argumento, pero d3-scale 4 exige `n` (devuelve n + 1 cortes).
const quantiles = (s: { quantiles(): number[] }, n: number) => (s.quantiles as (n: number) => number[]).call(s, n)

export interface ColorScale {
  /** Color CSS de un valor; `null` sin dato (se pinta el rayado, nunca un color de la escala). */
  color: (value: number | null | undefined) => string | null
  /**
   * Valores de referencia para la leyenda: `[min, max]` en lineal y log (`[min, midpoint, max]` si es divergente);
   * en cuantiles, los cortes de los cuantiles (min, cuartiles…, max; el divergente incluye el `midpoint`).
   */
  domain: number[]
  kind: IndicatorMeta['scale']['kind']
  transform: IndicatorMeta['scale']['transform']
}

/**
 * Escala del indicador según `scale.kind` (paleta de `DATA_SCALES`, recortada) y `scale.transform`.
 * El dominio sale de todos los años, no solo del activo: así un color significa lo mismo al mover el año.
 */
export function colorScaleFor(meta: Pick<IndicatorMeta, 'scale'>, data: Pick<IndicatorData, 'values'>): ColorScale {
  const { kind, transform } = meta.scale
  const { scheme, range } = DATA_SCALES[kind]
  const base = SCHEMES[scheme]
  // Recorte de DIS-5: t ∈ [0, 1] se lleva a [range[0], range[1]] de la paleta.
  const interpolate = (t: number) => base(range[0] + t * (range[1] - range[0]))
  let values = Object.values(data.values)
    .flat()
    .filter((v): v is number => v != null && Number.isFinite(v))
  // El log no admite 0 ni negativos: el pipeline no debería darlos; si llegan, se pintan como el mínimo positivo.
  if (transform === 'log') values = values.filter((v) => v > 0)
  // Con reduce y no con Math.min(...values): un fichero de 2 MB pasa del límite de argumentos.
  const min = values.length ? values.reduce((a, b) => Math.min(a, b)) : 0
  const max = values.length ? values.reduce((a, b) => Math.max(a, b)) : 1
  const mid = meta.scale.midpoint ?? 0
  const result = (fn: (v: number) => string, domain: number[]): ColorScale => ({
    color: (v) => (v == null || !Number.isFinite(v) ? null : fn(transform === 'log' ? Math.max(v, min) : v)),
    domain,
    kind,
    transform,
  })

  if (kind === 'sequential') {
    if (transform === 'quantile') {
      const s = scaleSequentialQuantile(interpolate).domain(values)
      return result(s, quantiles(s, 4))
    }
    const s = (transform === 'log' ? scaleSequentialLog(interpolate) : scaleSequential(interpolate)).domain([min, max]).clamp(true)
    return result(s, [min, max])
  }

  // Divergente: el `midpoint` cae siempre en el centro de la paleta aunque los datos no sean simétricos.
  if (transform === 'quantile') {
    // Cuantiles por separado a cada lado del centro: cada mitad de la paleta reparte sus países por igual.
    const low = scaleSequentialQuantile((t) => interpolate(t / 2)).domain([...values.filter((v) => v < mid), mid])
    const high = scaleSequentialQuantile((t) => interpolate(0.5 + t / 2)).domain([mid, ...values.filter((v) => v > mid)])
    const domain = [...quantiles(low, 2), ...quantiles(high, 2).slice(1)]
    return result((v) => (v < mid ? low(v) : high(v)), domain)
  }
  const lo = Math.min(min, mid)
  const hi = Math.max(max, mid)
  const s = (transform === 'log' ? scaleDivergingLog(interpolate) : scaleDiverging(interpolate)).domain([lo, mid, hi]).clamp(true)
  return result(s, [lo, mid, hi])
}

/** Valor de cada país en `year`; los que no tienen dato ese año no aparecen. */
export function valuesForYear(data: IndicatorData, year: number): Map<string, number> {
  const i = data.years.indexOf(year)
  const out = new Map<string, number>()
  if (i < 0) return out
  for (const [a3, series] of Object.entries(data.values)) {
    const v = series[i]
    if (v != null) out.set(a3, v)
  }
  return out
}
