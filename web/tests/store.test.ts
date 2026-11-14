import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

let storage: Map<string, string>

function stubBrowser({ prefersLight = false, languages = ['es-ES'] } = {}) {
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => storage.get(k) ?? null,
    setItem: (k: string, v: string) => void storage.set(k, v),
  })
  vi.stubGlobal('matchMedia', (q: string) => ({ matches: prefersLight && q === '(prefers-color-scheme: light)' }))
  vi.stubGlobal('navigator', { languages })
}

// El estado inicial se calcula al importar: cada caso carga el módulo de cero.
async function loadStore() {
  vi.resetModules()
  return (await import('../src/state/store')).useAppStore
}

beforeEach(() => {
  storage = new Map()
})
afterEach(() => {
  vi.unstubAllGlobals()
})

describe('store', () => {
  it('la primera vez sigue la preferencia del sistema', async () => {
    stubBrowser({ prefersLight: true })
    expect((await loadStore()).getState().theme).toBe('light')
    stubBrowser({ prefersLight: false })
    expect((await loadStore()).getState().theme).toBe('dark')
  })

  it('recuerda el tema elegido por encima del sistema', async () => {
    stubBrowser({ prefersLight: false })
    ;(await loadStore()).getState().setTheme('light')
    expect(storage.get('orbe.theme')).toBe('light')
    expect((await loadStore()).getState().theme).toBe('light')
  })

  it('idioma: el del navegador si es es/en, si no español; luego el guardado', async () => {
    stubBrowser({ languages: ['fr-FR', 'en-GB'] })
    expect((await loadStore()).getState().language).toBe('en')
    stubBrowser({ languages: ['fr-FR'] })
    const store = await loadStore()
    expect(store.getState().language).toBe('es')
    store.getState().setLanguage('en')
    expect((await loadStore()).getState().language).toBe('en')
  })

  it('funciona sin localStorage (lanza al acceder)', async () => {
    stubBrowser()
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('bloqueado')
      },
      setItem: () => {
        throw new Error('bloqueado')
      },
    })
    const store = await loadStore()
    store.getState().setTheme('light')
    expect(store.getState().theme).toBe('light')
  })

  it('la proyección empieza en globo y solo cambia el estado', async () => {
    stubBrowser()
    const store = await loadStore()
    expect(store.getState().projection).toBe('globe')
    store.getState().setProjection('mercator')
    expect(store.getState().projection).toBe('mercator')
  })
})
