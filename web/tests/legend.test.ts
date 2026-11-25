import { describe, expect, it } from 'vitest'
import { colorScaleFor } from '../src/map/colorScale'
import type { IndicatorMeta } from '../src/state/data'
import { legendFormat, legendGradient, legendLabels } from '../src/ui/legend'

const series = (old: number[], latest: number[]) => ({
  years: [2000, 2001],
  values: Object.fromEntries(latest.map((v, i) => [`P${i}`, [old[i] ?? null, v]])),
})
const scaleOf = (scale: IndicatorMeta['scale'], data = series([], [1, 2, 3, 4, 5, 6, 7, 8, 9, 10])) =>
  colorScaleFor({ scale, latestYear: 2001 }, data)
const stops = (gradient: string) => gradient.match(/(rgb\([^)]*\)|#[0-9a-f]{6})[^,)]*/g)!

describe('formato de la leyenda', () => {
  it('sigue el idioma y limita los decimales del catálogo', () => {
    expect(legendFormat('es', 1).format(1234.56)).toBe('1234,6')
    expect(legendFormat('en', 1).format(1234.56)).toBe('1,234.6')
    expect(legendFormat('es', 0).format(85)).toBe('85')
    expect(legendFormat('en', 2).format(45)).toBe('45')
  })

  it('marca «≤ min» y «≥ max» solo si hay valores fuera del dominio', () => {
    expect(legendLabels({ domain: [45, 85], below: false, above: false }, 'es', 1)).toEqual(['45', '85'])
    expect(legendLabels({ domain: [45, 65, 85], below: true, above: true }, 'es', 1)).toEqual(['≤ 45', '65', '≥ 85'])
  })

  it('cifras grandes en notación compacta del idioma', () => {
    expect(legendFormat('es', 0).format(4132360179285)).toBe('4,1\u00a0B')
    expect(legendFormat('en', 0).format(4132360179285)).toBe('4.1T')
    expect(legendFormat('es', 0).format(-2500000)).toBe('-2,5\u00a0M')
    expect(legendFormat('en', 0).format(999999)).toBe('999,999')
    expect(legendLabels({ domain: [5e5, 4132360179285], below: false, above: true }, 'en', 0)).toEqual(['500,000', '≥ 4.1T'])
  })

  it('añade decimales solo a la leyenda si dos cortes seguidos se leen iguales', () => {
    expect(legendLabels({ domain: [0.1, 0.14, 0.5], below: false, above: false }, 'es', 1)).toEqual(['0,1', '0,14', '0,5'])
    expect(legendLabels({ domain: [1.21e9, 1.24e9], below: false, above: false }, 'en', 0)).toEqual(['1.21B', '1.24B'])
  })

  it('fusiona los cortes de verdad iguales (clase vacía) en etiquetas y barra', () => {
    expect(legendLabels({ domain: [0.1, 0.1, 0.4, 1], below: false, above: true }, 'es', 1)).toEqual(['0,1', '0,4', '≥ 1'])
    const s = scaleOf({ kind: 'sequential', transform: 'quantile', palette: 'viridis' }, series([], [1, 1, 1, 1, 1, 1, 2, 3]))
    expect(s.domain[0]).toBe(s.domain[1])
    expect(stops(legendGradient(s))).toHaveLength(legendLabels(s, 'es', 0).length - 1)
  })
})

describe('barra de la leyenda', () => {
  it('lineal: rampa continua del color del mínimo al del máximo', () => {
    const s = scaleOf({ kind: 'sequential', transform: 'linear', palette: 'viridis', domain: [0, 10] })
    const g = stops(legendGradient(s, 4))
    expect(g).toHaveLength(5)
    expect(g[0]).toBe(`${s.color(0)} 0%`)
    expect(g[2]).toBe(`${s.color(5)} 50%`)
    expect(g[4]).toBe(`${s.color(10)} 100%`)
  })

  it('log: interpola en escala logarítmica', () => {
    const s = scaleOf({ kind: 'sequential', transform: 'log', palette: 'viridis', domain: [1, 100] })
    expect(stops(legendGradient(s, 2))[1]).toBe(`${s.color(10)} 50%`)
  })

  it('divergente: el midpoint queda en el centro', () => {
    const s = scaleOf({ kind: 'diverging', transform: 'linear', palette: 'puor', midpoint: 0, domain: [-10, 30] })
    const g = stops(legendGradient(s, 2))
    expect(g).toHaveLength(5)
    expect(g[2]).toBe(`${s.color(0)} 50%`)
  })

  it('cuantiles: un tramo de color sólido por par de cortes', () => {
    const s = scaleOf({ kind: 'sequential', transform: 'quantile', palette: 'viridis' })
    expect(s.domain).toHaveLength(5)
    const g = stops(legendGradient(s))
    expect(g).toHaveLength(4)
    expect(g[0]).toBe(`${s.color((s.domain[0] + s.domain[1]) / 2)} 0% 25%`)
    expect(g[3]).toMatch(/ 75% 100%$/)
  })
})
