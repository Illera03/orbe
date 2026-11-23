import { readFileSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { pararRotacion } from './mapa'

const json = (ruta: string) => JSON.parse(readFileSync(new URL(ruta, import.meta.url), 'utf8'))
const es = json('../../src/i18n/es.json')
const en = json('../../src/i18n/en.json')
const vida = json('../../../data/catalog.json').indicators.find((i: { id: string }) => i.id === 'esperanza-vida')
const datos = json(`../../../data/${vida.file}`)
const paises: { a3: string; a2: string }[] = json('../../../data/geo/countries.json')

// Primer puesto de `latestYear` según los datos (orden desc: el mayor valor) y su nombre en cada idioma.
const i = datos.years.indexOf(vida.latestYear)
const [primero] = paises
  .filter((p) => datos.values[p.a3]?.[i] != null)
  .sort((a, b) => datos.values[b.a3][i] - datos.values[a.a3][i])
const nombre = (lng: string, a2: string) => new Intl.DisplayNames([lng], { type: 'region' }).of(a2)!
const brasil = nombre('es', 'BR')

async function camara(page: Page): Promise<number[]> {
  return (await page.locator('#map[data-idle]').getAttribute('data-camera', { timeout: 30_000 }))!.split(',').map(Number)
}

async function abrir(page: Page) {
  await page.goto('./?indicador=esperanza-vida')
  await pararRotacion(page)
  await expect(page.locator('#map')).toHaveAttribute('data-choropleth', `esperanza-vida:${vida.latestYear}`, { timeout: 30_000 })
}

test.describe('clasificación en escritorio', () => {
  test.use({ viewport: { width: 1280, height: 800 }, locale: 'es-ES' })

  test('primer puesto según los datos, vuelo al pulsar, teclado y tooltip', async ({ page }) => {
    await abrir(page)
    const panel = page.getByRole('region', { name: es.ranking.title })
    const filas = panel.getByRole('listitem').getByRole('button')
    await expect(filas.first()).toHaveAccessibleName(new RegExp(`^Puesto 1 ?: ${nombre('es', primero.a2)} ?, `))

    const antes = (await camara(page)).join()
    await filas.first().click()
    await expect.poll(async () => (await camara(page)).join(), { timeout: 30_000 }).not.toBe(antes)

    // Una sola parada de Tab; las flechas y Fin mueven el foco; Intro vuela.
    await filas.first().focus()
    await page.keyboard.press('ArrowDown')
    await expect(filas.nth(1)).toBeFocused()
    await expect(filas.nth(1)).toHaveAttribute('tabindex', '0')
    await expect(filas.first()).toHaveAttribute('tabindex', '-1')
    await page.keyboard.press('End')
    await expect(filas.last()).toBeFocused()
    const fila = panel.getByRole('button', { name: new RegExp(`: ${brasil} ?, `) })
    await fila.focus()
    await page.keyboard.press('Enter')
    await expect.poll(async () => (await camara(page))[0], { timeout: 30_000 }).toBeLessThan(-40)

    // Con Brasil en el centro, el puntero encima muestra el tooltip y resalta su fila.
    const mapa = (await page.locator('#map').boundingBox())!
    await page.mouse.move(mapa.x + mapa.width / 2, mapa.y + mapa.height / 2)
    const tooltip = page.locator('.tooltip')
    await expect(tooltip).toContainText(brasil)
    await expect(tooltip).toContainText(`${vida.unit.es} en ${vida.latestYear}`)
    await expect(fila).toHaveAttribute('data-hovered', 'true')
    expect(await tooltip.evaluate((el) => getComputedStyle(el).pointerEvents)).toBe('none')

    const { violations } = await new AxeBuilder({ page }).analyze()
    expect(violations.map((v) => `${v.id}: ${v.help}`)).toEqual([])

    // En inglés cambian título, filas y pie.
    await page.getByRole('button', { name: es.topbar.languageCodes.en, exact: true }).click()
    const ranking = page.getByRole('region', { name: en.ranking.title })
    await expect(ranking.getByRole('listitem').first().getByRole('button')).toHaveAccessibleName(
      new RegExp(`^Rank 1 ?: ${nombre('en', primero.a2)} ?, `),
    )

    // El botón del título lo pliega.
    await page.getByRole('button', { name: en.ranking.title }).click()
    await expect(ranking.getByRole('list')).toBeHidden()
  })
})

test.describe('clasificación en móvil', () => {
  test.use({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true, locale: 'es-ES' })

  test('botón en la fila inferior que abre una hoja y la cierra al elegir', async ({ page }) => {
    await abrir(page)
    const boton = page.getByRole('button', { name: es.ranking.title })
    await expect(boton).toHaveAttribute('aria-expanded', 'false')
    // Cabe en la fila de la ficha: no añade alto.
    const caja = (await boton.boundingBox())!
    const ficha = (await page.getByRole('region', { name: vida.name.es }).boundingBox())!
    expect(caja.height).toBeGreaterThanOrEqual(44)
    expect(Math.abs(caja.y + caja.height - (ficha.y + ficha.height))).toBeLessThanOrEqual(2)
    expect(caja.x).toBeGreaterThan(ficha.x + ficha.width)

    await boton.click()
    const filas = page.getByRole('region', { name: es.ranking.title }).getByRole('listitem').getByRole('button')
    await expect(filas.first()).toBeVisible()
    const hoja = (await page.locator('.ranking').boundingBox())!
    expect(hoja.height / 812).toBeLessThan(0.6)
    const { violations } = await new AxeBuilder({ page }).analyze()
    expect(violations.map((v) => `${v.id}: ${v.help}`)).toEqual([])

    const antes = (await camara(page)).join()
    await filas.first().click()
    await expect(boton).toHaveAttribute('aria-expanded', 'false')
    await expect(boton).toBeFocused()
    await expect.poll(async () => (await camara(page)).join(), { timeout: 30_000 }).not.toBe(antes)
  })
})
