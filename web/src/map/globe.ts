// Globo de la app: estilo base con tema, capa de países de data/geo y cámara para el buscador.
import type * as maplibregl from 'maplibre-gl'
import type { LngLatBoundsLike, ProjectionSpecification, StyleSpecification } from 'maplibre-gl'
// Sin pasar por theme/index, que inyecta CSS y fuentes: así se puede probar sin DOM.
import { reducedMotion, shared, type ThemeName } from '../theme/tokens'
import { mapColors, themeMapStyle } from '../theme/map'
import { prefersReducedMotion, type ProjectionType } from './createMap'

/** Encuadre [oeste, sur, este, norte] de `data/geo/countries.json`. */
export type Bbox = [number, number, number, number]

/** Techo de zoom del PMTiles de países: más cerca, los microestados (TUV, MDV) se quedan sin geometría. */
export const MAX_FIT_ZOOM = 6
/** En globo, zoom en que empieza a aplanarse y zoom en que ya es Mercator. */
export const FLATTEN_ZOOM = [5, 6] as const
// Estado global de MapLibre que guía la animación del botón: 1 globo, 0 plano.
const MORPH_STATE = 'orbe-globeness'
const BASE_SOURCE = 'openmaptiles'
// Marca legal exigida por la ODbL; los nombres propios no se traducen.
const BASE_ATTRIBUTION =
  '<a href="https://openfreemap.org" target="_blank">OpenFreeMap</a> ' +
  '<a href="https://www.openmaptiles.org/" target="_blank">© OpenMapTiles</a> ' +
  '<a href="https://www.openstreetmap.org/copyright" target="_blank">© OpenStreetMap contributors</a>'

/**
 * Estilo final del globo: tema de `theme/`, la proyección elegida, atribución completa de OSM y las capas propias.
 * Se usa como `transformStyle`, así que en cada `setStyle` (cambio de tema) las capas propias viajan con el estilo
 * y el diff no las borra. Sin centro ni zoom: el cambio de tema no mueve la cámara.
 */
export function globeStyle(
  base: StyleSpecification,
  theme: ThemeName,
  countriesUrl: string,
  projection: ProjectionType,
): StyleSpecification {
  const style = themeMapStyle(base, theme)
  delete style.center
  delete style.zoom
  delete style.bearing
  delete style.pitch
  const layers = [...style.layers]
  // Bajo las etiquetas del mapa base para que los nombres sigan legibles.
  const firstSymbol = layers.findIndex((l) => l.type === 'symbol')
  layers.splice(firstSymbol < 0 ? layers.length : firstSymbol, 0, {
    id: 'countries-line',
    type: 'line',
    source: 'countries',
    'source-layer': 'countries',
    paint: { 'line-color': mapColors(theme).countryBorder, 'line-width': 0.8 },
  })
  const baseSource = style.sources[BASE_SOURCE]
  return {
    ...style,
    projection: projectionSpec(projection),
    sources: {
      ...style.sources,
      ...(baseSource?.type === 'vector' && { [BASE_SOURCE]: { ...baseSource, attribution: BASE_ATTRIBUTION } }),
      countries: { type: 'vector', url: countriesUrl, attribution: 'Natural Earth' },
    },
    layers,
  }
}

/** Límites para `fitBounds`: si oeste > este, el encuadre cruza el antimeridiano y el este pasa a este + 360. */
export function boundsFor([w, s, e, n]: Bbox): LngLatBoundsLike {
  return [
    [w, s],
    [w > e ? e + 360 : e, n],
  ]
}

let active: maplibregl.Map | null = null

/** Registra el mapa de la app para `flyToBounds`; `null` al desmontarlo. */
export function setActiveMap(map: maplibregl.Map | null): void {
  active = map
}

/**
 * Lleva la cámara al encuadre de un país (buscador, ficha). Con `prefers-reduced-motion`, transición corta.
 * No hace nada si el mapa aún no existe (sin WebGL2, por ejemplo).
 */
export function flyToBounds(bbox: Bbox): void {
  if (!active) return
  const ms = cameraMs()
  // shortcut: margen fijo que deja libre la barra superior; ajustarlo cuando existan la ficha y las hojas móviles.
  const padding = { top: 96, right: 32, bottom: 32, left: 32 }
  active.fitBounds(boundsFor(bbox), { padding, maxZoom: MAX_FIT_ZOOM, duration: ms })
}

/** Duración de las transiciones de cámara del tema; corta con `prefers-reduced-motion`. */
export function cameraMs(): number {
  return parseInt(prefersReducedMotion() ? reducedMotion.camera : shared.motion.camera, 10)
}

/** Proyección del estilo: el globo se aplana solo entre los zooms de `FLATTEN_ZOOM`; el plano lo es a cualquier zoom. */
export function projectionSpec(projection: ProjectionType): ProjectionSpecification {
  if (projection === 'mercator') return { type: 'mercator' }
  const [from, to] = FLATTEN_ZOOM
  return { type: ['interpolate', ['linear'], ['zoom'], from, 'vertical-perspective', to, 'mercator'] }
}

/** Lo curvo que se ve el mapa con esa proyección y zoom: 1 globo, 0 plano. */
export function globeness(projection: ProjectionType, zoom: number): number {
  if (projection === 'mercator') return 0
  const [from, to] = FLATTEN_ZOOM
  return Math.min(1, Math.max(0, (to - zoom) / (to - from)))
}

/**
 * Pasa a `to` con el globo aplanándose (o curvándose) durante `ms`, sin recargar el estilo ni mover la cámara.
 * Mientras dura, la proyección es una expresión sobre un estado global que se anima; al acabar queda `projectionSpec(to)`.
 * Devuelve la función que la corta y deja ya la proyección final; `onEnd` llega en ambos casos.
 */
export function animateProjection(map: maplibregl.Map, to: ProjectionType, ms: number, onEnd: () => void): () => void {
  const from = map.style.projection?.transitionState ?? 1
  const target = globeness(to, map.getZoom())
  let id = 0
  let done = false
  const finish = () => {
    if (done) return
    done = true
    cancelAnimationFrame(id)
    map.setProjection(projectionSpec(to))
    onEnd()
  }
  if (ms <= 0 || from === target) {
    finish()
    return finish
  }
  map.setGlobalStateProperty(MORPH_STATE, from)
  map.setProjection({
    type: ['interpolate', ['linear'], ['global-state', MORPH_STATE], 0, 'mercator', 1, 'vertical-perspective'],
  })
  const start = performance.now()
  const frame = (now: number) => {
    const t = Math.min(1, (now - start) / ms)
    // Suavizado en los dos extremos (smoothstep).
    map.setGlobalStateProperty(MORPH_STATE, from + (target - from) * t * t * (3 - 2 * t))
    if (t < 1) id = requestAnimationFrame(frame)
    else finish()
  }
  id = requestAnimationFrame(frame)
  return finish
}
