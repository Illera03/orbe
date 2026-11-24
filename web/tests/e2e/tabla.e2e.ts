import { readFileSync } from 'node:fs'
import type { Page } from '@playwright/test'
import { expect, test } from './mapa'
import AxeBuilder from '@axe-core/playwright'

const json = (ruta: string) => JSON.parse(readFileSync(new URL(ruta, import.meta.url), 'utf8'))
const es = json('../../src/i18n/es.json')
const en = json('../../src/i18n/en.json')
const vida = json('../../../data/catalog.json').indicators.find((i: { id: string }) => i.id === 'esperanza-vida')
const caption = (t: typeof es, lang: 'es' | 'en') =>
  t.table.caption.replace('{{name}}', vida.name[lang]).replace('{{year}}', vida.latestYear).replace('{{unit}}', vida.unit[lang])

async function sinErroresAxe(page: Page) {
  const { violations } = await new AxeBuilder({ page }).analyze()
  expect(violations.map((v) => `${v.id}: ${v.help}`)).toEqual([])
}

test.describe('tabla en escritorio', () => {
  test.use({ viewport: { width: 1280, height: 800 }, locale: 'es-ES', colorScheme: 'dark' })

  test('desactivada sin indicador', async ({ page }) => {
    await page.goto('./')
    await expect(page.getByRole('button', { name: es.table.open })).toBeDisabled()
  })

  test('se abre con teclado, ordena por país con aria-sort y se cierra con Escape', async ({ page, browserName }) => {
    // WebKit en macOS solo lleva el Tab a los botones con Alt (acceso total por teclado desactivado).
    const tab = browserName === 'webkit' && process.platform === 'darwin' ? 'Alt+Tab' : 'Tab'
    await page.goto('./?indicador=esperanza-vida')
    const boton = page.getByRole('button', { name: es.table.open })
    await expect(boton).toBeEnabled()
    await boton.focus()
    await page.keyboard.press('Enter')

    const dialogo = page.getByRole('dialog', { name: caption(es, 'es') })
    await expect(dialogo).toBeVisible()
    await expect(dialogo.getByRole('button', { name: es.table.close })).toBeFocused()
    const tabla = dialogo.getByRole('table', { name: caption(es, 'es') })
    const pais = tabla.getByRole('columnheader', { name: es.table.country })
    const valor = tabla.getByRole('columnheader', { name: es.table.value })
    const filas = tabla.getByRole('row')
    await expect(filas.nth(1)).toBeVisible()

    // Por defecto, por valor según `order` del catálogo; los países sin dato al final.
    await expect(valor).toHaveAttribute('aria-sort', vida.order === 'desc' ? 'descending' : 'ascending')
    await expect(pais).not.toHaveAttribute('aria-sort')
    await expect(filas.last()).toContainText(es.table.noData)
    await sinErroresAxe(page)

    // Que un CSS roto (p. ej. reglas atrapadas en un @media móvil) no pase en verde: diálogo centrado y estrecho,
    // cabecera fija y cifras a la derecha.
    const caja = (await dialogo.boundingBox())!
    expect(caja.width).toBeLessThan(800)
    expect(Math.abs(caja.x + caja.width / 2 - 640)).toBeLessThanOrEqual(1)
    await expect(valor).toHaveCSS('position', 'sticky')
    await expect(filas.nth(1).getByRole('cell')).toHaveCSS('text-align', 'right')
    await expect(pais.getByRole('button')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')

    // Ordenar por país con teclado: Tab hasta su botón y Enter.
    await page.keyboard.press(tab)
    await expect(pais.getByRole('button')).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(pais).toHaveAttribute('aria-sort', 'ascending')
    await expect(valor).not.toHaveAttribute('aria-sort')
    await expect(filas.nth(1).getByRole('rowheader')).toHaveText('Afganistán')
    await page.keyboard.press('Enter')
    await expect(pais).toHaveAttribute('aria-sort', 'descending')

    await page.keyboard.press('Escape')
    await expect(dialogo).toHaveCount(0)
    await expect(boton).toBeFocused()
  })

  test('axe sin errores en tema claro y en inglés', async ({ page }) => {
    await page.goto('./?indicador=esperanza-vida')
    await page.getByRole('button', { name: es.topbar.themes.light }).click()
    await page.getByRole('button', { name: es.topbar.languageCodes.en, exact: true }).click()
    await page.getByRole('button', { name: en.table.open }).click()
    const tabla = page.getByRole('table', { name: caption(en, 'en') })
    await expect(tabla.getByRole('row').nth(1)).toBeVisible()
    await sinErroresAxe(page)
  })
})

test.describe('tabla en móvil', () => {
  test.use({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true, locale: 'es-ES' })

  test('a pantalla completa con cierre de 44 px', async ({ page }) => {
    await page.goto('./?indicador=esperanza-vida')
    await page.getByRole('button', { name: es.table.open }).click()
    const dialogo = page.getByRole('dialog', { name: caption(es, 'es') })
    const caja = await dialogo.boundingBox()
    expect(caja).toMatchObject({ x: 0, y: 0, width: 375, height: 812 })
    const cerrar = dialogo.getByRole('button', { name: es.table.close })
    expect((await cerrar.boundingBox())!.height).toBeGreaterThanOrEqual(44)
    await sinErroresAxe(page)
    await cerrar.click()
    await expect(dialogo).toHaveCount(0)
  })
})
