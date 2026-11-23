import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import es from '../src/i18n/es.json'
import en from '../src/i18n/en.json'
import type { Catalog, IndicatorData, IndicatorMeta } from '../src/state/data'

const meta: IndicatorMeta = {
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
  source: { name: 'Banco Mundial', url: 'https://data.worldbank.org', accessed: '2026-11-23' },
  license: { id: 'CC-BY-4.0', url: 'https://creativecommons.org/licenses/by/4.0/', attribution: 'Banco Mundial', commercial: true },
  years: [1960, 2023],
  latestYear: 2023,
  file: 'indicators/esperanza-vida.json',
}
const catalog: Catalog = { generated: '2026-11-23', indicators: [meta] }
const data: IndicatorData = { id: 'esperanza-vida', years: [2022, 2023], values: { ESP: [83.2, null] } }
const files: Record<string, unknown> = { '/orbe/data/catalog.json': catalog, '/orbe/data/indicators/esperanza-vida.json': data }

let fetchMock: ReturnType<typeof vi.fn>

// La caché y el estado viven en los módulos: cada caso los carga de cero.
async function load(search = '') {
  vi.resetModules()
  vi.stubGlobal('location', { search })
  return { ...(await import('../src/state/data')), ...(await import('../src/state/store')) }
}

beforeEach(() => {
  vi.stubEnv('BASE_URL', '/orbe/')
  vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => {} })
  fetchMock = vi.fn(async (url: string) =>
    url in files ? new Response(JSON.stringify(files[url])) : new Response('', { status: 404 }),
  )
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('carga de datos', () => {
  it('parsea el catálogo y el indicador', async () => {
    const { loadCatalog, loadIndicator } = await load()
    const c = await loadCatalog()
    expect(c.indicators[0].latestYear).toBe(2023)
    expect((await loadIndicator(c.indicators[0])).values.ESP).toEqual([83.2, null])
  })

  it('una sola petición por recurso, también con dos a la vez y después de cachear', async () => {
    const { loadCatalog } = await load()
    const [a, b] = await Promise.all([loadCatalog(), loadCatalog()])
    expect(a).toBe(b)
    expect(await loadCatalog()).toBe(a)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('si falla, el siguiente intento vuelve a pedirlo', async () => {
    const { loadData } = await load()
    await expect(loadData('no-existe.json')).rejects.toThrow('HTTP 404')
    await expect(loadData('no-existe.json')).rejects.toThrow('HTTP 404')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})

describe('indicador en el store', () => {
  it('empieza sin indicador, año ni país', async () => {
    const s = (await load()).useAppStore.getState()
    expect([s.indicatorId, s.year, s.hoveredCountry]).toEqual([null, null, null])
  })

  it('?indicador válido lo activa con su último año', async () => {
    const { initIndicator, useAppStore } = await load('?indicador=esperanza-vida')
    await initIndicator()
    expect(useAppStore.getState()).toMatchObject({ indicatorId: 'esperanza-vida', year: 2023 })
  })

  it('?indicador inválido se ignora', async () => {
    const { initIndicator, useAppStore } = await load('?indicador=no-existe')
    await initIndicator()
    expect(useAppStore.getState()).toMatchObject({ catalog, indicatorId: null, year: null })
  })

  it('setIndicator pone el último año; setYear y setHoveredCountry solo cambian lo suyo', async () => {
    const { initIndicator, useAppStore } = await load()
    await initIndicator()
    const s = useAppStore.getState()
    s.setIndicator('esperanza-vida')
    s.setYear(2000)
    s.setHoveredCountry('ESP')
    expect(useAppStore.getState()).toMatchObject({ indicatorId: 'esperanza-vida', year: 2000, hoveredCountry: 'ESP' })
    s.setIndicator('esperanza-vida')
    expect(useAppStore.getState().year).toBe(2023)
    s.setIndicator('no-existe')
    expect(useAppStore.getState().indicatorId).toBe('esperanza-vida')
  })
})

describe('categorías', () => {
  it('las 8 categorías están en es y en', () => {
    const ids = ['demografia', 'economia', 'salud', 'educacion', 'medio-ambiente', 'energia', 'geografia', 'sociedad']
    expect(Object.keys(es.categories).sort()).toEqual([...ids].sort())
    expect(Object.keys(en.categories).sort()).toEqual([...ids].sort())
  })
})
