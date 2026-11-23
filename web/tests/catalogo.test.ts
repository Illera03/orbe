import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { beforeAll, describe, expect, it } from 'vitest'
import es from '../src/i18n/es.json'
import en from '../src/i18n/en.json'
import type { IndicatorMeta } from '../src/state/data'
import { CATEGORIES, groupByCategory } from '../src/ui/catalog'
import { SourceCard, SourceCardView } from '../src/ui/SourceCard'

const base: IndicatorMeta = {
  id: 'esperanza-vida',
  sourceCode: 'SP.DYN.LE00.IN',
  order: 'desc',
  name: { es: 'Esperanza de vida', en: 'Life expectancy' },
  description: { es: 'Años', en: 'Years' },
  unit: { es: 'años', en: 'years' },
  decimals: 1,
  category: 'salud',
  layer: 'choropleth',
  scale: { kind: 'sequential', transform: 'linear', palette: 'viridis' },
  source: { name: 'Banco Mundial', url: 'https://data.worldbank.org/x', accessed: '2026-11-23' },
  license: { id: 'CC-BY-4.0', url: 'https://creativecommons.org/licenses/by/4.0/', attribution: 'Banco Mundial, CC BY 4.0', commercial: true },
  years: [1960, 2023],
  latestYear: 2023,
  file: 'indicators/esperanza-vida.json',
}
const ind = (id: string, category: IndicatorMeta['category'], extra: Partial<IndicatorMeta> = {}): IndicatorMeta => ({
  ...base,
  id,
  category,
  ...extra,
})

describe('agrupado del catálogo', () => {
  it('sigue el orden de las categorías y del catálogo, sin categorías vacías', () => {
    const groups = groupByCategory([ind('pib', 'economia'), ind('vida', 'salud'), ind('poblacion', 'demografia'), ind('renta', 'economia')])
    expect(groups.map((g) => [g.category, g.indicators.map((i) => i.id)])).toEqual([
      ['demografia', ['poblacion']],
      ['economia', ['pib', 'renta']],
      ['salud', ['vida']],
    ])
  })

  it('sin indicadores no hay grupos', () => {
    expect(groupByCategory([])).toEqual([])
  })

  it('cada categoría tiene nombre en es y en', () => {
    expect([...CATEGORIES].sort()).toEqual(Object.keys(es.categories).sort())
    expect([...CATEGORIES].sort()).toEqual(Object.keys(en.categories).sort())
  })
})

describe('ficha de fuente', () => {
  beforeAll(async () => {
    await i18n.use(initReactI18next).init({ resources: { es: { translation: es }, en: { translation: en } }, lng: 'es' })
  })

  const render = (meta: IndicatorMeta, language: 'es' | 'en' = 'es') =>
    renderToStaticMarkup(createElement(SourceCardView, { meta, year: 2001, language }))

  it('sin indicador activo no muestra nada', () => {
    // En el servidor Zustand pinta el estado inicial, que no tiene indicador.
    expect(renderToStaticMarkup(createElement(SourceCard))).toBe('')
  })

  it('muestra nombre, fuente con enlace, año activo, unidad y licencia con enlace y atribución', () => {
    const html = render(base)
    for (const text of ['Esperanza de vida', 'href="https://data.worldbank.org/x"', 'Banco Mundial', '2001', 'años', 'href="https://creativecommons.org/licenses/by/4.0/"', 'CC-BY-4.0', 'Banco Mundial, CC BY 4.0', es.source.clear]) {
      expect(html).toContain(text)
    }
    expect(html).not.toContain(es.source.nonCommercial)
  })

  it('nombre y unidad del catálogo en el idioma activo', () => {
    const html = render(base, 'en')
    expect(html).toContain('Life expectancy')
    expect(html).toContain('years')
  })

  it('marca el uso no comercial', () => {
    expect(render(ind('oms', 'salud', { license: { ...base.license, commercial: false } }))).toContain(es.source.nonCommercial)
  })
})
