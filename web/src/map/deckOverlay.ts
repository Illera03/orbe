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
 * ya destruido, y devuelve una función vacía. La promesa se resuelve cuando deck.gl ya puede dibujar
 * y se rechaza, sin dejar el overlay montado, si falla al inicializarse.
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
  if (signal.aborted) return () => {}
  // shortcut: deck.gl 9.4.1 lee map.transform.height (que maplibre-gl 6 eliminó) para el plano
  // cercano y lejano; solo se expone esa altura, así que volverá a fallar si se activa el terreno 3D
  // (lee map.transform.elevation). Se retira cuando salga una deck.gl estable compatible con maplibre 6.
  if ((map as { transform?: unknown }).transform === undefined) {
    Object.defineProperty(map, 'transform', { get: () => ({ height: map.getCanvas().clientHeight }) })
  }
  const projection = (): ProjectionType =>
    map.getProjection()?.type === 'mercator' ? 'mercator' : 'globe'
  // Se resuelve cuando deck.gl ya puede dibujar (antes, el overlay ignora los fotogramas del mapa)
  // o si se aborta, y se rechaza si deck.gl falla al inicializarse (sin WebGL2, contexto perdido).
  let loadedOk = false
  let settle: (error?: Error) => void = () => {}
  const loaded = new Promise<void>((resolve, reject) => {
    settle = (error) => {
      loadedOk = !error
      if (error) reject(error)
      else resolve()
    }
    signal.addEventListener('abort', () => resolve(), { once: true })
  })
  const overlay = new MapboxOverlay({
    interleaved: true,
    layers: build(layers, projection()),
    onLoad: () => settle(),
    // Ya cargado, el error no rompe la promesa: se registra como haría deck.gl por defecto.
    onError: (error) => (loadedOk ? console.error(error) : settle(error)),
  })
  // setProjection no emite 'styledata', que es lo único que escucha MapboxOverlay para cambiar
  // entre GlobeView y MapView; sin esto deck.gl sigue dibujando como globo sobre el plano.
  const sync = () => overlay.setProps({ layers: build(layers, projection()) })
  // Con un deck.gl ya montado en este mapa, MapboxOverlay lo reutiliza y onLoad no vuelve a llegar.
  const reused = Boolean((map as { __deck?: unknown }).__deck)
  map.on('projectiontransition', sync)
  map.addControl(overlay)
  if (reused) settle()
  try {
    await loaded
  } catch (error) {
    map.off('projectiontransition', sync)
    map.removeControl(overlay)
    throw error
  }
  // Abortado durante la inicialización: quien aborta destruye el mapa, que ya retira el control.
  if (signal.aborted) return () => {}
  return () => {
    map.off('projectiontransition', sync)
    map.removeControl(overlay)
  }
}
