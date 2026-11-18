import { readFileSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
import { pararRotacion } from './mapa'

const es = JSON.parse(readFileSync(new URL('../../src/i18n/es.json', import.meta.url), 'utf8'))

test.use({ viewport: { width: 1280, height: 800 }, colorScheme: 'light' })

const idle = (page: Page) => page.locator('#map[data-idle]').waitFor({ timeout: 30_000 })
// data-labels: nombres de lugares colocados por MapLibre, ya evaluados (incluye alguno que no llega a dibujar).
const nombres = async (page: Page) => (await page.locator('#map').getAttribute('data-labels'))!.split('|')

async function aPlano(page: Page) {
  await page
    .getByRole('group', { name: es.topbar.projection })
    .getByRole('button', { name: es.topbar.projections.mercator })
    .click()
  await expect(page.locator('#map')).toHaveAttribute('data-projection', 'mercator', { timeout: 30_000 })
  await idle(page)
}

test('las etiquetas del mapa siguen al idioma sin mover la cámara ni perder tema y proyección', async ({ page }) => {
  await page.goto('./')
  await pararRotacion(page)
  const mapa = page.locator('#map')
  await idle(page)
  expect(await nombres(page)).toContain('Rusia')
  expect(await nombres(page)).not.toContain('Russia')
  const camara = await mapa.getAttribute('data-camera')

  await page.getByRole('button', { name: es.topbar.languageCodes.en, exact: true }).click()
  await expect(mapa).toHaveAttribute('data-labels', /(^|\|)Russia(\||$)/, { timeout: 30_000 })
  await idle(page)
  expect(await nombres(page)).not.toContain('Rusia')
  await expect(mapa).toHaveAttribute('data-camera', camara!)
  await expect(mapa).toHaveAttribute('data-projection', 'globe')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
})

test.describe('en plano oscuro', () => {
  test.use({ colorScheme: 'dark' })

  test('sin name:es, las etiquetas caen en la transliteración latina y no en árabe u otra escritura', async ({ page }) => {
    await page.goto('./')
    await pararRotacion(page)
    await aPlano(page)
    const noLatinas = (await nombres(page)).filter((n) => /[^\p{Script=Latin}\p{Script=Common}\p{Script=Inherited}]/u.test(n))
    expect(noLatinas).toEqual([])
    // La vista inicial incluye el norte de África, donde el nombre local está en árabe.
    expect(await nombres(page)).toEqual(expect.arrayContaining(['Argelia', 'Libia']))
  })
})

test('en globo las etiquetas se pegan a la esfera y en plano inclinado miran a la pantalla', async ({ page }) => {
  await page.goto('./')
  await pararRotacion(page)
  const mapa = page.locator('#map')
  await idle(page)
  await expect(mapa).toHaveAttribute('data-label-pitch', 'map')

  await aPlano(page)
  await expect(mapa).toHaveAttribute('data-label-pitch', 'viewport')
  // Inclina con el teclado de MapLibre (Mayús + flecha arriba) y la inclinación se conserva.
  await page.locator('#map canvas').focus()
  for (let i = 0; i < 4; i++) await page.keyboard.press('Shift+ArrowUp')
  await expect(mapa).not.toHaveAttribute('data-camera', /,0\.0000$/, { timeout: 30_000 })
  await idle(page)
  await expect(mapa).toHaveAttribute('data-label-pitch', 'viewport')
  await expect(mapa).toHaveAttribute('data-projection', 'mercator')
})
