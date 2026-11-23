// Escala de color de la coropleta: la usan la capa del mapa y la leyenda (INT-5).
import { scaleDiverging, scaleDivergingLog, scaleSequential, scaleSequentialLog, scaleSequentialQuantile } from 'd3-scale'
import { interpolatePuOr, interpolateViridis } from 'd3-scale-chromatic'
// Sin pasar por theme/index, que inyecta CSS y fuentes: así se puede probar sin DOM.
import { DATA_SCALES } from '../theme/tokens'
import type { IndicatorData, IndicatorMeta } from '../state/data'

const SCHEMES = { Viridis: interpolateViridis, PuOr: interpolatePuOr }
/** Percentiles del año más reciente que fijan el dominio por defecto: recortan los extremos que aplastan la escala. */
export const DOMAIN_PERCENTILES = [0.02, 0.98] as const

// @types/d3-scale 4.0.9 declara `quantiles()` sin argumento, pero d3-scale 4 exige `n` (devuelve n + 1 cortes).
const quantiles = (s: { quantiles(): number[] }, n: number) => (s.quantiles as (n: number) => number[]).call(s, n)

/** Percentil `p` (0–1) de valores ya ordenados, con interpolación lineal (igual que d3-array `quantileSorted`). */
export function percentile(sorted: number[], p: number): number {
  const i = (sorted.length - 1) * p
  const lo = Math.floor(i)
  return sorted[lo] + (sorted[Math.min(lo + 1, sorted.length - 1)] - sorted[lo]) * (i - lo)
}

export interface ColorScale {
  /** Color CSS de un valor; `null` sin dato (se pinta el rayado, nunca un color de la escala). Fuera del dominio, el del extremo. */
  color: (value: number | null | undefined) => string | null
  /**
   * Valores de referencia para la leyenda: `[min, max]` en lineal y log (`[min, midpoint, max]` si es divergente);
   * en cuantiles, los cortes de los cuantiles (min, cuartiles…, max; el divergente incluye el `midpoint`).
   */
  domain: number[]
  /** Hay valores (de cualquier año) por debajo del primer valor o por encima del último de `domain`: la leyenda pinta «≤ min» / «≥ max». */
  below: boolean
  above: boolean
  kind: IndicatorMeta['scale']['kind']
  transform: IndicatorMeta['scale']['transform']
}

/**
 * Escala del indicador según `scale.kind` (paleta de `DATA_SCALES`, recortada) y `scale.transform`.
 * Dominio fijo al mover el año: `scale.domain` si el catálogo lo da (lineal y log); si no, percentiles 2 y 98 de
 * `latestYear` (en divergente, simétrico respecto a `midpoint`). En cuantiles, los cortes salen de `latestYear`.
 */
export function colorScaleFor(
  meta: Pick<IndicatorMeta, 'scale' | 'latestYear'>,
  data: Pick<IndicatorData, 'years' | 'values'>,
): ColorScale {
  const { kind, transform } = meta.scale
  const { scheme, range } = DATA_SCALES[kind]
  const base = SCHEMES[scheme]
  // Recorte de DIS-5: t ∈ [0, 1] se lleva a [range[0], range[1]] de la paleta.
  const interpolate = (t: number) => base(range[0] + t * (range[1] - range[0]))
  // El log no admite 0 ni negativos: el pipeline no debería darlos; si llegan, se pintan como el extremo inferior.
  const usable = (v: number | null): v is number => v != null && Number.isFinite(v) && (transform !== 'log' || v > 0)
  const i = data.years.indexOf(meta.latestYear)
  const latest = Object.values(data.values)
    .map((s) => s[i] ?? null)
    .filter(usable)
    .sort((a, b) => a - b)
  const all = Object.values(data.values).flat().filter(usable)
  const mid = meta.scale.midpoint ?? 0
  const log = transform === 'log'

  let domain: number[]
  let fn: (v: number) => string
  if (transform === 'quantile') {
    if (kind === 'sequential') {
      const s = scaleSequentialQuantile(interpolate).domain(latest)
      domain = quantiles(s, 4)
      fn = s
    } else {
      // Cuantiles por separado a cada lado del centro: cada mitad de la paleta reparte sus países por igual.
      const low = scaleSequentialQuantile((t) => interpolate(t / 2)).domain([...latest.filter((v) => v < mid), mid])
      const high = scaleSequentialQuantile((t) => interpolate(0.5 + t / 2)).domain([mid, ...latest.filter((v) => v > mid)])
      domain = [...quantiles(low, 2), ...quantiles(high, 2).slice(1)]
      fn = (v) => (v < mid ? low(v) : high(v))
    }
  } else {
    const [p2, p98] = meta.scale.domain ?? (latest.length ? DOMAIN_PERCENTILES.map((p) => percentile(latest, p)) : [0, 1])
    if (kind === 'sequential') {
      domain = [p2, p98]
      fn = (log ? scaleSequentialLog(interpolate) : scaleSequential(interpolate)).domain([p2, p98]).clamp(true)
    } else {
      // Simétrico respecto al centro (en log, en proporción): los dos lados de la paleta valen lo mismo.
      if (meta.scale.domain) domain = [p2, mid, p98]
      else if (log) {
        const r = Math.max(mid / p2, p98 / mid)
        domain = [mid / r, mid, mid * r]
      } else {
        const h = Math.max(mid - p2, p98 - mid)
        domain = [mid - h, mid, mid + h]
      }
      fn = (log ? scaleDivergingLog(interpolate) : scaleDiverging(interpolate)).domain(domain).clamp(true)
    }
  }
  const [lo, hi] = [domain[0], domain[domain.length - 1]]
  return {
    color: (v) => (v == null || !Number.isFinite(v) ? null : fn(log ? Math.max(v, lo) : v)),
    domain,
    below: all.some((v) => v < lo),
    above: all.some((v) => v > hi),
    kind,
    transform,
  }
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
