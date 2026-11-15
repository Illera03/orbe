import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type * as maplibregl from 'maplibre-gl'
import type { StyleSpecification } from 'maplibre-gl'
import { animateProjection, boundsFor, flyToBounds, globeness, globeStyle, projectionSpec, setActiveMap } from '../src/map/globe'
import { reducedMotion, shared } from '../src/theme/tokens'
import { mapColors } from '../src/theme/map'

const reduce = { value: false }
vi.mock('../src/map/createMap', () => ({ prefersReducedMotion: () => reduce.value }))

const base: StyleSpecification = {
  version: 8,
  center: [10, 10],
  zoom: 3,
  sources: { openmaptiles: { type: 'vector', url: 'https://tiles.test/planet', attribution: 'Data from OSM' } },
  layers: [
    { id: 'bg', type: 'background' },
    { id: 'place', type: 'symbol', source: 'openmaptiles', 'source-layer': 'place' },
  ],
}

describe('globeStyle', () => {
  const style = globeStyle(base, 'dark', 'pmtiles://x', 'globe')

  it('añade los países bajo las etiquetas, con el borde del tema', () => {
    expect(style.layers.map((l) => l.id)).toEqual(['bg', 'countries-line', 'place'])
    expect(style.layers[1]).toMatchObject({ paint: { 'line-color': mapColors('dark').countryBorder } })
    expect(style.sources.countries).toMatchObject({ type: 'vector', url: 'pmtiles://x' })
  })

  it('globo, atribución completa de OSM y sin cámara que mueva el mapa al cambiar de tema', () => {
    expect(style.projection).toEqual(projectionSpec('globe'))
    expect(style.sources.openmaptiles).toMatchObject({ attribution: expect.stringContaining('© OpenStreetMap contributors') })
    expect(style).not.toHaveProperty('center')
    expect(style).not.toHaveProperty('zoom')
  })
})

describe('proyección', () => {
  it('el globo se aplana entre z5 y z6; el plano es Mercator a cualquier zoom', () => {
    expect(projectionSpec('globe')).toEqual({
      type: ['interpolate', ['linear'], ['zoom'], 5, 'vertical-perspective', 6, 'mercator'],
    })
    expect(projectionSpec('mercator')).toEqual({ type: 'mercator' })
    expect(globeStyle(base, 'light', 'pmtiles://x', 'mercator').projection).toEqual({ type: 'mercator' })
    expect([1.5, 5.5, 8].map((z) => globeness('globe', z))).toEqual([1, 0.5, 0])
    expect(globeness('mercator', 1.5)).toBe(0)
  })
})

describe('animateProjection', () => {
  // Como MapLibre: la expresión por zoom recién puesta se evalúa a z0 (globo) y la del estado global sigue su valor.
  function fakeMap(state: number, zoom = 1.5) {
    const projection = { transitionState: state }
    let globeness = 1
    let morphing = false
    return {
      style: { projection },
      getZoom: () => zoom,
      setProjection: vi.fn(({ type }: { type: unknown }) => {
        morphing = JSON.stringify(type).includes('global-state')
        projection.transitionState = morphing ? globeness : type === 'mercator' ? 0 : 1
      }),
      setGlobalStateProperty: vi.fn((_key: string, value: number) => {
        globeness = value
        if (morphing) projection.transitionState = value
      }),
    }
  }
  const asMap = (m: ReturnType<typeof fakeMap>) => m as unknown as maplibregl.Map
  beforeEach(() => {
    // Sin DOM no hay requestAnimationFrame: fotogramas de 16 ms sobre temporizadores falsos.
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance'] })
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => setTimeout(() => cb(performance.now()), 16))
    vi.stubGlobal('cancelAnimationFrame', clearTimeout)
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('anima el estado global del globo al plano y deja Mercator', () => {
    const map = fakeMap(1)
    const onEnd = vi.fn()
    animateProjection(asMap(map), 'mercator', 1000, onEnd)
    expect(map.setGlobalStateProperty).toHaveBeenLastCalledWith('orbe-globeness', 1)
    vi.advanceTimersByTime(500)
    const mid = map.setGlobalStateProperty.mock.lastCall![1]
    expect(mid).toBeGreaterThan(0)
    expect(mid).toBeLessThan(1)
    expect(onEnd).not.toHaveBeenCalled()
    vi.advanceTimersByTime(600)
    expect(map.setGlobalStateProperty).toHaveBeenCalledWith('orbe-globeness', 0)
    expect(map.setProjection).toHaveBeenLastCalledWith({ type: 'mercator' })
    // En reposo el estado vuelve a 1 para el halo de atmósfera.
    expect(map.setGlobalStateProperty).toHaveBeenLastCalledWith('orbe-globeness', 1)
    expect(onEnd).toHaveBeenCalledOnce()
  })

  it('cortarla deja ya la proyección final; sin nada que animar, cambia al momento', () => {
    const map = fakeMap(0)
    const onEnd = vi.fn()
    const stop = animateProjection(asMap(map), 'globe', 1000, onEnd)
    stop()
    stop()
    expect(map.setProjection).toHaveBeenLastCalledWith(projectionSpec('globe'))
    expect(onEnd).toHaveBeenCalledOnce()
    // A z8 el globo ya se ve plano: pasar a Mercator no tiene animación.
    const lejos = fakeMap(0, 8)
    animateProjection(asMap(lejos), 'mercator', 1000, onEnd)
    expect(lejos.setGlobalStateProperty.mock.calls).toEqual([['orbe-globeness', 1]])
    expect(lejos.setProjection).toHaveBeenCalledWith({ type: 'mercator' })
  })

  it('doble clic: la segunda parte de donde iba la primera, leído antes de cortarla (como GlobeMap)', () => {
    const map = fakeMap(1)
    const stop = animateProjection(asMap(map), 'mercator', 1000, () => {})
    vi.advanceTimersByTime(500)
    const from = map.style.projection.transitionState
    expect(from).toBeGreaterThan(0)
    expect(from).toBeLessThan(1)
    stop()
    // Cortar deja Mercator: leído ahora daría 0 y el mapa saltaría.
    expect(map.style.projection.transitionState).toBe(0)
    map.setGlobalStateProperty.mockClear()
    animateProjection(asMap(map), 'globe', 1000, () => {}, from)
    expect(map.setGlobalStateProperty.mock.calls[0]).toEqual(['orbe-globeness', from])
  })
})

describe('boundsFor', () => {
  it('deja igual un encuadre normal', () => {
    expect(boundsFor([-18.17, 27.64, 4.33, 43.77])).toEqual([
      [-18.17, 27.64],
      [4.33, 43.77],
    ])
  })

  it('suma 360 al este si cruza el antimeridiano (Fiyi)', () => {
    expect(boundsFor([177.28, -18.29, -179.79, -16.02])).toEqual([
      [177.28, -18.29],
      [180.21, -16.02],
    ])
  })
})

describe('flyToBounds', () => {
  const fitBounds = vi.fn()
  setActiveMap({ fitBounds } as unknown as maplibregl.Map)

  it('limita el zoom a z6 y usa la duración de cámara del tema', () => {
    flyToBounds([179.08, -9.0, 179.24, -8.47])
    expect(fitBounds.mock.lastCall![1]).toMatchObject({ maxZoom: 6, duration: parseInt(shared.motion.camera) })
  })

  it('con prefers-reduced-motion, transición corta', () => {
    reduce.value = true
    flyToBounds([72.68, -0.7, 73.76, 7.11])
    expect(fitBounds.mock.lastCall![1]).toMatchObject({ duration: parseInt(reducedMotion.camera) })
  })
})
