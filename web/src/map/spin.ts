import type * as maplibregl from 'maplibre-gl'
import { createFpsCounter } from './fps'
import { prefersReducedMotion } from './createMap'

const DEG_PER_SECOND = 6

/** Gira el globo con requestAnimationFrame y mide los fps. Devuelve la función que lo para. */
export function spinGlobe(map: maplibregl.Map, onFps: (fps: number) => void): () => void {
  const tick = createFpsCounter(onFps)
  const spin = !prefersReducedMotion()
  let last = performance.now()
  let id = 0
  const frame = (now: number) => {
    tick(now)
    // Se pausa mientras el usuario mueve el mapa para no pelear con su gesto.
    if (spin && !map.isMoving()) {
      const c = map.getCenter()
      map.setCenter([c.lng + (DEG_PER_SECOND * (now - last)) / 1000, c.lat])
    }
    last = now
    id = requestAnimationFrame(frame)
  }
  id = requestAnimationFrame(frame)
  return () => cancelAnimationFrame(id)
}
