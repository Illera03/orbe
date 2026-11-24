import { describe, expect, it } from 'vitest'
import type { Country } from '../src/ui/countryIndex'
import { tableRows, valueFormat } from '../src/ui/table'

const country = (a3: string, a2: string): Country => ({ a3, a2, bbox: [0, 0, 1, 1] })
// Alemania, España, Francia, Japón y Chad (sin dato).
const countries = [country('ESP', 'ES'), country('TCD', 'TD'), country('JPN', 'JP'), country('FRA', 'FR'), country('DEU', 'DE')]
const values = new Map([
  ['ESP', 83.1],
  ['JPN', 84.5],
  ['FRA', 83.1],
  ['DEU', 80.9],
])
const ids = (rows: { a3: string }[]) => rows.map((r) => r.a3)

describe('tableRows', () => {
  it('ordena por valor; a igualdad, por nombre; sin dato al final', () => {
    expect(ids(tableRows(countries, values, 'es', { key: 'value', dir: 'desc' }))).toEqual(['JPN', 'ESP', 'FRA', 'DEU', 'TCD'])
    expect(ids(tableRows(countries, values, 'es', { key: 'value', dir: 'asc' }))).toEqual(['DEU', 'ESP', 'FRA', 'JPN', 'TCD'])
  })

  it('ordena por nombre en el idioma activo, con los países sin dato siempre al final', () => {
    expect(ids(tableRows(countries, values, 'es', { key: 'country', dir: 'asc' }))).toEqual(['DEU', 'ESP', 'FRA', 'JPN', 'TCD'])
    expect(ids(tableRows(countries, values, 'en', { key: 'country', dir: 'asc' }))).toEqual(['FRA', 'DEU', 'JPN', 'ESP', 'TCD'])
    expect(ids(tableRows(countries, values, 'es', { key: 'country', dir: 'desc' }))).toEqual(['JPN', 'FRA', 'ESP', 'DEU', 'TCD'])
  })

  it('nombra con Intl.DisplayNames y deja null sin dato', () => {
    const rows = tableRows(countries, values, 'es', { key: 'value', dir: 'desc' })
    expect(rows[0]).toEqual({ a3: 'JPN', name: 'Japón', value: 84.5 })
    expect(rows.at(-1)).toEqual({ a3: 'TCD', name: 'Chad', value: null })
  })
})

describe('valueFormat', () => {
  it('usa los decimales del catálogo y el formato del idioma', () => {
    expect(valueFormat('es', 1).format(83.14)).toBe('83,1')
    expect(valueFormat('en', 1).format(83)).toBe('83.0')
    expect(valueFormat('es', 0).format(12345.6)).toBe('12.346')
    expect(valueFormat('en', 0).format(12345.6)).toBe('12,346')
  })
})
