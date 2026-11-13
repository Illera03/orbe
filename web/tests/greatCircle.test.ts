import { describe, expect, it } from 'vitest'
import { greatCircleArc } from '../src/map/greatCircle'

describe('greatCircleArc', () => {
  it('empieza y acaba en los extremos a ras de suelo', () => {
    const arc = greatCircleArc([-3.7, 40.42], [-58.38, -34.6], 10)
    expect(arc).toHaveLength(11)
    expect(arc[0][0]).toBeCloseTo(-3.7)
    expect(arc[0][1]).toBeCloseTo(40.42)
    expect(arc[10][0]).toBeCloseTo(-58.38)
    expect(arc[10][1]).toBeCloseTo(-34.6)
    expect(arc[0][2]).toBe(0)
    expect(arc[5][2]).toBeGreaterThan(0)
  })

  it('sigue el ecuador y mantiene la longitud continua al cruzar el antimeridiano', () => {
    const arc = greatCircleArc([170, 0], [-170, 0], 2)
    expect(arc[1][0]).toBeCloseTo(180)
    expect(arc[1][1]).toBeCloseTo(0)
    expect(arc[2][0]).toBeCloseTo(190)
  })
})
