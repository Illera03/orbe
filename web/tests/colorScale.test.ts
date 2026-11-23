import { interpolatePuOr, interpolateViridis } from 'd3-scale-chromatic'
import { describe, expect, it } from 'vitest'
import { colorScaleFor, valuesForYear } from '../src/map/colorScale'
import { stripes } from '../src/map/choropleth'
import { themes } from '../src/theme/tokens'
import type { IndicatorMeta } from '../src/state/data'

const meta = (scale: IndicatorMeta['scale']) => ({ scale })
const seq = (transform: IndicatorMeta['scale']['transform']) => meta({ kind: 'sequential', transform, palette: 'viridis' })
const data = { values: { AAA: [1, null], BBB: [10, 100], CCC: [1000, null], DDD: [null, null] } }
const hex = (s: string) => s.toLowerCase()

describe('colorScaleFor', () => {
  it('lineal: los extremos del dominio dan los extremos recortados de viridis (DIS-5)', () => {
    const s = colorScaleFor(seq('linear'), data)
    expect(s.domain).toEqual([1, 1000])
    expect(s.color(1)).toBe(interpolateViridis(0.2))
    expect(s.color(1000)).toBe(interpolateViridis(1))
    // 500,5 es el centro lineal: mitad del tramo recortado.
    expect(s.color(500.5)).toBe(interpolateViridis(0.6))
  })

  it('sin dato devuelve null, nunca un color de la escala', () => {
    const s = colorScaleFor(seq('linear'), data)
    expect(s.color(null)).toBeNull()
    expect(s.color(undefined)).toBeNull()
    expect(s.color(NaN)).toBeNull()
  })

  it('log: cada orden de magnitud avanza lo mismo', () => {
    const s = colorScaleFor(seq('log'), data)
    expect(s.color(10)).toBe(interpolateViridis(0.2 + 0.8 / 3))
    expect(s.color(100)).toBe(interpolateViridis(0.2 + (0.8 * 2) / 3))
    // Fuera del dominio se recorta al extremo.
    expect(s.color(0)).toBe(interpolateViridis(0.2))
  })

  it('cuantiles: reparte por rango, no por distancia', () => {
    const s = colorScaleFor(seq('quantile'), data)
    // Valores 1, 10, 100, 1000: el segundo cae en el tercio inferior aunque esté pegado al mínimo.
    expect(hex(s.color(10)!)).toBe(hex(interpolateViridis(0.2 + 0.8 / 3)))
    expect(s.domain).toEqual([1, 7.75, 55, 325, 1000])
  })

  it('divergente: el midpoint cae en el centro de PuOr aunque los datos no sean simétricos', () => {
    const d = { values: { A: [-10], B: [0], C: [90] } }
    const lin = colorScaleFor(meta({ kind: 'diverging', transform: 'linear', palette: 'puor', midpoint: 0 }), d)
    expect(lin.domain).toEqual([-10, 0, 90])
    expect(lin.color(0)).toBe(interpolatePuOr(0.5))
    expect(lin.color(-10)).toBe(interpolatePuOr(0.12))
    expect(lin.color(90)).toBe(interpolatePuOr(0.88))
    const q = colorScaleFor(meta({ kind: 'diverging', transform: 'quantile', palette: 'puor', midpoint: 0 }), d)
    expect(q.color(-10)).toBe(interpolatePuOr(0.12))
    expect(q.color(90)).toBe(interpolatePuOr(0.88))
    expect(q.domain).toEqual([-10, -5, 0, 45, 90])
  })

  it('divergente log con midpoint positivo', () => {
    const d = { values: { A: [1], B: [10], C: [1000] } }
    const s = colorScaleFor(meta({ kind: 'diverging', transform: 'log', palette: 'puor', midpoint: 10 }), d)
    expect(s.color(10)).toBe(interpolatePuOr(0.5))
    expect(s.color(1)).toBe(interpolatePuOr(0.12))
  })
})

describe('valuesForYear', () => {
  it('solo los países con dato ese año', () => {
    const v = valuesForYear({ id: 'x', years: [2000, 2001], values: data.values }, 2001)
    expect([...v]).toEqual([['BBB', 100]])
    expect(valuesForYear({ id: 'x', years: [2000], values: data.values }, 1999).size).toBe(0)
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
