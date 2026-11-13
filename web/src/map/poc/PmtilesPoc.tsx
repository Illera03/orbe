import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import { useTranslation } from 'react-i18next'
import { createMap } from '../createMap'
import { preloadPmtiles } from '../pmtiles'
import { POC_COLORS, fullScreen, panel } from './pocStyle'

export function PmtilesPoc() {
  const { t, i18n } = useTranslation()
  const container = useRef<HTMLDivElement>(null)
  const nameProp = i18n.resolvedLanguage === 'en' ? 'NAME_EN' : 'NAME_ES'

  useEffect(() => {
    // Antes de crear el mapa, para que la cabecera viaje en paralelo con el estilo base.
    const countriesUrl = preloadPmtiles('data/poc/countries.pmtiles')
    const map = createMap(container.current!)
    const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false })

    map.on('style.load', () => {
      map.addSource('countries', {
        type: 'vector',
        url: countriesUrl,
      })
      // Bajo las etiquetas del mapa base para que los nombres sigan legibles.
      const beforeId = map.getStyle().layers.find((l) => l.type === 'symbol')?.id
      map.addLayer({
        id: 'countries-fill',
        type: 'fill',
        source: 'countries',
        'source-layer': 'countries',
        paint: { 'fill-color': POC_COLORS.countryFill, 'fill-opacity': 0.35 },
      }, beforeId)
      map.addLayer({
        id: 'countries-line',
        type: 'line',
        source: 'countries',
        'source-layer': 'countries',
        paint: { 'line-color': POC_COLORS.countryLine, 'line-width': 0.8 },
      }, beforeId)
    })
    map.on('mousemove', 'countries-fill', (e) => {
      const name = e.features?.[0]?.properties?.[nameProp]
      if (!name) return popup.remove()
      map.getCanvas().style.cursor = 'pointer'
      popup.setLngLat(e.lngLat).setText(String(name)).addTo(map)
    })
    map.on('mouseleave', 'countries-fill', () => {
      map.getCanvas().style.cursor = ''
      popup.remove()
    })
    return () => map.remove()
  }, [nameProp])

  return (
    <>
      <div ref={container} style={fullScreen} />
      <div style={panel}>{t('poc.pmtiles.title')}</div>
    </>
  )
}
