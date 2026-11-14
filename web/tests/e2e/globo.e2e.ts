import { readFileSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'

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

  test('repinta el mapa sin recargar y la atribución sigue visible', async ({ page }) => {
    await page.goto('./')
    await page.locator('#map[data-idle]').waitFor({ timeout: 30_000 })
    const canvas = await page.locator('#map canvas').elementHandle()
    await page.getByRole('button', { name: es.topbar.themes.light }).click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
    await page.locator('#map[data-idle]').waitFor({ timeout: 30_000 })
    // Mismo lienzo: el mapa no se ha recreado.
    expect(await canvas!.evaluate((c) => c.isConnected)).toBe(true)
    await atribucionVisible(page)
  })
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
