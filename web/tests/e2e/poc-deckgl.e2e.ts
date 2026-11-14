import { readFileSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'

const es = JSON.parse(readFileSync(new URL('../../src/i18n/es.json', import.meta.url), 'utf8'))

// El globo gira solo, así que MapLibre repinta en cada fotograma: tras N fotogramas, deck.gl ha dibujado N veces.
const frames = (page: Page, n: number) =>
  page.evaluate(
    (n) =>
      new Promise<void>((done) => {
        const tick = () => (--n <= 0 ? done() : requestAnimationFrame(tick))
        requestAnimationFrame(tick)
      }),
    n,
  )

// Humo de la PoC de deck.gl sobre MapLibre: globo, paso a plano y vuelta sin errores en consola.
// Depende del estilo remoto de OpenFreeMap (sin él no hay evento 'load' ni overlay).
test('PoC de deck.gl sin errores de consola', async ({ page }) => {
  test.slow() // WebGL por software (SwiftShader): con la máquina cargada pasa de 30 s.
  const errores: string[] = []
  const origen = new URL(test.info().project.use.baseURL!).origin
  page.on('pageerror', (e) => errores.push(e.message))
  page.on('console', (m) => {
    // Solo se toleran recursos externos que falten (glifos, favicon); los propios, como el worker, no.
    const url = m.location().url
    if (m.type() !== 'error') return
    if (m.text().startsWith('Failed to load resource') && url && !url.startsWith(origen)) return
    errores.push(`${m.text()} ${url}`)
  })
  const worker = page.waitForResponse((r) => /\/orbe\/assets\/maplibre-gl-worker-[^/]+\.js/.test(r.url()))
  await page.goto('./poc/deckgl.html')
  expect((await worker).status()).toBe(200)

  const boton = page.getByRole('button')
  await expect(boton).toBeVisible()
  // El aviso desaparece cuando deck.gl ya está inicializado y dibuja en cada fotograma del mapa.
  await expect(page.getByText(es.poc.deckgl.loading)).toHaveCount(0, { timeout: 30_000 })
  await frames(page, 10)
  await boton.click()
  await frames(page, 10)
  await boton.click()
  await frames(page, 10)
  expect(errores).toEqual([])
})
