import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import { pararRotacion } from './mapa'

const es = JSON.parse(readFileSync(new URL('../../src/i18n/es.json', import.meta.url), 'utf8'))

test.use({ viewport: { width: 1280, height: 800 }, colorScheme: 'light' })

test('las etiquetas del mapa siguen al idioma sin mover la cámara ni perder tema y proyección', async ({ page }) => {
  await page.goto('./')
  await pararRotacion(page)
  const mapa = page.locator('#map')
  await page.locator('#map[data-idle]').waitFor({ timeout: 30_000 })
  // data-country-labels: nombres de país pintados, ya evaluados por MapLibre.
  const nombres = async () => (await mapa.getAttribute('data-country-labels'))!.split('|')
  expect(await nombres()).toContain('Rusia')
  expect(await nombres()).not.toContain('Russia')
  const camara = await mapa.getAttribute('data-camera')

  await page.getByRole('button', { name: es.topbar.languageCodes.en, exact: true }).click()
  await expect(mapa).toHaveAttribute('data-country-labels', /(^|\|)Russia(\||$)/, { timeout: 30_000 })
  await page.locator('#map[data-idle]').waitFor({ timeout: 30_000 })
  expect(await nombres()).not.toContain('Rusia')
  await expect(mapa).toHaveAttribute('data-camera', camara!)
  await expect(mapa).toHaveAttribute('data-projection', 'globe')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
})
