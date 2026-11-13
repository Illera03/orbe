import type * as maplibregl from 'maplibre-gl'
import type { Layer } from '@deck.gl/core'
import type { ProjectionType } from './createMap'

export type DeckLayersModule = typeof import('@deck.gl/layers')
export type BuildLayers = (layers: DeckLayersModule, projection: ProjectionType) => Layer[]

/**
 * Carga deck.gl bajo demanda y lo monta intercalado en MapLibre.
 * `build` recibe @deck.gl/layers (para que las páginas no lo importen de forma estática)
 * y la proyección actual, porque algunas capas solo funcionan bien en una de las dos.
 * Si `signal` se aborta durante la carga (p. ej. al desmontar), no toca el mapa, que puede estar
 * ya destruido, y devuelve una función vacía.
 */
export async function addDeckOverlay(
  map: maplibregl.Map,
  build: BuildLayers,
  signal: AbortSignal,
): Promise<() => void> {
  const [{ MapboxOverlay }, layers] = await Promise.all([
    import('@deck.gl/mapbox'),
    import('@deck.gl/layers'),
  ])
  if (signal.aborted) return () => {}  const projection = (): ProjectionType =>
    map.getProjection()?.type === 'mercator' ? 'mercator' : 'globe'
  const overlay = new MapboxOverlay({ interleaved: true, layers: build(layers, projection()) })
  // setProjection no emite 'styledata', que es lo único que escucha MapboxOverlay para cambiar
  // entre GlobeView y MapView; sin esto deck.gl sigue dibujando como globo sobre el plano.
  const sync = () => overlay.setProps({ layers: build(layers, projection()) })
  map.on('projectiontransition', sync)
  map.addControl(overlay)
  return () => {
    map.off('projectiontransition', sync)
    map.removeControl(overlay)
  }
}
