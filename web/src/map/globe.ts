// Globo de la app: estilo base con tema, capa de países de data/geo y cámara para el buscador.
import type * as maplibregl from 'maplibre-gl'
import type {
  LayerSpecification,
  LngLatBoundsLike,
  ProjectionSpecification,
  StyleSpecification,
} from 'maplibre-gl'
// Sin pasar por theme/index, que inyecta CSS y fuentes: así se puede probar sin DOM.
import { reducedMotion, shared, type ThemeName } from '../theme/tokens'
import { GLOBENESS_STATE as MORPH_STATE, countryLineWidth, mapColors, themeMapStyle } from '../theme/map'
import { prefersReducedMotion, type ProjectionType } from './createMap'
import type { Language } from '../state/store'
import { choroplethLayers, COUNTRY_ID_PROPERTY } from './choropleth'

/** Encuadre [oeste, sur, este, norte] de `data/geo/countries.json`. */
export type Bbox = [number, number, number, number]

/** Techo de zoom del PMTiles de países: más cerca, los microestados (TUV, MDV) se quedan sin geometría. */
export const MAX_FIT_ZOOM = 6
/** En globo, zoom en que empieza a aplanarse y zoom en que ya es Mercator. */
export const FLATTEN_ZOOM = [5, 6] as const
const BASE_SOURCE = 'openmaptiles'
/** Estado global de MapLibre con el idioma de las etiquetas: cambiarlo no recarga el estilo ni mueve la cámara. */
export const LANGUAGE_STATE = 'orbe-language'
/** Estado global con la proyección elegida (`ProjectionType`), para alinear las etiquetas. */
export const PROJECTION_STATE = 'orbe-projection'
// `name:es` o `name:en`; si falta, la transliteración latina y, en último caso, el nombre local; sin otro debajo.
const LABEL_FIELD = [
  'coalesce',
  ['get', ['concat', 'name:', ['global-state', LANGUAGE_STATE]]],
  ['get', 'name:latin'],
  ['get', 'name'],
]
// En globo, pegadas a la esfera para que no salgan del disco (MapLibre solo oculta un símbolo de pantalla si su anclaje
// queda tras el horizonte); en plano, y en globo ya aplanado por zoom, de cara a la pantalla para que se lean inclinadas.
const LABEL_PITCH = [
  'step',
  ['zoom'],
  ['case', ['==', ['global-state', PROJECTION_STATE], 'globe'], 'map', 'viewport'],
  FLATTEN_ZOOM[1],
  'viewport',
]

/** Etiquetas del mapa base en el idioma de `LANGUAGE_STATE`; las que no son nombres (refs de carretera) no cambian. */
function localizeLabels(layers: LayerSpecification[]): LayerSpecification[] {
  return layers.map((l) =>
    l.type === 'symbol' && JSON.stringify(l.layout?.['text-field'] ?? null).includes('["get","name"]')
      ? ({
          ...l,
          layout: { ...l.layout, 'text-field': LABEL_FIELD, 'text-pitch-alignment': LABEL_PITCH },
        } as LayerSpecification)
      : l,
  )
}
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
  language: Language,
): StyleSpecification {
  const style = themeMapStyle(base, theme)
  delete style.center
  delete style.zoom
  delete style.bearing
  delete style.pitch
  const layers = localizeLabels(style.layers)
  // Sobre carreteras y vías (la coropleta las tapa) y bajo los límites y etiquetas del mapa base, que siguen legibles.
  // En dark hay símbolos (nombres de agua) antes que las carreteras: por eso manda la primera capa de límites.
  const boundary = layers.findIndex((l) => 'source-layer' in l && l['source-layer'] === 'boundary')
  const firstSymbol = layers.findIndex((l) => l.type === 'symbol')
  const at = boundary >= 0 ? boundary : firstSymbol >= 0 ? firstSymbol : layers.length
  layers.splice(at, 0, ...choroplethLayers(theme), {
    id: 'countries-line',
    type: 'line',
    source: 'countries',
    'source-layer': 'countries',
    paint: { 'line-color': mapColors(theme).countryBorder, 'line-width': countryLineWidth },
  })
  const baseSource = style.sources[BASE_SOURCE]
  return {
    ...style,
    projection: projectionSpec(projection),
    state: { ...style.state, [LANGUAGE_STATE]: { default: language }, [PROJECTION_STATE]: { default: projection } },
    sources: {
      ...style.sources,
      ...(baseSource?.type === 'vector' && { [BASE_SOURCE]: { ...baseSource, attribution: BASE_ATTRIBUTION } }),
      countries: { type: 'vector', url: countriesUrl, attribution: 'Natural Earth', promoteId: COUNTRY_ID_PROPERTY },
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
 * `from` es lo curvo que se ve al empezar (1 globo, 0 plano): al interrumpir otra animación hay que leerlo antes de
 * cortarla, porque al cortarla ya queda la proyección final. Devuelve la función que la corta y deja ya la proyección
 * final; `onEnd` llega en ambos casos.
 */
export function animateProjection(
  map: maplibregl.Map,
  to: ProjectionType,
  ms: number,
  onEnd: () => void,
  from = map.style.projection?.transitionState ?? 1,
): () => void {
  const target = globeness(to, map.getZoom())
  let id = 0
  let done = false
  const finish = () => {
    if (done) return
    done = true
    cancelAnimationFrame(id)
    map.setProjection(projectionSpec(to))
    // En reposo vale 1, para que lo que lo lea fuera de la animación (el halo de atmósfera del tema) vea globo.
    map.setGlobalStateProperty(MORPH_STATE, 1)
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

// Hueco de la barra superior arriba (y, por simetría, abajo) y margen lateral, en px.
const GLOBE_MARGIN = { vertical: 88, horizontal: 16 }

/**
 * Zoom con el que el disco del globo cabe en un lienzo de `width` × `height` px, con la cámara a `lat` y sin inclinar.
 * MapLibre pinta la esfera con radio R = 512·2^z / (2π·cos lat) a una distancia D = h / (2·tan(fov/2)) de la cámara;
 * en pantalla se ve con radio r = D·R / √(D² + 2DR), y de ahí se despeja R.
 */
export function fitGlobeZoom(width: number, height: number, lat: number, fovDeg: number): number {
  const r = Math.max(1, Math.min(height / 2 - GLOBE_MARGIN.vertical, width / 2 - GLOBE_MARGIN.horizontal))
  const d = height / 2 / Math.tan((fovDeg * Math.PI) / 360)
  const radius = (r * r + r * Math.sqrt(r * r + d * d)) / d
  return Math.log2((radius * 2 * Math.PI * Math.cos((lat * Math.PI) / 180)) / 512)
}
