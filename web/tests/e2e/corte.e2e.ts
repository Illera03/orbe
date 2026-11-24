import { readFileSync } from 'node:fs'
import type { Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { expect, test } from './mapa'

// Corte vertical de M2 de punta a punta (QA-4). Lo fino de cada pieza está en su propia e2e; aquí, que encajen.
const json = (ruta: string) => JSON.parse(readFileSync(new URL(ruta, import.meta.url), 'utf8'))
const es = json('../../src/i18n/es.json')
const vida = json('../../../data/catalog.json').indicators.find((i: { id: string }) => i.id === 'esperanza-vida')
const datos = json(`../../../data/${vida.file}`)
const paises: { a3: string; a2: string }[] = json('../../../data/geo/countries.json')
const [primerAño] = vida.years as [number, number]
const nombre = (a2: string) => new Intl.DisplayNames(['es'], { type: 'region' }).of(a2)!
// Francia: el centro de su encuadre cae dentro del país (el de España, con Canarias, cae en el mar).
const francia = nombre('FR')

// Primer puesto de un año según los datos reales (orden desc del catálogo).
function lider(año: number) {
  const i = datos.years.indexOf(año)
  const [p] = paises.filter((p) => datos.values[p.a3]?.[i] != null).sort((a, b) => datos.values[b.a3][i] - datos.values[a.a3][i])
  return nombre(p.a2)
}
const caption = (año: number) =>
  es.table.caption.replace('{{name}}', vida.name.es).replace('{{year}}', año).replace('{{unit}}', vida.unit.es)
const valor = (a3: string, año: number) =>
  new Intl.NumberFormat('es', { minimumFractionDigits: vida.decimals, maximumFractionDigits: vida.decimals }).format(
    datos.values[a3][datos.years.indexOf(año)],
  )

const pintado = (page: Page, año: number) =>
  expect(page.locator('#map')).toHaveAttribute('data-choropleth', `esperanza-vida:${año}`, { timeout: 30_000 })

async function sinErroresAxe(page: Page) {
  const { violations } = await new AxeBuilder({ page }).analyze()
  const graves = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
  expect(graves.map((v) => `${v.id}: ${v.help}`)).toEqual([])
}

// Del inicio sin indicador a la coropleta, con leyenda y ficha de fuente.
async function elegir(page: Page, abrirCatalogo: boolean) {
  await page.goto('./')
  await expect(page.locator('#map')).not.toHaveAttribute('data-choropleth')
  if (abrirCatalogo) await page.getByRole('button', { name: es.catalog.title }).click()
  const opcion = page.getByRole('region', { name: es.catalog.title }).getByRole('button', { name: vida.name.es })
  await opcion.focus()
  await page.keyboard.press('Enter')
  await pintado(page, vida.latestYear)

  const dock = page.getByRole('region', { name: es.dock.title })
  await expect(dock).toContainText(`≤ ${vida.scale.domain[0]}`)
  await expect(dock).toContainText(`≥ ${vida.scale.domain[1]}`)
  const ficha = page.getByRole('region', { name: vida.name.es })
  await expect(ficha).toContainText(String(vida.latestYear))
  await expect(ficha.getByRole('link', { name: vida.license.id })).toHaveAttribute('href', vida.license.url)
  return { dock, ficha }
}

// Inicio del deslizador: el primer año, cuyo líder no es el del último (si lo fuera, la prueba no probaría nada).
async function cambiarAño(page: Page) {
  expect(lider(primerAño)).not.toBe(lider(vida.latestYear))
  await page.getByRole('slider', { name: es.dock.year }).press('Home')
  await pintado(page, primerAño)
}

async function tabla(page: Page, año: number) {
  await page.getByRole('button', { name: es.table.open }).click()
  const dialogo = page.getByRole('dialog', { name: caption(año) })
  await expect(dialogo.getByRole('table', { name: caption(año) }).getByRole('row').nth(1)).toBeVisible()
  return dialogo
}

test.describe('corte vertical en escritorio', () => {
  test.use({ viewport: { width: 1280, height: 800 }, locale: 'es-ES', colorScheme: 'dark' })

  test('indicador, año, clasificación, tooltip y tabla encajan con los datos', async ({ page }) => {
    const { ficha } = await elegir(page, false)
    await expect(ficha.getByRole('link', { name: vida.source.name })).toHaveAttribute('href', vida.source.url)
    const ranking = page.getByRole('region', { name: es.ranking.title })
    const primero = ranking.getByRole('listitem').first().getByRole('button')
    await expect(primero).toHaveAccessibleName(new RegExp(`^Puesto 1 ?: ${lider(vida.latestYear)} ?, `))

    await cambiarAño(page)
    await expect(ficha).toContainText(String(primerAño))
    await expect(primero).toHaveAccessibleName(new RegExp(`^Puesto 1 ?: ${lider(primerAño)} ?, `))

    // Vuela a Francia desde su fila y, con el puntero en el centro, el tooltip da su valor de ese año.
    await ranking.getByRole('button', { name: new RegExp(`: ${francia} ?, `) }).click()
    const camara = async () => (await page.locator('#map[data-idle]').getAttribute('data-camera'))!.split(',').map(Number)
    await expect.poll(async () => Math.abs((await camara())[0] - 2.4), { timeout: 30_000 }).toBeLessThan(3)
    const mapa = (await page.locator('#map').boundingBox())!
    await page.mouse.move(mapa.x + mapa.width / 2, mapa.y + mapa.height / 2)
    const tooltip = page.locator('.tooltip')
    await expect(tooltip).toContainText(francia)
    await expect(tooltip).toContainText(`${valor('FRA', primerAño)} ${vida.unit.es} en ${primerAño}`)

    // Con todo abierto (catálogo, ficha, leyenda, clasificación, tooltip y tabla), axe en los dos temas.
    const dialogo = await tabla(page, primerAño)
    await sinErroresAxe(page)
    await page.keyboard.press('Escape')
    await expect(dialogo).toHaveCount(0)
    await page.getByRole('button', { name: es.topbar.themes.light }).click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
    await pintado(page, primerAño) // el cambio de tema repinta la coropleta (D32)
    await tabla(page, primerAño)
    await sinErroresAxe(page)
  })
})

test.describe('corte vertical en móvil', () => {
  test.use({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true, locale: 'es-ES', colorScheme: 'light' })

  test('indicador, año, clasificación y tabla en 375 px', async ({ page }) => {
    const { ficha } = await elegir(page, true)
    await cambiarAño(page)
    await expect(ficha).toContainText(String(primerAño))

    await page.getByRole('button', { name: es.ranking.title }).click()
    const primero = page.getByRole('region', { name: es.ranking.title }).getByRole('listitem').first().getByRole('button')
    await expect(primero).toHaveAccessibleName(new RegExp(`^Puesto 1 ?: ${lider(primerAño)} ?, `))
    await sinErroresAxe(page)
    await page.keyboard.press('Escape')

    const dialogo = await tabla(page, primerAño)
    await sinErroresAxe(page)
    await dialogo.getByRole('button', { name: es.table.close }).click()
    await expect(dialogo).toHaveCount(0)
  })
})

test.describe('carga del indicador con caché', () => {
  test.use({ viewport: { width: 1280, height: 800 }, locale: 'es-ES' })

  test('la segunda carga del fichero tarda menos de 300 ms', async ({ page }) => {
    // Primera carga calienta la caché HTTP; la segunda (recarga) se mide con Resource Timing.
    await page.goto('./?indicador=esperanza-vida')
    await pintado(page, vida.latestYear)
    await page.reload()
    await pintado(page, vida.latestYear)
    const entrada = await page.evaluate((file) => {
      const e = performance.getEntriesByType('resource').find((r) => r.name.endsWith(`/data/${file}`)) as PerformanceResourceTiming
      return e && { duration: e.duration, transferSize: e.transferSize }
    }, vida.file)
    expect(entrada).toBeTruthy()
    test.info().annotations.push({ type: 'carga-indicador', description: `${Math.round(entrada.duration)} ms, ${entrada.transferSize} B` })
    expect(entrada.duration).toBeLessThan(300)
  })
})
