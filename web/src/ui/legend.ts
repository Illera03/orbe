// Cálculos de la leyenda, sin DOM. Solo tipos de map/colorScale: la escala llega con import() (fuera del JS inicial).
import type { ColorScale } from '../map/colorScale'
import type { Language } from '../state/store'

/** Formato de las cifras de la leyenda: idioma de la app y hasta `decimals` decimales del catálogo. */
export const legendFormat = (language: Language, decimals: number) =>
  new Intl.NumberFormat(language, { maximumFractionDigits: decimals })

/** Una etiqueta por valor de `domain`; «≤ min» / «≥ max» si hay valores fuera del dominio. */
export function legendLabels(scale: Pick<ColorScale, 'domain' | 'below' | 'above'>, format: Intl.NumberFormat): string[] {
  const labels = scale.domain.map((v) => format.format(v))
  if (scale.below) labels[0] = `≤ ${labels[0]}`
  if (scale.above) labels[labels.length - 1] = `≥ ${labels[labels.length - 1]}`
  return labels
}

/**
 * Fondo de la barra: los valores de `domain` repartidos por igual (el `midpoint` divergente queda en el centro, igual
 * que las etiquetas). Lineal y log, rampa continua interpolada en su escala; cuantiles, un tramo por par de cortes con
 * el color de su valor central.
 */
export function legendGradient(scale: ColorScale, steps = 8): string {
  const d = scale.domain
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
