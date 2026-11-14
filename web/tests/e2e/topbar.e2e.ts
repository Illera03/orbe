import { expect, test, type Page } from '@playwright/test'

const sinScrollHorizontal = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)

test.describe('barra superior en móvil (320 px)', () => {
  test.use({ viewport: { width: 320, height: 640 }, locale: 'es-ES', colorScheme: 'dark' })

  test('se recorre con teclado, los controles miden 44 px y no hay scroll horizontal', async ({ page, browserName }) => {
    // WebKit en macOS solo lleva el Tab a los botones con Alt (acceso total por teclado desactivado).
    const tab = browserName === 'webkit' && process.platform === 'darwin' ? 'Alt+Tab' : 'Tab'
    await page.goto('./')
    const html = page.locator('html')
    await expect(html).toHaveAttribute('data-theme', 'dark')
    expect(await sinScrollHorizontal(page)).toBe(true)

    const botones = page.getByRole('banner').getByRole('button')
    await expect(botones).toHaveCount(3)
    for (const caja of await Promise.all((await botones.all()).map((b) => b.boundingBox()))) {
      expect(caja!.width).toBeGreaterThanOrEqual(44)
      expect(caja!.height).toBeGreaterThanOrEqual(44)
    }

    await page.keyboard.press(tab)
    await expect(page.getByRole('button', { name: 'EN, cambiar idioma a inglés' })).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(html).toHaveAttribute('lang', 'en')

    // Tras cambiar a inglés, las etiquetas ya salen en inglés.
    await page.keyboard.press(tab)
    await expect(page.getByRole('button', { name: 'Switch to light theme' })).toBeFocused()
    await page.keyboard.press('Space')
    await expect(html).toHaveAttribute('data-theme', 'light')

    await page.keyboard.press(tab)
    await expect(page.getByRole('button', { name: 'Show flat map' })).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('button', { name: 'Show as globe' })).toBeFocused()

    expect(await sinScrollHorizontal(page)).toBe(true)
    await page.reload()
    await expect(html).toHaveAttribute('lang', 'en')
    await expect(html).toHaveAttribute('data-theme', 'light')
  })
})

test.describe('barra superior en escritorio', () => {
  test.use({ viewport: { width: 1280, height: 800 }, locale: 'es-ES', colorScheme: 'dark' })

  test('grupos con aria-pressed que se activan con teclado', async ({ page }) => {
    await page.goto('./')
    await expect(page.getByRole('banner').getByRole('button')).toHaveCount(6)
    const plano = page.getByRole('group', { name: 'Proyección' }).getByRole('button', { name: 'Plano' })
    await expect(plano).toHaveAttribute('aria-pressed', 'false')
    await plano.focus()
    await page.keyboard.press('Enter')
    await expect(plano).toHaveAttribute('aria-pressed', 'true')
  })
})
