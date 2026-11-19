// Estilos de mapa por tema: estilo base de OpenFreeMap + sobrescritura de colores con los tokens.
import type { ExpressionSpecification, LayerSpecification, SkySpecification, StyleSpecification } from 'maplibre-gl'
import { mapType, themes, type ThemeName } from './tokens'

/** URL del estilo base de cada tema (oscuro «espacial» sobre dark, claro «editorial» sobre positron). */
export const MAP_STYLE_URL: Record<ThemeName, string> = {
  dark: 'https://tiles.openfreemap.org/styles/dark',
  light: 'https://tiles.openfreemap.org/styles/positron',
}

/** Colores del mapa para el tema (países, estrellas, sin dato…), para lo que no está en el estilo base. */
export const mapColors = (theme: ThemeName) => themes[theme].map

/** Estado global de MapLibre que guía la animación globo/plano: 1 globo, 0 plano; en reposo, 1. */
export const GLOBENESS_STATE = 'orbe-globeness'

/** Cielo y halo de atmósfera del globo (spec `sky`); el halo se apaga al acercarse y sigue la animación a plano. */
export function themeSky(theme: ThemeName): SkySpecification {
  const m = themes[theme].map
  return {
    'sky-color': m.sky,
    'horizon-color': m.horizon,
    'fog-color': m.fog,
    'sky-horizon-blend': 0.5,
    'horizon-fog-blend': 0.6,
    'fog-ground-blend': 0.9,
    // MapLibre exige el `zoom` en el `interpolate` exterior; el estado global escala el halo durante la animación.
    'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, ['*', m.atmosphere, ['global-state', GLOBENESS_STATE]], 6, 0],
    // Sin el suavizado de 300 ms de MapLibre: si no, el halo va por detrás del aplanado y destella al volver a globo.
    'atmosphere-blend-transition': { duration: 0 },
  }
}

// Se reconoce cada capa por su `source-layer` (OpenMapTiles), no por su id: dark y positron usan ids distintos.
// shortcut: si OpenFreeMap renombra una source-layer, esa capa conserva su color base sin avisar; añadir un test
// con fixtures recortados de dark y positron (agua, tierra y fronteras reciben color) si cambian de esquema o falla una vez.
function paintFor(layer: LayerSpecification, theme: ThemeName): Record<string, string> | undefined {
  const m = themes[theme].map
  if (layer.type === 'background') return { 'background-color': m.land }
  const src = 'source-layer' in layer ? layer['source-layer'] : undefined
  if (layer.type === 'fill' && src === 'water') return { 'fill-color': m.ocean }
  if (layer.type === 'fill' && (src === 'landcover' || src === 'landuse' || src === 'park')) return { 'fill-color': m.land }
  if (layer.type === 'line' && src === 'waterway') return { 'line-color': m.ocean }
  if (layer.type === 'line' && src === 'boundary') return { 'line-color': m.border }
  return undefined
}

type LabelRole = keyof Omit<typeof mapType, 'halo' | 'borderWidth' | 'countryBorderWidth'>

// Clase de una capa de etiquetas según las clases de OpenMapTiles que filtra; varias clases (positron `label_other`) = minor.
function labelRole(layer: LayerSpecification): LabelRole | undefined {
  if (layer.type !== 'symbol') return undefined
  const src = layer['source-layer']
  if (src === 'water_name' || src === 'waterway') return 'water'
  if (src !== 'place') return undefined
  const classes = JSON.stringify(layer.filter ?? null).match(/"(country|state|city|town)"/g) ?? []
  const all = JSON.stringify(layer.filter ?? null).match(/"(country|state|city|town|village|suburb|hamlet|continent|neighbourhood|isolated_dwelling)"/g) ?? []
  return classes.length === 1 && all.length === 1 ? (classes[0].slice(1, -1) as LabelRole) : 'minor'
}

const stops = (pairs: readonly (readonly [number, number])[]) => pairs.flat()

/** Grosor por zoom de la línea de países propia (`countries-line` en web/src/map/globe.ts). */
export const countryLineWidth: ExpressionSpecification = ['interpolate', ['linear'], ['zoom'], ...stops(mapType.countryBorderWidth)]

/** Etiquetas sin mayúsculas ni espaciado, con tamaño, color y zoom de entrada por clase (tokens `mapType`). */
function styleLabel(layer: LayerSpecification, role: LabelRole, theme: ThemeName): LayerSpecification {
  const m = themes[theme].map
  const t = mapType[role]
  const color = role === 'country' ? m.label : role === 'water' ? m.labelWater : m.labelMinor
  return {
    ...layer,
    minzoom: Math.max(layer.minzoom ?? 0, t.minzoom),
    // dark corta los países grandes a z6: con los países entrando a z4 se quedarían solo dos niveles de zoom.
    ...(role === 'country' && layer.maxzoom !== undefined && { maxzoom: Math.max(layer.maxzoom, 9) }),
    layout: {
      ...layer.layout,
      ...('font' in t && { 'text-font': [...t.font] }),
      'text-transform': 'none',
      'text-letter-spacing': 0,
      'text-size': ['interpolate', ['linear'], ['zoom'], ...stops(t.size)],
    },
    paint: {
      ...layer.paint,
      'text-color': color,
      'text-halo-color': m.labelHalo,
      'text-halo-width': mapType.halo.width,
      'text-halo-blur': mapType.halo.blur,
    },
  } as LayerSpecification
}

/** Zoom desde el que aparecen los límites subnacionales; por debajo solo se ve `countryBorder`. */
export const SUBNATIONAL_MIN_ZOOM = 5

// Límite subnacional: capa de `boundary` cuyo filtro usa admin_level sin fijarlo a 2 (dark: `== 4`; positron: `>= 3`).
// Las disputadas de positron no filtran por admin_level y se quedan como borde de país.
function isSubnational(layer: LayerSpecification): boolean {
  if (layer.type !== 'line' || layer['source-layer'] !== 'boundary') return false
  const f = JSON.stringify(layer.filter ?? null)
  return f.includes('"admin_level"]') && !f.includes('"admin_level"],2]')
}

/**
 * Aplica el tema a un estilo base ya descargado y devuelve una copia; no muta la entrada.
 * Uso: `map.setStyle(MAP_STYLE_URL[t], { transformStyle: (_prev, next) => themeMapStyle(next, t) })`.
 */
export function themeMapStyle(style: StyleSpecification, theme: ThemeName): StyleSpecification {
  return {
    ...style,
    state: { ...style.state, [GLOBENESS_STATE]: { default: 1 } },
    sky: themeSky(theme),
    layers: style.layers.map((layer) => {
      const role = labelRole(layer)
      if (role) return styleLabel(layer, role, theme)
      const paint = paintFor(layer, theme)
      let out = paint ? ({ ...layer, paint: { ...layer.paint, ...paint } } as LayerSpecification) : layer
      if (out.type === 'line' && out['source-layer'] === 'boundary')
        out = {
          ...out,
          // Sin las líneas marítimas (dark las pinta como bandas en la costa y círculos alrededor de islotes).
          filter: ['all', out.filter ?? true, ['!=', ['get', 'maritime'], 1]],
          paint: { ...out.paint, 'line-width': ['interpolate', ['linear'], ['zoom'], ...stops(mapType.borderWidth)] },
        } as LayerSpecification
      // Fronteras de país del mapa base: hasta z5 las dibuja solo `countries-line` (Natural Earth); así no se ven dobles.
      if (out.type === 'line' && out['source-layer'] === 'boundary' && !isSubnational(out))
        return { ...out, minzoom: Math.max(out.minzoom ?? 0, SUBNATIONAL_MIN_ZOOM) }
      if (!isSubnational(out)) return out
      // Oculto por debajo de SUBNATIONAL_MIN_ZOOM y entra con fundido de un nivel de zoom en vez de aparecer de golpe.
      const z = Math.max(out.minzoom ?? 0, SUBNATIONAL_MIN_ZOOM)
      return {
        ...out,
        minzoom: z,
        paint: { ...out.paint, 'line-opacity': ['interpolate', ['linear'], ['zoom'], z, 0, z + 1, 1] },
      } as LayerSpecification
    }),
  }
}
