import { describe, expect, it, vi } from 'vitest'
import { preloadPmtiles, RangeOrWholeSource } from '../src/map/pmtiles'

vi.mock('maplibre-gl', () => ({ addProtocol: vi.fn() }))
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

describe('RangeOrWholeSource', () => {
  const bytes = Uint8Array.from({ length: 64 }, (_, i) => i)

  it('con rangos que cuadran no descarga el archivo entero', async () => {
    const fetch = vi.fn(async () => new Response(bytes.slice(8, 16), { status: 206 }))
    vi.stubGlobal('fetch', fetch)
    const r = await new RangeOrWholeSource('https://orbe.test/c.pmtiles').getBytes(8, 8)
    expect([...new Uint8Array(r.data)]).toEqual([8, 9, 10, 11, 12, 13, 14, 15])
    expect(fetch).toHaveBeenCalledOnce()
  })

  // Lo que ve el navegador con gzip de GitHub Pages: un 200 entero o un 206 ya descomprimido y mayor.
  it.each([200, 206])('si el rango no cuadra (%i) pasa al archivo entero una sola vez', async (status) => {
    const fetch = vi.fn(async (_url: string, init?: RequestInit) =>
      init?.headers
        ? new Response(bytes, { status, headers: { 'content-length': '64' } })
        : new Response(bytes),
    )
    vi.stubGlobal('fetch', fetch)
    const source = new RangeOrWholeSource(`https://orbe.test/d${status}.pmtiles`)
    const a = await source.getBytes(8, 8)
    const b = await source.getBytes(40, 4)
    expect([...new Uint8Array(a.data)]).toEqual([8, 9, 10, 11, 12, 13, 14, 15])
    expect([...new Uint8Array(b.data)]).toEqual([40, 41, 42, 43])
    expect(fetch).toHaveBeenCalledTimes(2) // un rango fallido y la descarga completa
  })
})
