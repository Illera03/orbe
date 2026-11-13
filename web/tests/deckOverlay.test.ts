import { describe, expect, it, vi } from 'vitest'
import type * as maplibregl from 'maplibre-gl'
import { addDeckOverlay } from '../src/map/deckOverlay'

vi.mock('@deck.gl/mapbox', () => ({
  MapboxOverlay: class {
    setProps() {}
  },
}))
vi.mock('@deck.gl/layers', () => ({}))

// Imita un mapa de MapLibre: cualquier uso tras map.remove() lanza, como uno ya destruido.
function fakeMap() {
  let removed = false
  const guarded = () =>
    vi.fn(() => {
      if (removed) throw new Error('mapa destruido')
    })
  const map = {
    getProjection: () => ({ type: 'globe' }),
    on: guarded(),
    off: guarded(),
    addControl: guarded(),
    removeControl: guarded(),
    remove: () => {
      removed = true
    },
  }
  return map
}

const asMap = (m: ReturnType<typeof fakeMap>) => m as unknown as maplibregl.Map

describe('addDeckOverlay', () => {
  it('no toca el mapa si se desmonta durante la carga de deck.gl', async () => {
    const map = fakeMap()
    const loading = new AbortController()
    const pending = addDeckOverlay(asMap(map), () => [], loading.signal)
    // Desmontaje mientras se resuelven los import(): se aborta y se destruye el mapa.
    loading.abort()
    map.remove()
    const remove = await pending
    expect(remove).not.toThrow()
    expect(map.on).not.toHaveBeenCalled()
    expect(map.addControl).not.toHaveBeenCalled()
  })

  it('monta el overlay y lo quita si no se aborta', async () => {
    const map = fakeMap()
    const remove = await addDeckOverlay(asMap(map), () => [], new AbortController().signal)
    expect(map.addControl).toHaveBeenCalledOnce()
    remove()
    expect(map.removeControl).toHaveBeenCalledOnce()
    expect(map.off).toHaveBeenCalledOnce()
  })
})
