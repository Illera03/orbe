import { readFileSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
import { pararRotacion } from './mapa'

const es = JSON.parse(readFileSync(new URL('../../src/i18n/es.json', import.meta.url), 'utf8'))

// La atribución del mapa base se ve entera, sin plegarse tras el botón «i» compacto.
async function atribucionVisible(page: Page) {
  const attrib = page.locator('.maplibregl-ctrl-attrib')
  await expect(attrib).toContainText('© OpenStreetMap contributors', { timeout: 30_000 })
  await expect(attrib).toContainText('OpenFreeMap')
  await expect(attrib).toBeInViewport({ ratio: 1 })
  await expect(attrib).not.toHaveClass(/maplibregl-compact/)
}

const casos = [
  { nombre: 'oscuro', tema: 'dark', viewport: { width: 1280, height: 800 } },
  { nombre: 'claro', tema: 'light', viewport: { width: 1280, height: 800 } },
  { nombre: 'móvil 375 px', tema: 'dark', viewport: { width: 375, height: 812 } },
] as const

for (const caso of casos) {
  test.describe(`globo en ${caso.nombre}`, () => {
    test.use({ viewport: caso.viewport, colorScheme: caso.tema })

    test('atribución de OpenStreetMap y OpenFreeMap siempre visible', async ({ page }) => {
      await page.goto('./')
      await expect(page.locator('html')).toHaveAttribute('data-theme', caso.tema)
      await expect(page.locator('#map canvas')).toBeVisible()
      await atribucionVisible(page)
    })
  })
}

test.describe('cambio de tema', () => {
  test.use({ viewport: { width: 1280, height: 800 }, colorScheme: 'dark' })

  test('repinta el mapa sin recargar, conserva la cámara y la atribución sigue visible', async ({ page }) => {
    await page.goto('./')
    await pararRotacion(page)
    const mapa = page.locator('#map')
    await page.locator('#map[data-idle]').waitFor({ timeout: 30_000 })
    const inicial = await mapa.getAttribute('data-camera')
    // Se arrastra el globo para que la cámara no sea la inicial.
    await page.mouse.move(640, 400)
    await page.mouse.down()
    await page.mouse.move(540, 340, { steps: 5 })
    await page.mouse.up()
    // Se espera a que el arrastre (con su inercia) termine y deje otra cámara.
    await expect(mapa).not.toHaveAttribute('data-camera', inicial!, { timeout: 30_000 })
    await page.locator('#map[data-idle]').waitFor({ timeout: 30_000 })
    const camara = await mapa.getAttribute('data-camera')
    const centro = { x: 600, y: 380, width: 40, height: 40 }
    const antes = await page.screenshot({ clip: centro })
    const canvas = await page.locator('#map canvas').elementHandle()

    await page.getByRole('button', { name: es.topbar.themes.light }).click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
    await page.locator('#map[data-idle]').waitFor({ timeout: 30_000 })
    // Mismo lienzo (el mapa no se ha recreado), estilo distinto y la misma cámara.
    expect(await canvas!.evaluate((c) => c.isConnected)).toBe(true)
    expect((await page.screenshot({ clip: centro })).equals(antes)).toBe(false)
    await expect(mapa).toHaveAttribute('data-camera', camara!)
    await atribucionVisible(page)
  })
})

test('el lienzo del mapa se anuncia en el idioma de la interfaz', async ({ page }) => {
  const en = JSON.parse(readFileSync(new URL('../../src/i18n/en.json', import.meta.url), 'utf8'))
  await page.goto('./')
  const canvas = page.locator('#map canvas')
  await expect(canvas).toHaveAttribute('aria-label', es.map.title)
  await page.getByRole('button', { name: es.topbar.languageCodes.en, exact: true }).click()
  await expect(canvas).toHaveAttribute('aria-label', en.map.title)
})

test('sin WebGL2 muestra un aviso en lugar del mapa', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, id: string, ...rest: unknown[]) {
      return id === 'webgl2' ? null : original.call(this, id as '2d', ...(rest as []))
    } as typeof original
  })
  await page.goto('./')
  await expect(page.getByRole('alert')).toHaveText(es.map.noWebgl)
  await expect(page.locator('#map canvas')).toHaveCount(0)
})
