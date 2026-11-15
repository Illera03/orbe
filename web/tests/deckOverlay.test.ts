import { afterEach, describe, expect, it, vi } from 'vitest'
import type * as maplibregl from 'maplibre-gl'
import { addDeckOverlay } from '../src/map/deckOverlay'

vi.mock('@deck.gl/mapbox', () => ({
  // deck.gl avisa con onLoad cuando ya puede dibujar, o con onError si no arranca; `deck.mode` elige.
  MapboxOverlay: class {
    constructor({ onLoad, onError }: { onLoad: () => void; onError: (e: Error) => void }) {
      if (deck.mode === 'load') queueMicrotask(onLoad)
      if (deck.mode === 'error') queueMicrotask(() => onError(new Error('sin WebGL2')))
    }
    setProps() {
      deck.setProps++
    }
  },
}))
vi.mock('@deck.gl/layers', () => ({}))

const deck = vi.hoisted(() => ({ mode: 'load' as 'load' | 'hold' | 'error', setProps: 0 }))
afterEach(() => {
  deck.mode = 'load'
  deck.setProps = 0
})

// Imita un mapa de MapLibre: cualquier uso tras map.remove() lanza, como uno ya destruido.
function fakeMap() {
  let removed = false
  const guarded = () =>
    vi.fn(() => {
      if (removed) throw new Error('mapa destruido')
    })
  const map = {
    getProjection: () => ({ type: 'globe' }),
    getCanvas: () => ({ clientHeight: 800 }),
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

  it('termina sin colgarse si se aborta mientras deck.gl se inicializa', async () => {
    deck.mode = 'hold'
    const map = fakeMap()
    const loading = new AbortController()
    const pending = addDeckOverlay(asMap(map), () => [], loading.signal)
    await vi.waitFor(() => expect(map.addControl).toHaveBeenCalledOnce())
    loading.abort()
    map.remove()
    const remove = await pending
    expect(remove).not.toThrow()
  })

  it('rechaza y retira el overlay si deck.gl falla al inicializarse', async () => {
    deck.mode = 'error'
    const map = fakeMap()
    await expect(addDeckOverlay(asMap(map), () => [], new AbortController().signal)).rejects.toThrow('sin WebGL2')
    expect(map.removeControl).toHaveBeenCalledOnce()
    expect(map.off).toHaveBeenCalledOnce()
  })

  it('no espera a onLoad si el mapa ya tiene un deck.gl montado', async () => {
    deck.mode = 'hold'
    const map = Object.assign(fakeMap(), { __deck: {} })
    await expect(addDeckOverlay(asMap(map), () => [], new AbortController().signal)).resolves.toBeTypeOf('function')
  })

  it('monta el overlay y lo quita si no se aborta', async () => {
    const map = fakeMap()
    const remove = await addDeckOverlay(asMap(map), () => [], new AbortController().signal)
    expect(map.addControl).toHaveBeenCalledOnce()
    remove()
    expect(map.removeControl).toHaveBeenCalledOnce()
    expect(map.off).toHaveBeenCalledOnce()
  })

  it('expone map.transform.height para deck.gl 9.4.1 sobre maplibre-gl 6', async () => {
    const map = fakeMap()
    await addDeckOverlay(asMap(map), () => [], new AbortController().signal)
    expect((map as unknown as { transform: { height: number } }).transform.height).toBe(800)
    // Un segundo overlay sobre el mismo mapa no vuelve a definir la propiedad (lanzaría TypeError).
    await expect(addDeckOverlay(asMap(map), () => [], new AbortController().signal)).resolves.toBeTypeOf('function')
  })

  it('deck.gl ve la proyección efectiva del globo que se aplana por zoom y rehace las capas al cruzar el umbral', async () => {
    const map = fakeMap()
    const state = { transitionState: 1 }
    // getProjection en el prototipo, como en MapLibre, devolviendo la expresión por zoom del globo de la app.
    Reflect.deleteProperty(map, 'getProjection')
    Object.setPrototypeOf(map, { getProjection: () => ({ type: ['interpolate', ['linear'], ['zoom'], 5, 'x', 6, 'y'] }) })
    Object.assign(map, { style: { projection: state } })
    const build = vi.fn(() => [])
    const remove = await addDeckOverlay(asMap(map), build, new AbortController().signal)
    expect(asMap(map).getProjection()).toEqual({ type: 'globe' })
    const calls = map.on.mock.calls as unknown as [string, () => void][]
    const render = calls.find(([event]) => event === 'render')![1]
    render()
    expect(deck.setProps).toBe(0)
    state.transitionState = 0
    expect(asMap(map).getProjection()).toEqual({ type: 'mercator' })
    render()
    expect(deck.setProps).toBe(1)
    expect(build).toHaveBeenLastCalledWith({}, 'mercator')
    // Al retirar el overlay, el mapa vuelve a su getProjection.
    remove()
    expect(Object.hasOwn(map, 'getProjection')).toBe(false)
  })
})
