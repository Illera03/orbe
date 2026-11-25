import * as maplibregl from 'maplibre-gl'
import { PMTiles, Protocol, type RangeResponse, type Source } from 'pmtiles'

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
 * Descarga el archivo entero una vez y sirve los rangos desde memoria. GitHub Pages comprime
 * `.pmtiles` con gzip y aplica el `Range` a los bytes comprimidos: el navegador los descomprime y
 * el rango no cuadra («content-length exceeding request»), según la caché que responda. Con el
 * fichero completo (≈ 1,4 MB, menos con gzip) no hay peticiones por rango.
 */
class WholeFileSource implements Source {
  private bytes?: Promise<ArrayBuffer>
  constructor(private readonly url: string) {}
  getKey(): string {
    return this.url
  }
  async getBytes(offset: number, length: number): Promise<RangeResponse> {
    this.bytes ??= fetch(this.url).then((r) => {
      if (!r.ok) throw new Error(`${r.status} ${this.url}`)
      return r.arrayBuffer()
    })
    try {
      return { data: (await this.bytes).slice(offset, offset + length) }
    } catch (e) {
      this.bytes = undefined // el siguiente intento vuelve a pedirlo
      throw e
    }
  }
}

/**
 * Pide ya el archivo, en paralelo con el estilo
 * remoto. Sin esto la petición sale al añadir la fuente tras 'style.load' y suma un viaje más
 * antes de las primeras teselas. Devuelve la URL `pmtiles://` que reutiliza esa instancia.
 */
export function preloadPmtiles(path: string): string {
  registerPmtiles()
  const url = httpUrl(path)
  // Se reutiliza la instancia ya registrada: StrictMode monta el efecto dos veces en desarrollo.
  if (protocol.get(url)) return pmtilesUrl(path)
  const archive = new PMTiles(new WholeFileSource(url))
  protocol.add(archive)
  // La instancia guarda la promesa rechazada: si falla, se retira para que el protocolo cree
  // otra al añadir la fuente y MapLibre lo vuelva a intentar.
  archive.getHeader().catch(() => protocol.tiles.delete(url))
  return pmtilesUrl(path)
}

function httpUrl(path: string): string {
  return `${location.origin}${import.meta.env.BASE_URL}${path}`
}
