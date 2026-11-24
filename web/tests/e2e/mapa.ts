import { expect, test as base, type Page } from '@playwright/test'

export { expect }

/**
 * Para la rotación de entrada con una tecla sobre el mapa, sin mover la cámara ni el foco: mientras gira, MapLibre
 * no llega a `idle` y la cámara cambia. De paso comprueba que la parada por teclado funciona.
 */
export async function pararRotacion(page: Page) {
  await page.locator('#map[data-spinning]').waitFor()
  await page.locator('#map').dispatchEvent('keydown')
  await expect(page.locator('#map')).not.toHaveAttribute('data-spinning')
}

/**
 * `test` con la rotación de entrada parada en cuanto el mapa la arranca, antes del primer fotograma y en cada carga:
 * con el globo girando y WebGL por software (CI) el navegador apenas da fotogramas y las esperas de Playwright que
 * dependen de rAF (estabilidad, transiciones) se agotan. Es la misma tecla que `pararRotacion`, sin forzar
 * `prefers-reduced-motion` (D36). Quien prueba la rotación misma pone `test.use({ girar: true })`.
 */
export const test = base.extend<{ girar: boolean }>({
  girar: [false, { option: true }],
  page: async ({ page, girar }, usar) => {
    if (!girar) {
      await page.addInitScript(() => {
        // El mapa registra el listener de teclado antes de marcar data-spinning; el observador llega justo después.
        new MutationObserver(() => document.querySelector('#map[data-spinning]')?.dispatchEvent(new Event('keydown'))).observe(
          document,
          { subtree: true, attributes: true, attributeFilter: ['data-spinning'] },
        )
      })
    }
    await usar(page)
  },
})
