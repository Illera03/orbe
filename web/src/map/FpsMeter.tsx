import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { watchFps } from './fps'

/** Con `?fps=1` en la URL se ve el contador de fps (para medir en un móvil real, #10). */
export const fpsRequested = () => new URLSearchParams(location.search).get('fps') === '1'

/** Contador de fps de la página; solo se monta (y solo mide) con `?fps=1`. */
export function FpsMeter() {
  const { t } = useTranslation()
  const [fps, setFps] = useState<number | null>(null)
  useEffect(() => watchFps(setFps), [])
  return (
    <p className="fps-meter" data-fps={fps ?? undefined}>
      {t('map.fps', { fps: fps ?? '…' })}
    </p>
  )
}
