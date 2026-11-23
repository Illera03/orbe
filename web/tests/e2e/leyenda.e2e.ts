import { readFileSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const json = (ruta: string) => JSON.parse(readFileSync(new URL(ruta, import.meta.url), 'utf8'))
const es = json('../../src/i18n/es.json')
const en = json('../../src/i18n/en.json')
const vida = json('../../../data/catalog.json').indicators.find((i: { id: string }) => i.id === 'esperanza-vida')
const [primero, ultimo] = vida.years as [number, number]

const pintado = (page: Page, año: number) =>
  expect(page.locator('#map')).toHaveAttribute('data-choropleth', `esperanza-vida:${año}`, { timeout: 30_000 })

async function graves(page: Page) {
  const { violations } = await new AxeBuilder({ page }).analyze()
  return violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => `${v.id}: ${v.help}`)
}

test.describe('leyenda y año en escritorio', () => {
  test.use({ viewport: { width: 1280, height: 800 }, locale: 'es-ES', colorScheme: 'dark' })

  test('el año se cambia con teclado y el mapa lo pinta', async ({ page }) => {
    await page.goto('./?indicador=esperanza-vida')
    const dock = page.getByRole('region', { name: es.dock.title })
    const año = dock.getByRole('slider', { name: es.dock.year })
    await expect(año).toHaveValue(String(vida.latestYear))
    await pintado(page, vida.latestYear)

    // Leyenda: extremos del dominio del catálogo, unidad y muestra de sin dato.
    const [min, max] = vida.scale.domain as [number, number]
    await expect(dock).toContainText(String(min))
    await expect(dock).toContainText(String(max))
    await expect(dock).toContainText(vida.unit.es)
    await expect(dock).toContainText(es.dock.noData)

    await año.focus()
    await page.keyboard.press('ArrowLeft')
    await pintado(page, vida.latestYear - 1)
    await page.keyboard.press('PageDown')
    await pintado(page, vida.latestYear - 11)
    await page.keyboard.press('PageUp')
    await pintado(page, vida.latestYear - 1)
    await page.keyboard.press('Home')
    await pintado(page, primero)
    await expect(dock).toContainText(String(primero))
    await page.keyboard.press('ArrowLeft')
    await expect(año).toHaveValue(String(primero))
    await page.keyboard.press('End')
    await pintado(page, ultimo)

    expect(await graves(page)).toEqual([])
  })

  test('sin indicador no hay leyenda; en inglés cambia el texto', async ({ page }) => {
    await page.goto('./')
    await expect(page.getByRole('region', { name: es.dock.title })).toHaveCount(0)
    await page.goto('./?indicador=esperanza-vida')
    await page.getByRole('button', { name: es.topbar.languageCodes.en, exact: true }).click()
    const dock = page.getByRole('region', { name: en.dock.title })
    await expect(dock.getByRole('slider', { name: en.dock.year })).toBeVisible()
    await expect(dock).toContainText(en.dock.noData)
    await expect(dock).toContainText(vida.unit.en)
  })
})

test.describe('leyenda y año en móvil', () => {
  test.use({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true, locale: 'en-US', colorScheme: 'light' })

  test('compacta, bajo la fila de la ficha, con deslizador de 44 px y axe sin errores', async ({ page }) => {
    await page.goto('./?indicador=esperanza-vida')
    const dock = page.getByRole('region', { name: en.dock.title })
    const caja = (await dock.boundingBox())!
    const ficha = (await page.getByRole('region', { name: vida.name.en }).boundingBox())!
    expect(ficha.y + ficha.height).toBeLessThanOrEqual(caja.y)
    // Una línea de leyenda y el deslizador: menos del 10 % del alto de la pantalla.
    expect(caja.height / 812).toBeLessThan(0.1)
    expect((await dock.getByRole('slider').boundingBox())!.height).toBeGreaterThanOrEqual(44)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
    expect(await dock.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true)
    await pintado(page, vida.latestYear)
    expect(await graves(page)).toEqual([])
  })
})
