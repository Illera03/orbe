import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import aliases from '../src/config/country-aliases.json'
import { buildIndex, normalize, search, type Country } from '../src/ui/countryIndex'

const countries: Country[] = JSON.parse(readFileSync(new URL('../../data/geo/countries.json', import.meta.url), 'utf8'))
const es = buildIndex(countries, 'es')
const en = buildIndex(countries, 'en')
const first = (index: typeof es, q: string, lang: 'es' | 'en' = 'es') => search(index, q, lang)[0]?.a3
const all = (index: typeof es, q: string, lang: 'es' | 'en' = 'es') => search(index, q, lang).map((c) => c.a3)

describe('normalize', () => {
  it('quita acentos, mayúsculas y signos', () => {
    expect(normalize('Japón')).toBe('japon')
    expect(normalize('  EE. UU. ')).toBe('ee uu')
    expect(normalize('Côte d’Ivoire')).toBe('cote d ivoire')
    expect(normalize('Guinea-Bisáu')).toBe('guinea bisau')
    expect(normalize('ÅLAND')).toBe('aland')
  })
})

describe('search', () => {
  it('encuentra por prefijo de palabra sin acentos ni mayúsculas', () => {
    expect(first(es, 'japon')).toBe('JPN')
    expect(first(es, 'JAPÓN')).toBe('JPN')
    expect(first(es, 'reino')).toBe('GBR')
    expect(all(es, 'unido')).toContain('GBR')
    expect(all(es, 'pon')).not.toContain('JPN')
    expect(search(es, '   ', 'es')).toEqual([])
  })

  it('usa el nombre del idioma activo', () => {
    expect(search(es, 'japon', 'es')[0].name).toBe('Japón')
    expect(search(en, 'japan', 'en')[0].name).toBe('Japan')
  })

  it('encuentra por alias y por el nombre en el otro idioma', () => {
    for (const q of ['EEUU', 'ee uu', 'USA', 'Estados Unidos']) expect(first(es, q)).toBe('USA')
    expect(first(en, 'us', 'en')).toBe('USA')
    expect(first(en, 'UK', 'en')).toBe('GBR')
    expect(first(es, 'inglaterra')).toBe('GBR')
    expect(first(es, 'holanda')).toBe('NLD')
    expect(first(en, 'holland', 'en')).toBe('NLD')
    expect(first(es, 'republica checa')).toBe('CZE')
    expect(first(es, 'chequia')).toBe('CZE')
    expect(first(es, 'birmania')).toBe('MMR')
    expect(first(es, 'myanmar')).toBe('MMR')
    expect(first(es, 'costa de marfil')).toBe('CIV')
    expect(first(en, 'ivory', 'en')).toBe('CIV')
    expect(first(es, 'suazilandia')).toBe('SWZ')
    expect(first(es, 'esuatini')).toBe('SWZ')
    expect(first(es, 'japan')).toBe('JPN')
    expect(first(en, 'Corea del Sur', 'en')).toBe('KOR')
  })

  it('distingue los dos Congos y las dos Coreas', () => {
    expect(all(es, 'congo').slice(0, 2).sort()).toEqual(['COD', 'COG'])
    expect(all(en, 'congo', 'en').slice(0, 2).sort()).toEqual(['COD', 'COG'])
    expect(first(es, 'rdc')).toBe('COD')
    expect(all(es, 'corea').slice(0, 2).sort()).toEqual(['KOR', 'PRK'])
    expect(first(es, 'corea del n')).toBe('PRK')
    expect(first(en, 'north korea', 'en')).toBe('PRK')
  })

  it('limita el número de resultados', () => {
    expect(search(es, 'i', 'es', 5)).toHaveLength(5)
  })
})

describe('country-aliases.json', () => {
  it('solo usa códigos alfa-3 de countries.json y trae es y en', () => {
    const codes = new Set(countries.map((c) => c.a3))
    for (const [a3, a] of Object.entries(aliases)) {
      expect(codes.has(a3), a3).toBe(true)
      expect(Array.isArray(a.es) && Array.isArray(a.en), a3).toBe(true)
    }
  })

  it('cada país tiene nombre de Intl.DisplayNames, no su código', () => {
    for (const c of es) expect(c.name, c.a3).not.toBe(c.a2)
  })
})
