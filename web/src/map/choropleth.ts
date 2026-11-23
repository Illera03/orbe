// Coropleta nativa de MapLibre: color por país con feature-state sobre la fuente `countries`, sin deck.gl.
import type * as maplibregl from 'maplibre-gl'
import type { LayerSpecification } from 'maplibre-gl'
import { mapColors } from '../theme/map'
import type { ThemeName } from '../theme/tokens'
import { loadIndicator, type IndicatorData, type IndicatorMeta } from '../state/data'
import { useAppStore } from '../state/store'
import type { ColorScale } from './colorScale'

export const FILL_LAYER = 'countries-fill'
export const NODATA_LAYER = 'countries-nodata'
const SOURCE = { source: 'countries', sourceLayer: 'countries' }
const NODATA_IMAGE = 'orbe-nodata-'
/** Propiedad de las teselas de `countries.pmtiles` con el ISO alfa-3; la fuente la promueve a id. */
export const COUNTRY_ID_PROPERTY = 'ISO_A3'

/**
 * Capas de la coropleta, bajo `countries-line`. El rayado de «sin dato» va debajo, oculto sin indicador; el relleno
 * encima, transparente donde no hay color. El relleno existe siempre para que el puntero publique el país.
 */
export function choroplethLayers(theme: ThemeName): LayerSpecification[] {
  return [
    {
      id: NODATA_LAYER,
      type: 'fill',
      source: 'countries',
      'source-layer': 'countries',
      layout: { visibility: 'none' },
      paint: { 'fill-pattern': NODATA_IMAGE + theme },
    },
    {
      id: FILL_LAYER,
      type: 'fill',
      source: 'countries',
      'source-layer': 'countries',
      paint: {
        'fill-color': ['coalesce', ['feature-state', 'color'], 'rgba(0, 0, 0, 0)'],
        'fill-opacity': ['case', ['!=', ['feature-state', 'color'], null], 1, 0],
      },
    },
  ]
}

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))

/**
 * Rayado diagonal de «sin dato» con los tokens del tema (`noDataStripe` sobre `noDataBg`), en píxeles RGBA.
 * Se repite sin costuras: la raya depende de (x + y) módulo el lado. A `pixelRatio` 2 queda una raya de 3 px CSS cada 8:
 * densa para que un territorio pequeño a zoom de globo lleve varias, y lo bastante gruesa para no fundirse con el fondo.
 */
export function stripes(theme: ThemeName, size = 16, width = 6): { width: number; height: number; data: Uint8Array } {
  const { noDataBg, noDataStripe } = mapColors(theme)
  const [bg, fg] = [rgb(noDataBg), rgb(noDataStripe)]
  const data = new Uint8Array(size * size * 4)
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) data.set([...((x + y) % size < width ? fg : bg), 255], (y * size + x) * 4)
  return { width: size, height: size, data }
}

/**
 * Conecta la coropleta al store: pinta `indicatorId`/`year` sin recargar el estilo, lo vuelve a pintar si un cambio
 * de tema lo borra (D32) y publica en `hoveredCountry` el país bajo el puntero. Marca `data-choropleth="<id>:<año>"`
 * en `el` cuando el mapa ya lo ha dibujado (e2e). Devuelve la función que lo desconecta.
 */
export function attachChoropleth(map: maplibregl.Map, el: HTMLElement): () => void {
  let data: IndicatorData | null = null
  let scale: ColorScale | null = null
  let lib: typeof import('./colorScale') | null = null
  let meta: IndicatorMeta | null = null
  // Colores pintados ahora; `null` sin indicador.
  let colors: Map<string, string> | null = null
  let key = ''

  // El rayado se registra antes de mostrar su capa: si llega tarde por `styleimagemissing`, las teselas ya analizadas
  // se quedan sin patrón hasta recargarse (en móvil, Somalilandia salía del color de la tierra).
  const addPattern = (id: string) => {
    if (id.startsWith(NODATA_IMAGE) && !map.hasImage(id)) map.addImage(id, stripes(id.slice(NODATA_IMAGE.length) as ThemeName), { pixelRatio: 2 })
  }

  const paint = () => {
    if (!map.style?._loaded || !map.getLayer(FILL_LAYER)) return
    map.removeFeatureState(SOURCE)
    for (const [id, color] of colors ?? []) map.setFeatureState({ ...SOURCE, id }, { color })
    if (colors) addPattern(map.getPaintProperty(NODATA_LAYER, 'fill-pattern') as string)
    map.setLayoutProperty(NODATA_LAYER, 'visibility', colors ? 'visible' : 'none')
    const painted = key
    // setFeatureState no lanza `dataloading`: se espera al siguiente idle para saber que ya se ve.
    map.once('idle', () => {
      if (key === painted && painted) el.dataset.choropleth = painted
    })
  }

  // Un cambio de tema (setStyle) puede dejar el rayado oculto o borrar el feature-state: se comprueba y se repinta.
  const onStyle = () => {
    if (!map.style?._loaded || !map.getLayer(FILL_LAYER)) return
    const visible = map.getLayoutProperty(NODATA_LAYER, 'visibility') === 'visible'
    const first = colors?.entries().next().value
    const lost = first && map.getFeatureState({ ...SOURCE, id: first[0] }).color !== first[1]
    if (visible !== !!colors || lost) paint()
  }

  const update = async () => {
    const { catalog, indicatorId, year } = useAppStore.getState()
    const next = catalog?.indicators.find((i) => i.id === indicatorId) ?? null
    const nextKey = next && year != null ? `${next.id}:${year}` : ''
    if (nextKey === key) return
    key = nextKey
    delete el.dataset.choropleth
    if (!next || year == null) {
      colors = null
      paint()
      return
    }
    if (next !== meta) {
      let loaded: IndicatorData
      try {
        // d3-scale y sus paletas (≈ 18 KB con gzip) llegan con el primer indicador, fuera del JS inicial.
        const [d, l] = await Promise.all([loadIndicator(next), lib ?? import('./colorScale')])
        loaded = d
        lib = l
      } catch (error) {
        // Sin datos se queda el mapa como estaba; el aviso al usuario es de la interfaz (estado de carga de INT-4).
        console.error(error)
        key = ''
        return
      }
      // Mientras se descargaba pudo cambiar el indicador o el año: lo pinta la llamada más reciente.
      if (key !== nextKey) return
      meta = next
      data = loaded
      scale = lib.colorScaleFor(next, loaded)
    }
    colors = new Map()
    for (const [a3, v] of lib!.valuesForYear(data!, year)) {
      const c = scale!.color(v)
      if (c) colors.set(a3, c)
    }
    paint()
  }

  let hovered: string | null = null
  const hover = (a3: string | null) => {
    if (a3 === hovered) return
    hovered = a3
    useAppStore.getState().setHoveredCountry(a3)
  }
  const onMove = (e: maplibregl.MapLayerMouseEvent) => hover((e.features?.[0]?.id as string | undefined) ?? null)
  const onLeave = () => hover(null)

  map.on('styledata', onStyle)
  map.on('mousemove', FILL_LAYER, onMove)
  map.on('mouseleave', FILL_LAYER, onLeave)
  // Respaldo: el rayado sigue al tema y cualquier estilo que lo pida sin tenerlo lo genera al vuelo.
  const onMissing = (e: { id: string }) => addPattern(e.id)
  map.on('styleimagemissing', onMissing)
  const unsubscribe = useAppStore.subscribe((s, prev) => {
    if (s.indicatorId !== prev.indicatorId || s.year !== prev.year || s.catalog !== prev.catalog) void update()
  })
  void update()
  return () => {
    unsubscribe()
    map.off('styledata', onStyle)
    map.off('mousemove', FILL_LAYER, onMove)
    map.off('mouseleave', FILL_LAYER, onLeave)
    map.off('styleimagemissing', onMissing)
  }
}
