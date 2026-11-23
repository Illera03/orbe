import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type * as maplibregl from 'maplibre-gl'
import type { StyleSpecification } from 'maplibre-gl'
import {
  animateProjection,
  boundsFor,
  fitGlobeZoom,
  FLATTEN_ZOOM,
  flyToBounds,
  globeness,
  globeStyle,
  LANGUAGE_STATE,
  PROJECTION_STATE,
  projectionSpec,
  setActiveMap,
} from '../src/map/globe'
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
    {
      id: 'place',
      type: 'symbol',
      source: 'openmaptiles',
      'source-layer': 'place',
      layout: { 'text-field': ['case', ['has', 'name:nonlatin'], ['get', 'name:latin'], ['coalesce', ['get', 'name_en'], ['get', 'name']]] },
    },
    { id: 'shield', type: 'symbol', source: 'openmaptiles', 'source-layer': 'transportation_name', layout: { 'text-field': ['to-string', ['get', 'ref']] } },
  ],
}

describe('globeStyle', () => {
  const style = globeStyle(base, 'dark', 'pmtiles://x', 'globe', 'es')

  it('añade los países bajo las etiquetas, con el borde del tema', () => {
    expect(style.layers.map((l) => l.id)).toEqual(['bg', 'countries-nodata', 'countries-fill', 'countries-line', 'place', 'shield'])
    expect(style.layers[3]).toMatchObject({ paint: { 'line-color': mapColors('dark').countryBorder } })
    expect(style.sources.countries).toMatchObject({ type: 'vector', url: 'pmtiles://x', promoteId: 'ISO_A3' })
  })

  it('con límites en el mapa base, la coropleta va sobre las carreteras y bajo los límites (dark)', () => {
    const line = (id: string, src: string) => ({ id, type: 'line', source: 'openmaptiles', 'source-layer': src }) as const
    const dark = { ...base, layers: [base.layers[0], base.layers[2], line('road', 'transportation'), line('border', 'boundary'), base.layers[1]] }
    const ids = globeStyle(dark, 'dark', 'pmtiles://x', 'globe', 'es').layers.map((l) => l.id)
    expect(ids).toEqual(['bg', 'shield', 'road', 'countries-nodata', 'countries-fill', 'countries-line', 'border', 'place'])
  })

  it('globo, atribución completa de OSM y sin cámara que mueva el mapa al cambiar de tema', () => {
    expect(style.projection).toEqual(projectionSpec('globe'))
    expect(style.sources.openmaptiles).toMatchObject({ attribution: expect.stringContaining('© OpenStreetMap contributors') })
    expect(style).not.toHaveProperty('center')
    expect(style).not.toHaveProperty('zoom')
  })
})

describe('etiquetas', () => {
  const style = globeStyle(base, 'dark', 'pmtiles://x', 'globe', 'en')

  it('los nombres van en el idioma del estado global, con la transliteración latina y el local de respaldo', () => {
    expect(style.state?.[LANGUAGE_STATE]).toEqual({ default: 'en' })
    expect(style.state?.[PROJECTION_STATE]).toEqual({ default: 'globe' })
    expect(style.layers[4]).toMatchObject({
      layout: {
        'text-field': [
          'coalesce',
          ['get', ['concat', 'name:', ['global-state', LANGUAGE_STATE]]],
          ['get', 'name:latin'],
          ['get', 'name'],
        ],
        // Pegadas a la esfera solo en globo y por debajo del zoom en que ya es plano.
        'text-pitch-alignment': [
          'step',
          ['zoom'],
          ['case', ['==', ['global-state', PROJECTION_STATE], 'globe'], 'map', 'viewport'],
          FLATTEN_ZOOM[1],
          'viewport',
        ],
      },
    })
  })

  it('las referencias de carretera no cambian', () => {
    expect(style.layers[5]).toEqual(base.layers[2])
  })
})

describe('fitGlobeZoom', () => {
  it('en escritorio el globo llena el alto libre y en móvil el ancho', () => {
    // Radio en pantalla con el zoom calculado, con la misma fórmula de MapLibre (ver fitGlobeZoom).
    const screenRadius = (w: number, h: number) => {
      const z = fitGlobeZoom(w, h, 20, 36.87)
      const R = (512 * 2 ** z) / (2 * Math.PI * Math.cos((20 * Math.PI) / 180))
      const d = h / 2 / Math.tan((36.87 * Math.PI) / 360)
      return (d * R) / Math.sqrt(d * d + 2 * d * R)
    }
    expect(screenRadius(1280, 800)).toBeCloseTo(400 - 88)
    expect(screenRadius(375, 812)).toBeCloseTo(187.5 - 16)
  })
})

describe('proyección', () => {
  it('el globo se aplana entre z5 y z6; el plano es Mercator a cualquier zoom', () => {
    expect(projectionSpec('globe')).toEqual({
      type: ['interpolate', ['linear'], ['zoom'], 5, 'vertical-perspective', 6, 'mercator'],
    })
    expect(projectionSpec('mercator')).toEqual({ type: 'mercator' })
    expect(globeStyle(base, 'light', 'pmtiles://x', 'mercator', 'es').projection).toEqual({ type: 'mercator' })
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
