import { useEffect, useRef, useState } from 'react'
import type * as maplibregl from 'maplibre-gl'
import { useTranslation } from 'react-i18next'
import { MAP_STYLE_URL, type ThemeName } from '../theme'
import { useAppStore } from '../state/store'
import { createMap } from './createMap'
import { globeStyle, setActiveMap } from './globe'
import { preloadPmtiles } from './pmtiles'
import { starsBackground } from './stars'
import './globe.css'

// MapLibre 5+ solo funciona con WebGL2.
const hasWebGL2 = () => !!document.createElement('canvas').getContext('webgl2')

/** Mapa a pantalla completa de la home. Marca `data-idle` cuando MapLibre ha terminado de pintar (e2e y capturas). */
export function GlobeMap() {
  const { t } = useTranslation()
  const container = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const [supported] = useState(hasWebGL2)

  useEffect(() => {
    if (!supported) return
    const el = container.current!
    // Antes de crear el mapa, para que la cabecera viaje en paralelo con el estilo base (D21).
    const countriesUrl = preloadPmtiles('data/geo/countries.pmtiles')
    const map = createMap(el, null)
    const apply = (theme: ThemeName) => {
      // Sin esto, quien espera a data-idle tras el cambio vería el idle del estilo anterior.
      delete el.dataset.idle
      el.style.backgroundImage = starsBackground(theme)
      map.setStyle(MAP_STYLE_URL[theme], { transformStyle: (_prev, next) => globeStyle(next, theme, countriesUrl) })
    }
    apply(useAppStore.getState().theme)
    const unsubscribe = useAppStore.subscribe((s, prev) => {
      if (s.theme !== prev.theme) apply(s.theme)
    })
    map.on('idle', () => {
      const { lng, lat } = map.getCenter()
      // Cámara en el DOM para que el e2e compruebe que el cambio de tema no la mueve.
      el.dataset.camera = [lng, lat, map.getZoom()].map((n) => n.toFixed(4)).join(',')
      el.dataset.idle = ''
    })
    map.on('dataloading', () => delete el.dataset.idle)
    map.on('movestart', () => delete el.dataset.idle)
    setActiveMap(map)
    mapRef.current = map
    return () => {
      unsubscribe()
      setActiveMap(null)
      mapRef.current = null
      map.remove()
    }
  }, [supported])

  // MapLibre fija en el lienzo el aria-label «Map» en inglés al crearlo; se sustituye y sigue al idioma.
  const title = t('map.title')
  useEffect(() => {
    mapRef.current?.getCanvas().setAttribute('aria-label', title)
  }, [title, supported])

  if (!supported) {
    return (
      <div id="map" className="map map--unsupported">
        <p role="alert" className="map__unsupported">
          {t('map.noWebgl')}
        </p>
      </div>
    )
  }
  return <div id="map" className="map" ref={container} />
}
