import { useEffect, useRef, useState } from 'react'
import type * as maplibregl from 'maplibre-gl'
import { useTranslation } from 'react-i18next'
import { MAP_STYLE_URL, type ThemeName } from '../theme'
import { useAppStore } from '../state/store'
import { createMap } from './createMap'
import { FpsMeter, fpsRequested } from './FpsMeter'
import { animateProjection, cameraMs, fitGlobeZoom, globeStyle, LANGUAGE_STATE, PROJECTION_STATE, setActiveMap } from './globe'
import { preloadPmtiles } from './pmtiles'
import { spinUntilInteraction } from './spin'
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
  const [showFps] = useState(fpsRequested)

  useEffect(() => {
    if (!supported) return
    const el = container.current!
    // Antes de crear el mapa, para que la cabecera viaje en paralelo con el estilo base (D21).
    const countriesUrl = preloadPmtiles('data/geo/countries.pmtiles')
    const map = createMap(el, null)
    // El globo llena la ventana: en escritorio lo limita el alto y en móvil el ancho.
    map.setZoom(fitGlobeZoom(el.clientWidth, el.clientHeight, map.getCenter().lat, map.getVerticalFieldOfView()))
    let stopMorph: (() => void) | null = null
    const apply = (theme: ThemeName) => {
      stopMorph?.()
      // Sin esto, quien espera a data-idle tras el cambio vería el idle del estilo anterior.
      delete el.dataset.idle
      el.style.backgroundImage = starsBackground(theme)
      // La proyección se lee al llegar el estilo: así vale también la elegida mientras se descargaba.
      const transformStyle = (_prev: unknown, next: maplibregl.StyleSpecification) =>
        globeStyle(next, theme, countriesUrl, useAppStore.getState().projection, useAppStore.getState().language)
      map.setStyle(MAP_STYLE_URL[theme], { transformStyle })
    }
    apply(useAppStore.getState().theme)
    // Gira al entrar (solo en globo) hasta la primera interacción; data-spinning, para e2e.
    const stopSpin =
      useAppStore.getState().projection === 'globe'
        ? spinUntilInteraction(map, () => delete el.dataset.spinning)
        : null
    if (stopSpin) el.dataset.spinning = ''
    const unsubscribe = useAppStore.subscribe((s, prev) => {
      if (s.theme !== prev.theme) apply(s.theme)
      // Sin estilo cargado (aún no ha llegado el primero) no hay estado que cambiar: transformStyle leerá el idioma nuevo.
      // `Style._loaded` es API interna de MapLibre: revisarla al subir de versión maplibre-gl.
      if (s.language !== prev.language && map.style?._loaded) map.setGlobalStateProperty(LANGUAGE_STATE, s.language)
      // Buscar o cambiar de proyección también son interacciones.
      if (s.lastInteraction !== prev.lastInteraction || s.projection !== prev.projection) stopSpin?.()
      if (s.projection === prev.projection) return
      // Lo curvo que se ve ahora, antes de cortar otra animación: al cortarla salta a su proyección final.
      const from = map.style?.projection?.transitionState
      stopMorph?.()
      // Antes de llegar el primer estilo no hay nada que animar: transformStyle ya leerá la proyección nueva.
      if (from === undefined) return
      delete el.dataset.idle
      // Etiquetas pegadas a la esfera desde que empieza a curvarse y de cara a la pantalla solo cuando ya es plano.
      const labels = () => map.setGlobalStateProperty(PROJECTION_STATE, s.projection)
      if (s.projection === 'globe') labels()
      stopMorph = animateProjection(map, s.projection, cameraMs(), () => {
        stopMorph = null
        if (s.projection === 'mercator') labels()
      }, from)
    })
    map.on('idle', () => {
      // A mitad de la animación del botón el mapa puede quedarse quieto un fotograma: aún no está listo.
      if (stopMorph) return
      // Proyección que se ve (en globo, por encima del umbral de zoom ya es plano), para e2e y capturas.
      el.dataset.projection = (map.style.projection?.transitionState ?? 1) > 0 ? 'globe' : 'mercator'
      const { lng, lat } = map.getCenter()
      // Cámara (con la inclinación) en el DOM para que el e2e compruebe que el tema o el idioma no la mueven.
      el.dataset.camera = [lng, lat, map.getZoom(), map.getPitch()].map((n) => n.toFixed(4)).join(',')
      // Etiquetas de lugares colocadas por MapLibre, ya evaluadas (texto y alineación), para el e2e. Incluye algunas
      // que no llega a dibujar, como las que quedan muy oblicuas en el borde del globo.
      const places = map
        .queryRenderedFeatures({ filter: ['has', 'class'] })
        .flatMap((f) => (f.layer.type === 'symbol' && f.sourceLayer === 'place' ? [f.layer.layout ?? {}] : []))
      el.dataset.labels = places.map((l) => String(l['text-field'])).join('|')
      el.dataset.labelPitch = String(places[0]?.['text-pitch-alignment'] ?? '')
      el.dataset.idle = ''
    })
    map.on('dataloading', () => delete el.dataset.idle)
    map.on('movestart', () => delete el.dataset.idle)
    setActiveMap(map)
    mapRef.current = map
    return () => {
      unsubscribe()
      stopSpin?.()
      stopMorph?.()
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
  return (
    <>
      <div id="map" className="map" ref={container} />
      {showFps && <FpsMeter />}
    </>
  )
}
