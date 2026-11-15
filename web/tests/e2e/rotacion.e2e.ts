import { readFileSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
import { pararRotacion } from './mapa'

const es = JSON.parse(readFileSync(new URL('../../src/i18n/es.json', import.meta.url), 'utf8'))
const centro = { x: 560, y: 320, width: 160, height: 160 }

// Gira si el centro del lienzo cambia en medio segundo; se para si no cambia en un segundo.
async function gira(page: Page, ms: number) {
  const antes = await page.screenshot({ clip: centro })
  await page.waitForTimeout(ms)
  return !(await page.screenshot({ clip: centro })).equals(antes)
}

// Espera a que el globo esté pintado (países visibles) antes de mirar si gira.
async function entrar(page: Page) {
  await page.goto('./')
  await expect(page.locator('#map canvas')).toBeVisible()
  await page.waitForResponse((r) => r.url().includes('countries.pmtiles'), { timeout: 30_000 })
  await page.waitForTimeout(1500)
}

test.describe('rotación de entrada', () => {
  test.use({ viewport: { width: 1280, height: 800 }, colorScheme: 'dark', reducedMotion: 'no-preference' })

  test('gira al entrar y se para del todo al arrastrar', async ({ page }) => {
    await entrar(page)
    const mapa = page.locator('#map')
    await expect(mapa).toHaveAttribute('data-spinning', '')
    expect(await gira(page, 500)).toBe(true)
    await page.mouse.move(640, 400)
    await page.mouse.down()
    await page.mouse.move(600, 380, { steps: 5 })
    await page.mouse.up()
    await expect(mapa).not.toHaveAttribute('data-spinning')
    // Tras la inercia del arrastre, quieto: no vuelve a girar.
    await page.locator('#map[data-idle]').waitFor({ timeout: 30_000 })
    expect(await gira(page, 1000)).toBe(false)
  })

  test('se para al buscar', async ({ page }) => {
    await entrar(page)
    const mapa = page.locator('#map')
    await expect(mapa).toHaveAttribute('data-spinning', '')
    await page.getByRole('combobox', { name: es.search.label }).fill('japon')
    await page.getByRole('option', { name: 'Japón' }).click()
    await expect(mapa).not.toHaveAttribute('data-spinning')
  })

  test('se para con el botón de plano', async ({ page }) => {
    await entrar(page)
    const mapa = page.locator('#map')
    await page.getByRole('group', { name: es.topbar.projection }).getByRole('button', { name: es.topbar.projections.mercator }).click()
    await expect(mapa).not.toHaveAttribute('data-spinning')
  })
})

test.describe('con movimiento reducido', () => {
  test.use({ viewport: { width: 1280, height: 800 }, colorScheme: 'dark', reducedMotion: 'reduce' })

  test('no gira', async ({ page }) => {
    await page.goto('./')
    await page.locator('#map[data-idle]').waitFor({ timeout: 30_000 })
    await expect(page.locator('#map')).not.toHaveAttribute('data-spinning')
    expect(await gira(page, 1000)).toBe(false)
  })
})

test.describe('contador de fps', () => {
  test.use({ viewport: { width: 375, height: 812 } })

  test('solo con ?fps=1, y mide', async ({ page }) => {
    await page.goto('./')
    await pararRotacion(page)
    await page.locator('#map[data-idle]').waitFor({ timeout: 30_000 })
    await expect(page.locator('.fps-meter')).toHaveCount(0)
    await page.goto('./?fps=1')
    const contador = page.locator('.fps-meter')
    await expect(contador).toBeVisible()
    await expect(contador).toHaveAttribute('data-fps', /^\d+$/, { timeout: 5_000 })
    await expect(contador).toHaveText(/^\d+ fps$/)
  })
})
