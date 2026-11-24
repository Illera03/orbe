import { readFileSync } from 'node:fs'
import type { Page } from '@playwright/test'
import { expect, test } from './mapa'
import AxeBuilder from '@axe-core/playwright'

const textos = (lng: string) =>
  JSON.parse(readFileSync(new URL(`../../src/i18n/${lng}.json`, import.meta.url), 'utf8'))

// Cámara que el mapa deja en `data-camera` («lng,lat,zoom,inclinación») al quedarse quieto.
async function camara(page: Page): Promise<number[]> {
  return (await page.locator('#map[data-idle]').getAttribute('data-camera', { timeout: 30_000 }))!.split(',').map(Number)
}
const longitud = async (page: Page) => (await camara(page))[0]

const casos = [
  { lng: 'es', consulta: 'japon', nombre: 'Japón', entre: [125, 150], otro: 'en', traducido: 'Japan' },
  { lng: 'en', consulta: 'uk', nombre: 'United Kingdom', entre: [-10, 3], otro: 'es', traducido: 'Reino Unido' },
] as const

for (const caso of casos) {
  test.describe(`buscador en escritorio (${caso.lng})`, () => {
    test.use({ viewport: { width: 1280, height: 800 }, locale: caso.lng })

    test('se usa solo con teclado y la cámara vuela al país', async ({ page }) => {
      const t = textos(caso.lng).search
      await page.goto('./')
      await page.locator('#map[data-idle]').waitFor({ timeout: 30_000 })
      const caja = page.getByRole('combobox', { name: t.label })
      await expect(caja).toHaveAttribute('aria-expanded', 'false')

      await caja.focus()
      await page.keyboard.type(caso.consulta)
      await expect(caja).toHaveAttribute('aria-expanded', 'true')
      const lista = page.getByRole('listbox', { name: t.label })
      await expect(lista.getByRole('option').first()).toHaveText(caso.nombre)

      // Escape cierra la lista y ↓ la vuelve a abrir con la primera opción activa.
      await page.keyboard.press('Escape')
      await expect(caja).toHaveAttribute('aria-expanded', 'false')
      await page.keyboard.press('ArrowDown')
      const activa = page.getByRole('option', { name: caso.nombre })
      await expect(activa).toHaveAttribute('aria-selected', 'true')
      await expect(caja).toHaveAttribute('aria-activedescendant', (await activa.getAttribute('id'))!)

      await page.keyboard.press('Enter')
      await expect(caja).toHaveAttribute('aria-expanded', 'false')
      await expect(caja).toHaveValue(caso.nombre)
      // La cámara inicial está en la longitud 0 con zoom 1,5: se espera al zoom, que también delata el vuelo al Reino Unido.
      await expect.poll(async () => (await camara(page))[2], { timeout: 30_000 }).toBeGreaterThan(3)
      const [lon] = await camara(page)
      expect(lon).toBeGreaterThan(caso.entre[0])
      expect(lon).toBeLessThan(caso.entre[1])

      // Al cambiar de idioma, el país elegido pasa a escribirse en el nuevo.
      await page.getByRole('button', { name: textos(caso.lng).topbar.languageCodes[caso.otro], exact: true }).click()
      await expect(page.getByRole('combobox', { name: textos(caso.otro).search.label })).toHaveValue(caso.traducido)
    })
  })
}

for (const viewport of [{ width: 1280, height: 800 }, { width: 320, height: 640 }]) {
  test.describe(`buscador a ${viewport.width} px`, () => {
    test.use({ viewport, locale: 'es-ES' })

    test('axe-core sin violaciones con la lista abierta y una opción activa', async ({ page }) => {
      const t = textos('es').search
      await page.goto('./')
      if (viewport.width < 640) await page.getByRole('button', { name: t.open }).click()
      await page.getByRole('combobox', { name: t.label }).fill('co')
      await page.getByRole('option').first().waitFor()
      await page.keyboard.press('ArrowDown')
      await expect(page.getByRole('option').first()).toHaveAttribute('aria-selected', 'true')
      const { violations } = await new AxeBuilder({ page }).analyze()
      expect(violations.map((v) => `${v.id}: ${v.help}`)).toEqual([])
    })
  })
}

test.describe('buscador en móvil (320 px)', () => {
  test.use({ viewport: { width: 320, height: 640 }, locale: 'es-ES' })

  test('el botón despliega el campo, alias «EEUU» y vuelta al botón', async ({ page }) => {
    const t = textos('es').search
    await page.goto('./')
    await page.locator('#map[data-idle]').waitFor({ timeout: 30_000 })
    const boton = page.getByRole('button', { name: t.open })
    const caja = page.getByRole('combobox', { name: t.label })
    await expect(caja).toBeHidden()

    await boton.click()
    await expect(page.getByRole('button', { name: t.close })).toHaveAttribute('aria-expanded', 'true')
    await expect(caja).toBeFocused()
    await page.keyboard.type('EEUU')
    await expect(page.getByRole('option').first()).toHaveText('Estados Unidos')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
    await page.keyboard.press('Enter')

    await expect(caja).toBeHidden()
    await expect(boton).toBeFocused()
    await expect.poll(() => longitud(page), { timeout: 30_000 }).toBeLessThan(-80)
    expect(await longitud(page)).toBeGreaterThan(-140)
  })
})
