import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const textos = (lng: string) =>
  JSON.parse(readFileSync(new URL(`../../src/i18n/${lng}.json`, import.meta.url), 'utf8'))

for (const lng of ['es', 'en']) {
  test.describe(`home (${lng})`, () => {
    test.use({ locale: lng })

    test('carga con el título y el idioma del navegador', async ({ page }) => {
      await page.goto('./')
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(textos(lng).app.title)
      await expect(page.locator('html')).toHaveAttribute('lang', new RegExp(`^${lng}(-|$)`)) // WebKit añade la región
    })
  })
}

test('axe-core sin violaciones serias ni críticas', async ({ page }) => {
  await page.goto('./')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  const { violations } = await new AxeBuilder({ page }).analyze()
  const graves = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
  expect(graves.map((v) => `${v.id}: ${v.help}`)).toEqual([])
})

// Informativo para MAPA-1: deja en el informe qué WebGL ofrece el navegador headless.
test('informa de WebGL', async ({ page }) => {
  await page.goto('./')
  const gl = await page.evaluate(() => {
    const ctx = document.createElement('canvas').getContext('webgl2')
    if (!ctx) return 'sin WebGL2'
    const ext = ctx.getExtension('WEBGL_debug_renderer_info')
    return String(ctx.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : ctx.RENDERER))
  })
  test.info().annotations.push({ type: 'webgl', description: gl })
  console.log(`[webgl] ${test.info().project.name}: ${gl}`)
})
