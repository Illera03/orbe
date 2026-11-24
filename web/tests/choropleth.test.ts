import { describe, expect, it, vi } from 'vitest'
import type * as maplibregl from 'maplibre-gl'
import { attachChoropleth, NODATA_LAYER } from '../src/map/choropleth'
import { useAppStore } from '../src/state/store'
import type { IndicatorMeta } from '../src/state/data'

vi.mock('../src/state/data', () => ({
  loadIndicator: () => Promise.resolve({ id: 'x', years: [2000, 2001], values: { AAA: [1, 2], BBB: [3, null] } }),
}))

// Mapa mínimo: guarda feature-state, visibilidad y manejadores.
function fakeMap() {
  const states = new Map<string, { color?: string }>()
  const handlers: Record<string, ((...a: unknown[]) => void)[]> = {}
  let visibility = 'none'
  // Imágenes registradas y visibilidad del rayado en el momento de registrarlas.
  const images = new Map<string, string>()
  const map = {
    hasImage: (id: string) => images.has(id),
    addImage: (id: string) => images.set(id, visibility),
    getPaintProperty: () => 'orbe-nodata-dark',
    style: { _loaded: true },
    getLayer: () => ({}),
    removeFeatureState: () => states.clear(),
    setFeatureState: ({ id }: { id: string }, s: { color: string }) => states.set(id, s),
    getFeatureState: ({ id }: { id: string }) => states.get(id) ?? {},
    setLayoutProperty: (_l: string, _p: string, v: string) => (visibility = v),
    getLayoutProperty: () => visibility,
    on: (ev: string, ...rest: unknown[]) => (handlers[ev] ??= []).push(rest.at(-1) as () => void),
    off: vi.fn(),
    once: (ev: string, fn: () => void) => (handlers[ev] ??= []).push(fn),
  }
  const fire = (ev: string, arg?: unknown) => handlers[ev]?.splice(0).forEach((fn) => fn(arg))
  return { map: map as unknown as maplibregl.Map, states, fire, images, visibility: () => visibility }
}

const meta = { id: 'x', years: [2000, 2001], latestYear: 2001, file: 'x.json', scale: { kind: 'sequential', transform: 'linear', palette: 'viridis' } }
const flush = () => new Promise((r) => setTimeout(r, 0))

describe('attachChoropleth', () => {
  it('pinta el año activo, muestra el rayado y lo quita sin indicador', async () => {
    const { map, states, fire, images, visibility } = fakeMap()
    const el = { dataset: {} } as HTMLElement
    useAppStore.setState({ catalog: { generated: '', indicators: [meta as unknown as IndicatorMeta] }, indicatorId: null, year: null })
    const detach = attachChoropleth(map, el)
    expect(visibility()).toBe('none')

    useAppStore.getState().setIndicator('x')
    // 2001: BBB no tiene dato, así que solo AAA lleva color (la escala llega con import() dinámico).
    await vi.waitFor(() => expect([...states.keys()]).toEqual(['AAA']))
    expect(visibility()).toBe('visible')
    // El rayado se registra antes de mostrar su capa, no a la espera de `styleimagemissing`.
    expect([...images]).toEqual([['orbe-nodata-dark', 'none']])
    fire('idle')
    expect(el.dataset.choropleth).toBe('x:2001')

    useAppStore.getState().setYear(2000)
    await flush()
    expect([...states.keys()]).toEqual(['AAA', 'BBB'])

    // Un setStyle que borra el feature-state se repinta en el siguiente styledata.
    states.clear()
    map.setLayoutProperty(NODATA_LAYER, 'visibility', 'none')
    fire('styledata')
    expect(states.size).toBe(2)
    expect(visibility()).toBe('visible')

    useAppStore.setState({ indicatorId: null, year: null })
    await flush()
    expect(states.size).toBe(0)
    expect(visibility()).toBe('none')
    expect(el.dataset.choropleth).toBeUndefined()
    detach()
  })
})
