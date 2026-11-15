import { expect, type Page } from '@playwright/test'

/**
 * Para la rotación de entrada con una tecla sobre el mapa, sin mover la cámara ni el foco: mientras gira, MapLibre
 * no llega a `idle` y la cámara cambia. De paso comprueba que la parada por teclado funciona.
 */
export async function pararRotacion(page: Page) {
  await page.locator('#map[data-spinning]').waitFor()
  await page.locator('#map').dispatchEvent('keydown')
  await expect(page.locator('#map')).not.toHaveAttribute('data-spinning')
}
