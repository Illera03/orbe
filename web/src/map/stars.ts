import { mapColors, type ThemeName } from '../theme'

const TILE = 512
const STARS = 140

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
    ctx.globalAlpha = starsOpacity * (0.3 + 0.7 * rand())
    ctx.beginPath()
    ctx.arc(rand() * TILE, rand() * TILE, 0.4 + rand() * 0.8, 0, 2 * Math.PI)
    ctx.fill()
  }
  return `url(${canvas.toDataURL()})`
}
