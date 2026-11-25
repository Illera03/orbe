// Cálculos de la leyenda, sin DOM. Solo tipos de map/colorScale: la escala llega con import() (fuera del JS inicial).
import type { ColorScale } from '../map/colorScale'
import type { Language } from '../state/store'

/** Desde este valor absoluto las cifras van en notación compacta («4,1 B» en es, «4.1T» en en): enteras no se leen. */
export const COMPACT_FROM = 1e6

/** `plain` por debajo de `COMPACT_FROM`; por encima, compacta del idioma con hasta `fractionDigits` decimales. */
export function compactFormat(plain: Intl.NumberFormat, language: Language, fractionDigits = 1) {
  const compact = new Intl.NumberFormat(language, { notation: 'compact', maximumFractionDigits: fractionDigits })
  return { format: (v: number) => (Math.abs(v) >= COMPACT_FROM ? compact : plain).format(v) }
}

/** Formato de las cifras de la leyenda: idioma de la app y hasta `decimals` (+ `extra`) decimales del catálogo. */
export const legendFormat = (language: Language, decimals: number, extra = 0) =>
  compactFormat(new Intl.NumberFormat(language, { maximumFractionDigits: decimals + extra }), language, 1 + extra)

/** Decimales que la leyenda puede añadir a los del catálogo para que dos cortes seguidos no se lean iguales. */
export const MAX_EXTRA_DECIMALS = 3

/**
 * Cortes de la leyenda: `domain` sin valores seguidos iguales (cuantiles con muchos países en el mismo valor, p. ej.
 * VIH 0,1 | 0,1), que darían una clase vacía; el mapa no cambia. Si todo es un mismo valor, se deja tal cual.
 */
export function legendDomain(domain: number[]): number[] {
  const d = domain.filter((v, i) => i === 0 || v !== domain[i - 1])
  return d.length > 1 ? d : domain
}

/**
 * Una etiqueta por valor de `legendDomain`; «≤ min» / «≥ max» si hay valores fuera del dominio. Si dos cortes seguidos
 * distintos salen iguales con los decimales del catálogo (cuantiles muy juntos), añade decimales solo aquí, hasta
 * `MAX_EXTRA_DECIMALS`.
 */
export function legendLabels(scale: Pick<ColorScale, 'domain' | 'below' | 'above'>, language: Language, decimals: number): string[] {
  const domain = legendDomain(scale.domain)
  let labels: string[] = []
  for (let extra = 0; extra <= MAX_EXTRA_DECIMALS; extra++) {
    const format = legendFormat(language, decimals, extra)
    labels = domain.map((v) => format.format(v))
    if (labels.every((l, i) => i === 0 || l !== labels[i - 1])) break
  }
  if (scale.below) labels[0] = `≤ ${labels[0]}`
  if (scale.above) labels[labels.length - 1] = `≥ ${labels[labels.length - 1]}`
  return labels
}

/**
 * Fondo de la barra: los valores de `legendDomain` repartidos por igual (el `midpoint` divergente queda en el centro, igual
 * que las etiquetas). Lineal y log, rampa continua interpolada en su escala; cuantiles, un tramo por par de cortes con
 * el color de su valor central.
 */
export function legendGradient(scale: ColorScale, steps = 8): string {
  const d = legendDomain(scale.domain)
  const n = d.length - 1
  const color = (v: number) => scale.color(v) ?? 'transparent'
  const stops: string[] = []
  for (let s = 0; s < n; s++) {
    const [from, to] = [(s / n) * 100, ((s + 1) / n) * 100]
    if (scale.transform === 'quantile') {
      stops.push(`${color((d[s] + d[s + 1]) / 2)} ${from}% ${to}%`)
      continue
    }
    for (let k = s ? 1 : 0; k <= steps; k++) {
      const t = k / steps
      const v = scale.transform === 'log' ? d[s] * (d[s + 1] / d[s]) ** t : d[s] + (d[s + 1] - d[s]) * t
      stops.push(`${color(v)} ${from + (to - from) * t}%`)
    }
  }
  return `linear-gradient(to right, ${stops.join(', ')})`
}
