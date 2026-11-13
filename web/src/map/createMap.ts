import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'

// En la v6, con un empaquetador, MapLibre no localiza su worker solo: Vite lo emite y se lo indicamos.
maplibregl.setWorkerUrl(workerUrl)

export type ProjectionType = 'globe' | 'mercator'

// shortcut: estilo oscuro fijo de OpenFreeMap; el cambio claro/oscuro llegará con web/src/theme/.
export const BASE_STYLE = 'https://tiles.openfreemap.org/styles/dark'

export function createMap(container: HTMLElement): maplibregl.Map {
  const map = new maplibregl.Map({ container, style: BASE_STYLE, center: [0, 20], zoom: 1.5 })
  // En v5 la proyección forma parte del estilo: se fija cada vez que este se carga.
  map.on('style.load', () => map.setProjection({ type: 'globe' }))
  return map
}

export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
