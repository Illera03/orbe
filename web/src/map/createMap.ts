import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'

// En la v6, con un empaquetador, MapLibre no localiza su worker solo: Vite lo emite y se lo indicamos.
maplibregl.setWorkerUrl(workerUrl)

export type ProjectionType = 'globe' | 'mercator'

// Estilo por defecto de las PoC; la app aplica el suyo con tema (GlobeMap).
export const BASE_STYLE = 'https://tiles.openfreemap.org/styles/dark'

/** Sin `style`, el mapa nace vacío y quien lo llama aplica el suyo con `setStyle` (p. ej. con `transformStyle`). */
export function createMap(container: HTMLElement, style: string | null = BASE_STYLE): maplibregl.Map {
  const map = new maplibregl.Map({
    container,
    style: style ?? undefined,
    center: [0, 20],
    zoom: 1.5,
    // Sin plegar nunca, tampoco en móvil: la atribución de OpenStreetMap debe verse siempre.
    attributionControl: { compact: false },
  })
  // Solo para el estilo fijo de las PoC: el globo de la app lleva la proyección dentro de su estilo (globeStyle).
  if (style) map.on('style.load', () => map.setProjection({ type: 'globe' }))
  return map
}

export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
