import { describe, expect, it } from 'vitest'
import { valuesForYear } from '../src/map/colorScale'
import { numberFormat, rankCountries } from '../src/ui/rankingOrder'
import type { CountryEntry } from '../src/ui/countryIndex'

const country = (a3: string, name: string): CountryEntry => ({ a3, a2: a3.slice(0, 2), name, bbox: [0, 0, 1, 1], keys: [] })
const countries = [country('ESP', 'España'), country('FRA', 'Francia'), country('AUT', 'Austria'), country('CHL', 'Chile')]
const data = {
  id: 'x',
  years: [2023, 2024],
  values: { ESP: [1, 80], FRA: [2, 82], AUT: [3, 80], CHL: [4, null], ZZZ: [5, 99] },
}
const ranked = (order: 'desc' | 'asc') =>
  rankCountries(valuesForYear(data, 2024), countries, order, 'es').map((c) => [c.rank, c.a3, c.value])

describe('rankCountries', () => {
  it('desc: mayor arriba, empates con el mismo puesto y por nombre, sin nulos ni códigos desconocidos', () => {
    expect(ranked('desc')).toEqual([
      [1, 'FRA', 82],
      [2, 'AUT', 80],
      [2, 'ESP', 80],
    ])
  })

  it('asc: menor arriba y el siguiente puesto salta tras el empate', () => {
    expect(ranked('asc')).toEqual([
      [1, 'AUT', 80],
      [1, 'ESP', 80],
      [3, 'FRA', 82],
    ])
  })

  it('un año sin datos da una clasificación vacía', () => {
    expect(rankCountries(valuesForYear(data, 1990), countries, 'desc', 'es')).toEqual([])
  })
})

describe('numberFormat', () => {
  it('fija los decimales del catálogo y sigue el idioma', () => {
    expect(numberFormat('es', 1).format(86.46)).toBe('86,5')
    expect(numberFormat('en', 1).format(86)).toBe('86.0')
    expect(numberFormat('en', 0).format(12345.6)).toBe('12,346')
    expect(numberFormat('es', 0).format(12345.6)).toBe('12.346')
    expect(numberFormat('es', 0).format(1411750000)).toBe('1410\u00a0M')
    expect(numberFormat('en', 2).format(1411750000)).toBe('1.41B')
    // Tres cifras significativas: Reino Unido e India no se leen iguales («4 B» con un decimal).
    expect(numberFormat('es', 0).format(3.96e12)).toBe('3,96\u00a0B')
    expect(numberFormat('es', 0).format(4.03e12)).toBe('4,03\u00a0B')
    expect(numberFormat('es', 0).format(348e6)).toBe('348\u00a0M')
  })
})
