import { useEffect, useRef, useState } from 'react'
import type * as maplibregl from 'maplibre-gl'
import { useTranslation } from 'react-i18next'
import { createMap, type ProjectionType } from '../createMap'
import { addDeckOverlay } from '../deckOverlay'
import { spinGlobe } from '../spin'
import { greatCircleArc } from '../greatCircle'
import { ARCS, CITIES, type City } from './cities'
import { POC_COLORS, fullScreen, panel } from './pocStyle'

const GLOBE_ARCS = ARCS.map(([a, b]) => greatCircleArc([a.lon, a.lat], [b.lon, b.lat]))

export function DeckglPoc() {
  const { t } = useTranslation()
  const container = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const [fps, setFps] = useState<number | null>(null)
  const [deck, setDeck] = useState<'loading' | 'ready' | 'error'>('loading')
  const [projection, setProjection] = useState<ProjectionType>('globe')

  useEffect(() => {
    const map = createMap(container.current!)
    mapRef.current = map
    const loading = new AbortController()
    let removeDeck: (() => void) | undefined
    const stopSpin = spinGlobe(map, setFps)
    map.once('load', async () => {
      const remove = await addDeckOverlay(map, ({ ScatterplotLayer, ArcLayer, PathLayer }, proj) => [
        new ScatterplotLayer<City>({
          id: 'cities',
          data: CITIES,
          // 2 km de altura para que no parpadee contra la superficie del globo (z-fighting).
          getPosition: (c) => [c.lon, c.lat, 2000],
          // Área proporcional a la población: radio ∝ √población.
          getRadius: (c) => Math.sqrt(c.pop) * 60_000,
          radiusMinPixels: 2,
          getFillColor: POC_COLORS.bubble,
        }),
        // ArcLayer sale mal proyectado sobre el globo de MapLibre; allí se usa PathLayer con el arco precalculado.
        proj === 'mercator'
          ? new ArcLayer<[City, City]>({
              id: 'arcs',
              data: ARCS,
              // Ruta más corta: Tokio–Los Ángeles cruza el Pacífico y no toda Eurasia.
              greatCircle: true,
              getSourcePosition: ([a]) => [a.lon, a.lat],
              getTargetPosition: ([, b]) => [b.lon, b.lat],
              getSourceColor: POC_COLORS.arcFrom,
              getTargetColor: POC_COLORS.arcTo,
              getWidth: 2,
            })
          : new PathLayer<[number, number, number][]>({
              id: 'arcs-globe',
              data: GLOBE_ARCS,
              getPath: (p) => p,
              getColor: POC_COLORS.arcFrom,
              getWidth: 2,
              widthUnits: 'pixels',
            }),
      ], loading.signal).catch((error: unknown) => {
        console.error(error)
        return null
      })
      if (loading.signal.aborted) return
      if (!remove) return setDeck('error')
      removeDeck = remove
      setDeck('ready')
    })
    return () => {
      loading.abort()
      stopSpin()
      removeDeck?.()
      map.remove()
      mapRef.current = null
    }
  }, [])

  const toggle = () => {
    const next: ProjectionType = projection === 'globe' ? 'mercator' : 'globe'
    mapRef.current?.setProjection({ type: next })
    setProjection(next)
  }

  return (
    <>
      <div ref={container} style={fullScreen} />
      <div style={panel}>
        <span>{t('poc.deckgl.title')}</span>
        <button type="button" onClick={toggle}>
          {t(projection === 'globe' ? 'poc.deckgl.toMercator' : 'poc.deckgl.toGlobe')}
        </button>
        <span aria-live="off">{fps === null ? '…' : t('poc.fps', { fps })}</span>
        {deck !== 'ready' && <span role="status">{t(deck === 'error' ? 'poc.deckgl.error' : 'poc.deckgl.loading')}</span>}
      </div>
    </>
  )
}
