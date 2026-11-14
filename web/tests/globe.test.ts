import { describe, expect, it, vi } from 'vitest'
import type * as maplibregl from 'maplibre-gl'
import type { StyleSpecification } from 'maplibre-gl'
import { boundsFor, flyToBounds, globeStyle, setActiveMap } from '../src/map/globe'
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
  const style = globeStyle(base, 'dark', 'pmtiles://x')

  it('añade los países bajo las etiquetas, con el borde del tema', () => {
    expect(style.layers.map((l) => l.id)).toEqual(['bg', 'countries-line', 'place'])
    expect(style.layers[1]).toMatchObject({ paint: { 'line-color': mapColors('dark').countryBorder } })
    expect(style.sources.countries).toMatchObject({ type: 'vector', url: 'pmtiles://x' })
  })

  it('globo, atribución completa de OSM y sin cámara que mueva el mapa al cambiar de tema', () => {
    expect(style.projection).toEqual({ type: 'globe' })
    expect(style.sources.openmaptiles).toMatchObject({ attribution: expect.stringContaining('© OpenStreetMap contributors') })
    expect(style).not.toHaveProperty('center')
    expect(style).not.toHaveProperty('zoom')
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
