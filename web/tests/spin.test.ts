import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type * as maplibregl from 'maplibre-gl'
import { spinUntilInteraction } from '../src/map/spin'

const reduce = { value: false }
vi.mock('../src/map/createMap', () => ({ prefersReducedMotion: () => reduce.value }))

// Mapa falso: guarda los manejadores y gira el centro con setCenter.
function fakeMap() {
  const handlers = new Map<string, () => void>()
  const container = new EventTarget()
  let lng = 0
  return {
    handlers,
    container,
    lng: () => lng,
    on: (type: string, fn: () => void) => handlers.set(type, fn),
    off: (type: string) => handlers.delete(type),
    getContainer: () => container,
    isMoving: () => false,
    getCenter: () => ({ lng, lat: 20 }),
    setCenter: ([x]: [number, number]) => {
      lng = x
    },
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
  reduce.value = false
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('spinUntilInteraction', () => {
  it.each(['mousedown', 'touchstart', 'wheel', 'dragstart'])('gira y se para del todo con %s', (type) => {
    const map = fakeMap()
    const onStop = vi.fn()
    spinUntilInteraction(asMap(map), onStop)
    vi.advanceTimersByTime(1000)
    expect(map.lng()).toBeGreaterThan(5)
    map.handlers.get(type)!()
    const parado = map.lng()
    vi.advanceTimersByTime(5000)
    expect(map.lng()).toBe(parado)
    expect(onStop).toHaveBeenCalledOnce()
    expect(map.handlers.size).toBe(0)
  })

  it('se para con el teclado sobre el mapa y desde fuera (búsqueda, proyección), avisando una sola vez', () => {
    const map = fakeMap()
    const onStop = vi.fn()
    const stop = spinUntilInteraction(asMap(map), onStop)!
    map.container.dispatchEvent(new Event('keydown'))
    stop()
    const parado = map.lng()
    vi.advanceTimersByTime(2000)
    expect(map.lng()).toBe(parado)
    expect(onStop).toHaveBeenCalledOnce()
  })

  it('con prefers-reduced-motion no gira', () => {
    reduce.value = true
    const map = fakeMap()
    expect(spinUntilInteraction(asMap(map), () => {})).toBeNull()
    vi.advanceTimersByTime(2000)
    expect(map.lng()).toBe(0)
  })
})
