import { mapColors, type ThemeName } from '../theme'

const TILE = 512
const STARS = 90
// Una de cada doce estrellas es algo mayor y más brillante: da profundidad sin llenar el fondo de ruido.
const BRIGHT_EVERY = 12

/**
 * Fondo de estrellas tenues: una tesela de 512 px con puntos pseudoaleatorios (semilla fija, siempre igual)
 * que se repite tras el lienzo del mapa, transparente fuera del globo. `none` si el tema no lleva estrellas.
 */
export function starsBackground(theme: ThemeName): string {
  const { stars, starsOpacity } = mapColors(theme)
  if (starsOpacity <= 0) return 'none'
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = TILE
  const ctx = canvas.getContext('2d')
  if (!ctx) return 'none'
  let seed = 7
  const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646
  ctx.fillStyle = stars
  for (let i = 0; i < STARS; i++) {
    const bright = i % BRIGHT_EVERY === 0
    ctx.globalAlpha = bright ? Math.min(1, starsOpacity * 2.4) : starsOpacity * (0.25 + 0.6 * rand())
    ctx.beginPath()
    ctx.arc(rand() * TILE, rand() * TILE, bright ? 0.9 + rand() * 0.3 : 0.3 + rand() * 0.45, 0, 2 * Math.PI)
    ctx.fill()
  }
  return `url(${canvas.toDataURL()})`
}
