import type * as maplibregl from 'maplibre-gl'
import { createFpsCounter } from './fps'
import { prefersReducedMotion } from './createMap'

const DEG_PER_SECOND = 6
// Gestos que paran la rotación de entrada. 'dragstart' cubre arrastre con ratón y con el dedo.
const INTERACTIONS = ['mousedown', 'touchstart', 'wheel', 'dragstart'] as const

/** Gira el globo con requestAnimationFrame y, si se pide, mide los fps. Devuelve la función que lo para. */
export function spinGlobe(map: maplibregl.Map, onFps?: (fps: number) => void): () => void {
  const tick = onFps && createFpsCounter(onFps)
  const spin = !prefersReducedMotion()
  let last = performance.now()
  let id = 0
  const frame = (now: number) => {
    tick?.(now)
    // Se pausa mientras el usuario mueve el mapa para no pelear con su gesto.
    if (spin && !map.isMoving()) {
      const c = map.getCenter()
      // Delta acotado: al volver a una pestaña oculta el globo no salta.
      map.setCenter([c.lng + (DEG_PER_SECOND * Math.min(now - last, 100)) / 1000, c.lat])
    }
    last = now
    id = requestAnimationFrame(frame)
  }
  id = requestAnimationFrame(frame)
  return () => cancelAnimationFrame(id)
}

/**
 * Rotación de entrada de la home: gira hasta la primera interacción con el mapa (ratón, toque, rueda, arrastre o
 * teclado) y no vuelve. Con `prefers-reduced-motion` no gira y devuelve `null`. Si gira, devuelve la función que la
 * para, para quien detecte otras interacciones (búsqueda, botón globo/plano) y al desmontar; se puede llamar varias
 * veces y `onStop` llega una sola vez, la pare quien la pare.
 */
export function spinUntilInteraction(map: maplibregl.Map, onStop: () => void): (() => void) | null {
  if (prefersReducedMotion()) return null
  const stopSpin = spinGlobe(map)
  const container = map.getContainer()
  let stopped = false
  const stop = () => {
    if (stopped) return
    stopped = true
    stopSpin()
    for (const type of INTERACTIONS) map.off(type, stop)
    container.removeEventListener('keydown', stop)
    onStop()
  }
  for (const type of INTERACTIONS) map.on(type, stop)
  container.addEventListener('keydown', stop)
  return stop
}
