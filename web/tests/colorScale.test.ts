import { interpolatePuOr, interpolateViridis } from 'd3-scale-chromatic'
import { describe, expect, it } from 'vitest'
import { colorScaleFor, percentile, valuesForYear } from '../src/map/colorScale'
import { stripes } from '../src/map/choropleth'
import { themes } from '../src/theme/tokens'
import type { IndicatorMeta } from '../src/state/data'

const meta = (scale: IndicatorMeta['scale']) => ({ scale, latestYear: 2001 })
const seq = (transform: IndicatorMeta['scale']['transform'], domain?: [number, number]) =>
  meta({ kind: 'sequential', transform, palette: 'viridis', domain })
const div = (transform: IndicatorMeta['scale']['transform'], midpoint: number) =>
  meta({ kind: 'diverging', transform, palette: 'puor', midpoint })
// Indicador de dos años; el último (2001) fija el dominio y el anterior solo cuenta para `below`/`above`.
const series = (old: (number | null)[], latest: (number | null)[]) => ({
  years: [2000, 2001],
  values: Object.fromEntries(latest.map((v, i) => [`P${i}`, [old[i] ?? null, v]])),
})
// 101 países con 1…101 en 2001: los percentiles 2 y 98 son 3 y 99.
const hundred = Array.from({ length: 101 }, (_, i) => i + 1)
const data = series([500, -50], hundred)
const hex = (s: string) => s.toLowerCase()

describe('percentile', () => {
  it('interpola entre los dos valores vecinos', () => {
    expect(percentile([0, 10], 0.5)).toBe(5)
    expect(percentile(hundred, 0.02)).toBe(3)
    expect(percentile([7], 0.98)).toBe(7)
  })
})

describe('colorScaleFor', () => {
  it('lineal: dominio con los percentiles 2 y 98 del último año y extremos recortados de viridis (DIS-5)', () => {
    const s = colorScaleFor(seq('linear'), data)
    expect(s.domain).toEqual([3, 99])
    expect(s.color(3)).toBe(interpolateViridis(0.2))
    expect(s.color(99)).toBe(interpolateViridis(1))
    expect(s.color(51)).toBe(interpolateViridis(0.6))
  })

  it('clamp: fuera del dominio se pinta el extremo y se avisa para la leyenda', () => {
    const s = colorScaleFor(seq('linear'), data)
    expect(s.color(-50)).toBe(interpolateViridis(0.2))
    expect(s.color(500)).toBe(interpolateViridis(1))
    expect([s.below, s.above]).toEqual([true, true])
  })

  it('el dominio no depende de los años anteriores (fijo al mover el año)', () => {
    expect(colorScaleFor(seq('linear'), series([1e9, -1e9], hundred)).domain).toEqual([3, 99])
  })

  it('scale.domain del catálogo manda sobre los percentiles', () => {
    const s = colorScaleFor(seq('linear', [0, 200]), series([], hundred))
    expect(s.domain).toEqual([0, 200])
    expect(s.color(100)).toBe(interpolateViridis(0.6))
    expect([s.below, s.above]).toEqual([false, false])
  })

  it('sin dato devuelve null, nunca un color de la escala', () => {
    const s = colorScaleFor(seq('linear'), data)
    expect(s.color(null)).toBeNull()
    expect(s.color(undefined)).toBeNull()
    expect(s.color(NaN)).toBeNull()
  })

  it('log: cada orden de magnitud avanza lo mismo', () => {
    const s = colorScaleFor(seq('log', [1, 1000]), data)
    expect(s.color(10)).toBe(interpolateViridis(0.2 + 0.8 / 3))
    expect(s.color(100)).toBe(interpolateViridis(0.2 + (0.8 * 2) / 3))
    // 0 no cabe en el log: se recorta al extremo.
    expect(s.color(0)).toBe(interpolateViridis(0.2))
  })

  it('cuantiles: cortes del último año, reparte por rango y no por distancia', () => {
    const s = colorScaleFor(seq('quantile'), series([5000], [1, 10, 100, 1000]))
    // Valores 1, 10, 100, 1000: el segundo cae en el tercio inferior aunque esté pegado al mínimo.
    expect(hex(s.color(10)!)).toBe(hex(interpolateViridis(0.2 + 0.8 / 3)))
    expect(s.domain).toEqual([1, 7.75, 55, 325, 1000])
    expect(s.color(5000)).toBe(interpolateViridis(1))
    expect([s.below, s.above]).toEqual([false, true])
  })

  it('divergente: dominio simétrico respecto al midpoint, en el centro de PuOr', () => {
    const lin = colorScaleFor(div('linear', 0), series([], [-10, 0, 90]))
    // p2 = -9,6 y p98 = 86,4: manda el lado más largo.
    expect(lin.domain.map((v) => +v.toFixed(6))).toEqual([-86.4, 0, 86.4])
    expect(lin.color(0)).toBe(interpolatePuOr(0.5))
    expect(lin.color(lin.domain[2])).toBe(interpolatePuOr(0.88))
    expect(lin.color(-1000)).toBe(interpolatePuOr(0.12))
    const q = colorScaleFor(div('quantile', 0), series([], [-10, 0, 90]))
    expect(q.color(-10)).toBe(interpolatePuOr(0.12))
    expect(q.color(90)).toBe(interpolatePuOr(0.88))
    expect(q.domain).toEqual([-10, -5, 0, 45, 90])
  })

  it('divergente log: simétrico en proporción respecto al midpoint', () => {
    const s = colorScaleFor(div('log', 10), series([], [1, 10, 1000]))
    const [lo, mid, hi] = s.domain
    expect(mid).toBe(10)
    expect(mid / lo).toBeCloseTo(hi / mid)
    expect(s.color(10)).toBe(interpolatePuOr(0.5))
    expect(s.color(1e6)).toBe(interpolatePuOr(0.88))
  })
})

describe('valuesForYear', () => {
  it('solo los países con dato ese año', () => {
    const values = { AAA: [1, null], BBB: [10, 100] }
    expect([...valuesForYear({ id: 'x', years: [2000, 2001], values }, 2001)]).toEqual([['BBB', 100]])
    expect(valuesForYear({ id: 'x', years: [2000, 2001], values }, 1999).size).toBe(0)
  })
})

describe('stripes', () => {
  it('rayado con los dos tokens del tema y sin transparencia', () => {
    const { width, height, data } = stripes('dark', 4, 1)
    expect([width, height, data.length]).toEqual([4, 4, 64])
    const px = (i: number) => '#' + [...data.slice(i * 4, i * 4 + 3)].map((c) => c.toString(16).padStart(2, '0')).join('')
    expect(px(0)).toBe(themes.dark.map.noDataStripe)
    expect(px(1)).toBe(themes.dark.map.noDataBg)
    expect(data.filter((_, i) => i % 4 === 3).every((a) => a === 255)).toBe(true)
  })
})
