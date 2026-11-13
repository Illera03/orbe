// Estilos de mapa por tema: estilo base de OpenFreeMap + sobrescritura de colores con los tokens.
import type { LayerSpecification, SkySpecification, StyleSpecification } from 'maplibre-gl'
import { themes, type ThemeName } from './tokens'

/** URL del estilo base de cada tema (oscuro «espacial» sobre dark, claro «editorial» sobre positron). */
export const MAP_STYLE_URL: Record<ThemeName, string> = {
  dark: 'https://tiles.openfreemap.org/styles/dark',
  light: 'https://tiles.openfreemap.org/styles/positron',
}

/** Colores del mapa para el tema (países, estrellas, sin dato…), para lo que no está en el estilo base. */
export const mapColors = (theme: ThemeName) => themes[theme].map

/** Cielo y halo de atmósfera del globo (spec `sky` de MapLibre 5); el halo se apaga al acercarse. */
export function themeSky(theme: ThemeName): SkySpecification {
  const m = themes[theme].map
  return {
    'sky-color': m.sky,
    'horizon-color': m.horizon,
    'fog-color': m.fog,
    'sky-horizon-blend': 0.5,
    'horizon-fog-blend': 0.6,
    'fog-ground-blend': 0.9,
    'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, theme === 'dark' ? 1 : 0.6, 6, 0],
  }
}

// Se reconoce cada capa por su `source-layer` (OpenMapTiles), no por su id: dark y positron usan ids distintos.
function paintFor(layer: LayerSpecification, theme: ThemeName): Record<string, string> | undefined {
  const m = themes[theme].map
  if (layer.type === 'background') return { 'background-color': m.land }
  const src = 'source-layer' in layer ? layer['source-layer'] : undefined
  if (layer.type === 'fill' && src === 'water') return { 'fill-color': m.ocean }
  if (layer.type === 'fill' && (src === 'landcover' || src === 'landuse' || src === 'park')) return { 'fill-color': m.land }
  if (layer.type === 'line' && src === 'waterway') return { 'line-color': m.ocean }
  if (layer.type === 'line' && src === 'boundary') return { 'line-color': m.border }
  if (layer.type === 'symbol' && src === 'place') return { 'text-color': m.label, 'text-halo-color': m.labelHalo }
  if (layer.type === 'symbol' && (src === 'water_name' || src === 'waterway'))
    return { 'text-color': m.labelWater, 'text-halo-color': m.labelHalo }
  return undefined
}

/**
 * Aplica el tema a un estilo base ya descargado y devuelve una copia; no muta la entrada.
 * Uso: `map.setStyle(MAP_STYLE_URL[t], { transformStyle: (_prev, next) => themeMapStyle(next, t) })`.
 */
export function themeMapStyle(style: StyleSpecification, theme: ThemeName): StyleSpecification {
  return {
    ...style,
    sky: themeSky(theme),
    layers: style.layers.map((layer) => {
      const paint = paintFor(layer, theme)
      return paint ? ({ ...layer, paint: { ...layer.paint, ...paint } } as LayerSpecification) : layer
    }),
  }
}
