import { describe, expect, it, vi } from 'vitest'
import { preloadPmtiles } from '../src/map/pmtiles'

vi.mock('maplibre-gl', () => ({ default: { addProtocol: vi.fn() } }))
vi.stubGlobal('location', { origin: 'https://orbe.test' })

const flush = () => new Promise((r) => setTimeout(r, 0))

describe('preloadPmtiles', () => {
  it('reutiliza la instancia si se llama dos veces (StrictMode)', async () => {
    const fetch = vi.fn(() => new Promise<Response>(() => {}))
    vi.stubGlobal('fetch', fetch)
    preloadPmtiles('a.pmtiles')
    preloadPmtiles('a.pmtiles')
    await flush()
    expect(fetch).toHaveBeenCalledOnce()
  })

  it('si la precarga falla, la siguiente vuelve a pedir la cabecera', async () => {
    const fetch = vi.fn(() => Promise.reject(new TypeError('red caída')))
    vi.stubGlobal('fetch', fetch)
    preloadPmtiles('b.pmtiles')
    await flush()
    preloadPmtiles('b.pmtiles')
    await flush()
    expect(fetch).toHaveBeenCalledTimes(2)
  })
})
