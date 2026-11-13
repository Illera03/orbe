import { test } from '@playwright/test'

// Capturas para revisar PR visuales: `npm run capturas`; salen en web/capturas/ (ignorada por git).
const vistas = [
  { nombre: 'escritorio', viewport: { width: 1280, height: 800 }, isMobile: false },
  { nombre: 'movil', viewport: { width: 375, height: 812 }, isMobile: true },
]

for (const vista of vistas) {
  for (const tema of ['dark', 'light'] as const) {
    test.describe(() => {
      test.use({ viewport: vista.viewport, isMobile: vista.isMobile, hasTouch: vista.isMobile, colorScheme: tema })

      test(`${vista.nombre}-${tema}`, async ({ page }) => {
        await page.goto('./')
        await page.waitForLoadState('networkidle')
        // Si la app ya gestiona temas con data-theme, se fuerza el que toca además de prefers-color-scheme.
        await page.evaluate((t) => {
          const html = document.documentElement
          if (html.hasAttribute('data-theme')) html.dataset.theme = t
        }, tema)
        await page.screenshot({ path: `capturas/${vista.nombre}-${tema}.png`, fullPage: true })
      })
    })
  }
}
