import * as maplibregl from 'maplibre-gl'
import { FetchSource, PMTiles, Protocol, type RangeResponse, type Source } from 'pmtiles'

const protocol = new Protocol()
let registered = false

export function registerPmtiles(): void {
  if (registered) return
  maplibregl.addProtocol('pmtiles', protocol.tile)
  registered = true
}

/** `path` relativo a la base de la web, p. ej. `data/poc/countries.pmtiles`. */
export function pmtilesUrl(path: string): string {
  return `pmtiles://${httpUrl(path)}`
}

/**
 * Pide rangos como siempre y, si un rango no cuadra, pasa a descargar el archivo entero una vez y
 * servirlo desde memoria. Algunos nodos de GitHub Pages comprimen `.pmtiles` con gzip y aplican el
 * `Range` a los bytes comprimidos: el navegador los descomprime y el rango no cuadra («content-length
 * exceeding request»). Con rangos que funcionan no se descarga nada de más (LCP de D39).
 */
export class RangeOrWholeSource implements Source {
  private readonly ranges: FetchSource
  private whole?: Promise<ArrayBuffer>
  constructor(private readonly url: string) {
    this.ranges = new FetchSource(url)
  }
  getKey(): string {
    return this.url
  }
  async getBytes(offset: number, length: number, signal?: AbortSignal, etag?: string): Promise<RangeResponse> {
    if (!this.whole) {
      try {
        const r = await this.ranges.getBytes(offset, length, signal, etag)
        // Un 206 sobre gzip llega ya descomprimido y con más bytes de los pedidos: tampoco vale.
        if (r.data.byteLength <= length) return r
        this.whole = this.fetchWhole()
      } catch (e) {
        // Solo el rango descuadrado pasa al archivo entero; un fallo de red se propaga y se reintenta.
        if (!(e instanceof Error) || !/content-length|Byte Serving/.test(e.message)) throw e
        this.whole = this.fetchWhole()
      }
    }
    try {
      return { data: (await this.whole).slice(offset, offset + length) }
    } catch (e) {
      this.whole = undefined // el siguiente intento vuelve a probar con rangos
      throw e
    }
  }
  private async fetchWhole(): Promise<ArrayBuffer> {
    const r = await fetch(this.url)
    if (!r.ok) throw new Error(`${r.status} ${this.url}`)
    return r.arrayBuffer()
  }
}

/**
 * Pide ya la cabecera y el directorio raíz (un único rango de 16 KB), en paralelo con el estilo
 * remoto. Sin esto la petición sale al añadir la fuente tras 'style.load' y suma un viaje más
 * antes de las primeras teselas. Devuelve la URL `pmtiles://` que reutiliza esa instancia.
 */
export function preloadPmtiles(path: string): string {
  registerPmtiles()
  const url = httpUrl(path)
  // Se reutiliza la instancia ya registrada: StrictMode monta el efecto dos veces en desarrollo.
  if (protocol.get(url)) return pmtilesUrl(path)
  const archive = new PMTiles(new RangeOrWholeSource(url))
  protocol.add(archive)
  // La instancia guarda la promesa rechazada: si falla, se retira para que el protocolo cree
  // otra al añadir la fuente y MapLibre lo vuelva a intentar.
  archive.getHeader().catch(() => protocol.tiles.delete(url))
  return pmtilesUrl(path)
}

function httpUrl(path: string): string {
  return `${location.origin}${import.meta.env.BASE_URL}${path}`
}
