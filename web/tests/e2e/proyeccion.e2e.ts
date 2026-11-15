import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'

const es = JSON.parse(readFileSync(new URL('../../src/i18n/es.json', import.meta.url), 'utf8'))

test.use({ viewport: { width: 1280, height: 800 }, colorScheme: 'dark' })

test('el botón alterna globo y plano sin perder la cámara y el tema conserva la proyección', async ({ page }) => {
  await page.goto('./')
  const mapa = page.locator('#map')
  const idle = () => page.locator('#map[data-idle]').waitFor({ timeout: 30_000 })
  await idle()
  await expect(mapa).toHaveAttribute('data-projection', 'globe')
  const canvas = await page.locator('#map canvas').elementHandle()
  const camara = await mapa.getAttribute('data-camera')
  const grupo = page.getByRole('group', { name: es.topbar.projection })

  await grupo.getByRole('button', { name: es.topbar.projections.mercator }).click()
  await expect(mapa).toHaveAttribute('data-projection', 'mercator', { timeout: 30_000 })
  await idle()
  // Mismo lienzo (sin recargar) y misma cámara.
  expect(await canvas!.evaluate((c) => c.isConnected)).toBe(true)
  await expect(mapa).toHaveAttribute('data-camera', camara!)

  await page.getByRole('button', { name: es.topbar.themes.light }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await idle()
  await expect(mapa).toHaveAttribute('data-projection', 'mercator')

  await grupo.getByRole('button', { name: es.topbar.projections.globe }).click()
  await expect(mapa).toHaveAttribute('data-projection', 'globe', { timeout: 30_000 })
})

test('en globo, al acercarse por encima de z6 pasa solo a plano', async ({ page }) => {
  await page.goto('./')
  const mapa = page.locator('#map')
  await page.locator('#map[data-idle]').waitFor({ timeout: 30_000 })
  await page.mouse.move(640, 400)
  // Rueda hacia dentro hasta pasar de z6 (data-camera termina en el zoom).
  await expect(async () => {
    await page.mouse.wheel(0, -600)
    const zoom = Number((await mapa.getAttribute('data-camera'))!.split(',')[2])
    expect(zoom).toBeGreaterThan(6.2)
  }).toPass({ timeout: 30_000 })
  await expect(mapa).toHaveAttribute('data-projection', 'mercator', { timeout: 30_000 })
  // La elección del usuario sigue siendo globo.
  const globo = page.getByRole('group', { name: es.topbar.projection }).getByRole('button', { name: es.topbar.projections.globe })
  await expect(globo).toHaveAttribute('aria-pressed', 'true')
})
