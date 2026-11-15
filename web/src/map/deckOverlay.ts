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
  // La que se ve: el globo de la app es una expresión que se aplana por zoom (globe.ts).
  const projection = (): ProjectionType => ((map.style?.projection?.transitionState ?? 1) > 0 ? 'globe' : 'mercator')
  // shortcut: deck.gl 9.4.1 lanza «Unsupported projection» si getProjection() no es 'globe' o 'mercator' (el globo
  // de la app es una expresión por zoom) y lo usa para elegir GlobeView o MapView: se le da la proyección que se ve.
  // Se quita al retirar el overlay y se retira del código con el parche de `transform` (D27).
  const ownGetProjection = !Object.hasOwn(map, 'getProjection')
  if (ownGetProjection) {
    const original = map.getProjection.bind(map)
    map.getProjection = () => {
      const spec = original()
      return Array.isArray(spec?.type) ? { type: projection() } : spec
    }
  }
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
  let built = projection()
  const overlay = new MapboxOverlay({
    interleaved: true,
    layers: build(layers, built),
    onLoad: () => settle(),
    // Ya cargado, el error no rompe la promesa: se registra como haría deck.gl por defecto.
    onError: (error) => (loadedOk ? console.error(error) : settle(error)),
  })
  // En modo intercalado MapboxOverlay solo cambia entre GlobeView y MapView con 'styledata' o con setProps, y ni
  // setProjection ni el aplanado por zoom emiten 'styledata': se comprueba en cada fotograma (después de que MapLibre
  // evalúe la proyección; en 'projectiontransition' aún no lo ha hecho) y se rehacen las capas solo si ha cambiado.
  const sync = () => {
    if (projection() === built) return
    built = projection()
    overlay.setProps({ layers: build(layers, built) })
  }
  // Con un deck.gl ya montado en este mapa, MapboxOverlay lo reutiliza y onLoad no vuelve a llegar.
  const reused = Boolean((map as { __deck?: unknown }).__deck)
  map.on('render', sync)
  map.addControl(overlay)
  if (reused) settle()
  try {
    await loaded
  } catch (error) {
    map.off('render', sync)
    map.removeControl(overlay)
    if (ownGetProjection) Reflect.deleteProperty(map, 'getProjection')
    throw error
  }
  // Abortado durante la inicialización: quien aborta destruye el mapa, que ya retira el control.
  if (signal.aborted) return () => {}
  return () => {
    map.off('render', sync)
    map.removeControl(overlay)
    if (ownGetProjection) Reflect.deleteProperty(map, 'getProjection')
  }
}
