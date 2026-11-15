import { readFileSync } from 'node:fs'
import { test } from '@playwright/test'

// El proyecto usa locale es-ES.
const es = JSON.parse(readFileSync(new URL('../../src/i18n/es.json', import.meta.url), 'utf8'))
// Botón «Plano» del grupo en escritorio y botón único «Ver en plano» en móvil.
const botonPlano = (isMobile: boolean) => (isMobile ? es.topbar.actions.mercator : es.topbar.projections.mercator)

// Capturas para revisar PR visuales: `npm run capturas`; salen en web/capturas/ (ignorada por git).
const vistas = [
  { nombre: 'escritorio', viewport: { width: 1280, height: 800 }, isMobile: false },
  { nombre: 'movil', viewport: { width: 375, height: 812 }, isMobile: true },
]
const casos = vistas.flatMap((vista) =>
  (['dark', 'light'] as const).flatMap((tema) => [false, true].map((plano) => ({ vista, tema, plano }))),
)

for (const { vista, tema, plano } of casos) {
  test.describe(() => {
    test.use({ viewport: vista.viewport, isMobile: vista.isMobile, hasTouch: vista.isMobile, colorScheme: tema })
    const nombre = `${vista.nombre}-${tema}${plano ? '-plano' : ''}`

    test(nombre, async ({ page }) => {
      // Las de plano llevan también el contador de ?fps=1, para revisarlo en los dos temas y en móvil.
      await page.goto(plano ? './?fps=1' : './')
      if (plano) {
        await page.getByRole('button', { name: botonPlano(vista.isMobile), exact: true }).click()
        await page.locator('#map[data-projection="mercator"]').waitFor({ timeout: 30_000 })
      }
      // El mapa marca data-idle con el evento `idle` de MapLibre: estilo, teselas y globo ya pintados.
      await page.locator('#map[data-idle]').waitFor({ timeout: 30_000 })
      // Si la app ya gestiona temas con data-theme, se fuerza el que toca además de prefers-color-scheme.
      await page.evaluate((t) => {
        const html = document.documentElement
        if (html.hasAttribute('data-theme')) html.dataset.theme = t
      }, tema)
      await page.screenshot({ path: `capturas/${nombre}.png`, fullPage: true })
      // El buscador no depende de la proyección: solo se captura sobre el globo.
      if (plano) return
      // Buscador abierto con resultados (en móvil, tras pulsar su botón).
      if (vista.isMobile) await page.getByRole('button', { name: es.search.open }).click()
      await page.getByRole('combobox').fill('co')
      await page.getByRole('option').first().waitFor()
      await page.keyboard.press('ArrowDown')
      await page.screenshot({ path: `capturas/${nombre}-buscador.png`, fullPage: true })
    })
  })
}
