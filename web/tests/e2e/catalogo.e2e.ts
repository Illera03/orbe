import { readFileSync } from 'node:fs'
import { expect, test } from './mapa'
import AxeBuilder from '@axe-core/playwright'

const json = (ruta: string) => JSON.parse(readFileSync(new URL(ruta, import.meta.url), 'utf8'))
const es = json('../../src/i18n/es.json')
const en = json('../../src/i18n/en.json')
const vida = json('../../../data/catalog.json').indicators.find((i: { id: string }) => i.id === 'esperanza-vida')

test.describe('catálogo en escritorio', () => {
  test.use({ viewport: { width: 1280, height: 800 }, locale: 'es-ES', colorScheme: 'dark' })

  test('se elige con teclado, muestra la ficha de fuente y se quita', async ({ page }) => {
    await page.goto('./')
    const catalogo = page.getByRole('region', { name: es.catalog.title })
    await expect(page.getByRole('button', { name: es.catalog.title })).toHaveAttribute('aria-expanded', 'true')
    await expect(catalogo.getByRole('heading', { name: es.categories[vida.category] })).toBeVisible()

    const opcion = catalogo.getByRole('button', { name: vida.name.es })
    await opcion.focus()
    await page.keyboard.press('Enter')
    await expect(opcion).toHaveAttribute('aria-pressed', 'true')

    const ficha = page.getByRole('region', { name: vida.name.es })
    await expect(ficha.getByRole('link', { name: vida.source.name })).toHaveAttribute('href', vida.source.url)
    await expect(ficha.getByRole('link', { name: vida.license.id })).toHaveAttribute('href', vida.license.url)
    await expect(ficha).toContainText(String(vida.latestYear))
    await expect(ficha).toContainText(vida.unit.es)
    await expect(ficha).toContainText(vida.license.attribution)

    const { violations } = await new AxeBuilder({ page }).analyze()
    const graves = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
    expect(graves.map((v) => `${v.id}: ${v.help}`)).toEqual([])

    await ficha.getByRole('button', { name: es.source.clear }).click()
    await expect(ficha).toHaveCount(0)
    await expect(opcion).toHaveAttribute('aria-pressed', 'false')
  })

  test('?indicador= lo activa al cargar y el nombre sigue el idioma', async ({ page }) => {
    await page.goto('./?indicador=esperanza-vida')
    await expect(page.getByRole('region', { name: vida.name.es })).toBeVisible()
    await expect(page.locator('#map')).toHaveAttribute('data-choropleth', new RegExp(`^esperanza-vida:${vida.latestYear}$`), {
      timeout: 30_000,
    })
    await page.getByRole('button', { name: es.topbar.languageCodes.en, exact: true }).click()
    await expect(page.getByRole('region', { name: vida.name.en })).toContainText(en.source.license)
  })
})

test.describe('catálogo en móvil', () => {
  test.use({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true, locale: 'es-ES' })

  test('hoja inferior que abre un botón de 44 px y se cierra con Escape', async ({ page }) => {
    await page.goto('./')
    const boton = page.getByRole('button', { name: es.catalog.title })
    await expect(boton).toHaveAttribute('aria-expanded', 'false')
    const caja = await boton.boundingBox()
    expect(caja!.height).toBeGreaterThanOrEqual(44)

    await boton.click()
    await page.getByRole('button', { name: es.catalog.title }).press('Escape')
    await expect(boton).toHaveAttribute('aria-expanded', 'false')

    // Al elegir, la hoja se cierra y el foco vuelve al botón.
    await boton.click()
    await page.getByRole('button', { name: vida.name.es }).click()
    await expect(boton).toHaveAttribute('aria-expanded', 'false')
    await expect(boton).toBeFocused()

    // Ficha en una fila: nombre, año y licencia; «Fuente» despliega la fuente.
    const ficha = page.getByRole('region', { name: vida.name.es })
    expect((await ficha.boundingBox())!.height).toBeLessThanOrEqual(46) // 44 px más el borde
    await expect(ficha).toContainText(String(vida.latestYear))
    await expect(ficha.getByRole('link', { name: vida.license.id })).toBeVisible()
    await expect(ficha.getByRole('link', { name: vida.source.name })).toBeHidden()
    await ficha.getByRole('button', { name: es.source.source, exact: true }).click()
    await expect(ficha.getByRole('link', { name: vida.source.name })).toBeVisible()

    // La hoja abierta oculta la ficha en vez de apilarse encima.
    await boton.click()
    await expect(ficha).toBeHidden()
  })
})

test.describe('ficha en móvil a 320 px', () => {
  test.use({ viewport: { width: 320, height: 640 }, isMobile: true, hasTouch: true, locale: 'es-ES' })

  test('el nombre muestra al menos ~9 caracteres; «Fuente» es icono y «Quitar» está en la ficha desplegada', async ({ page }) => {
    await page.goto('./?indicador=esperanza-vida')
    const ficha = page.getByRole('region', { name: vida.name.es })
    const titulo = ficha.getByRole('heading', { name: vida.name.es })
    const ancho = await titulo.evaluate((el) => {
      const ch = document.createElement('span')
      ch.textContent = '0'.repeat(9)
      el.append(ch)
      const nueve = ch.getBoundingClientRect().width
      ch.remove()
      return el.getBoundingClientRect().width / nueve
    })
    expect(ancho).toBeGreaterThanOrEqual(0.99)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)

    const fuente = ficha.getByRole('button', { name: es.source.source, exact: true })
    await expect(fuente).toHaveAttribute('aria-expanded', 'false')
    expect((await fuente.boundingBox())!.width).toBeGreaterThanOrEqual(44)
    await expect(ficha.getByRole('button', { name: es.source.clear })).toBeHidden()
    await fuente.click()
    await expect(fuente).toHaveAttribute('aria-expanded', 'true')
    await expect(ficha.getByRole('button', { name: es.source.clear })).toBeVisible()
  })
})

for (const width of [320, 375, 420, 640]) {
  test.describe(`ficha en móvil a ${width} px`, () => {
    test.use({ viewport: { width, height: 800 }, isMobile: true, hasTouch: true, locale: 'es-ES' })

    test('la fila resumida cabe en la ficha', async ({ page }) => {
      await page.goto('./?indicador=esperanza-vida')
      const ficha = page.getByRole('region', { name: vida.name.es })
      await expect(ficha.getByRole('button', { name: es.source.source, exact: true })).toBeVisible()
      expect(await ficha.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true)
    })
  })
}

test.describe('catálogo en móvil, claro y en inglés', () => {
  test.use({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true, locale: 'en-US', colorScheme: 'light' })

  test('axe sin errores con la hoja abierta', async ({ page }) => {
    await page.goto('./?indicador=esperanza-vida')
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
    await page.getByRole('button', { name: en.catalog.title }).click()
    await expect(page.getByRole('button', { name: vida.name.en })).toBeVisible()
    const { violations } = await new AxeBuilder({ page }).analyze()
    const graves = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
    expect(graves.map((v) => `${v.id}: ${v.help}`)).toEqual([])
  })
})

test.describe('catálogo al cambiar el ancho', () => {
  test.use({ viewport: { width: 1280, height: 800 }, locale: 'es-ES' })

  test('se cierra al pasar a móvil y se abre al volver a escritorio', async ({ page }) => {
    await page.goto('./')
    const boton = page.getByRole('button', { name: es.catalog.title })
    await expect(boton).toHaveAttribute('aria-expanded', 'true')
    // WebKit evalúa matchMedia y emite «change» en la actualización de renderizado (por eso el fixture para el globo).
    // El catálogo cargado garantiza que el listener (un useEffect posterior al primer render) ya está registrado.
    await expect(page.getByRole('region', { name: es.catalog.title }).getByRole('heading', { name: es.categories[vida.category] })).toBeVisible()
    await page.setViewportSize({ width: 375, height: 812 })
    await expect(boton).toHaveAttribute('aria-expanded', 'false')
    await page.setViewportSize({ width: 1280, height: 800 })
    await expect(boton).toHaveAttribute('aria-expanded', 'true')
  })
})

test.describe('catálogo sin red', () => {
  test.use({ viewport: { width: 1280, height: 800 }, locale: 'es-ES' })

  test('si falla la carga avisa y «Reintentar» lo vuelve a pedir', async ({ page }) => {
    let fallar = true
    await page.route('**/data/catalog.json', (ruta) => (fallar ? ruta.abort() : ruta.continue()))
    await page.goto('./')
    await expect(page.getByRole('alert')).toContainText(es.catalog.error)
    fallar = false
    await page.getByRole('button', { name: es.catalog.retry }).click()
    await expect(page.getByRole('button', { name: vida.name.es })).toBeVisible()
  })
})
