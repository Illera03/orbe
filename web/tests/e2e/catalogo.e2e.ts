import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
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
