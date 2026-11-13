import maplibregl from 'maplibre-gl'
import { PMTiles, Protocol } from 'pmtiles'

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
 * Pide ya la cabecera y el directorio raíz (un único rango de 16 KB), en paralelo con el estilo
 * remoto. Sin esto la petición sale al añadir la fuente tras 'style.load' y suma un viaje más
 * antes de las primeras teselas. Devuelve la URL `pmtiles://` que reutiliza esa instancia.
 */
export function preloadPmtiles(path: string): string {
  registerPmtiles()
  const url = httpUrl(path)
  // Se reutiliza la instancia ya registrada: StrictMode monta el efecto dos veces en desarrollo.
  if (protocol.get(url)) return pmtilesUrl(path)
  const archive = new PMTiles(url)
  protocol.add(archive)
  // La instancia guarda la promesa rechazada: si falla, se retira para que el protocolo cree
  // otra al añadir la fuente y MapLibre lo vuelva a intentar.
  archive.getHeader().catch(() => protocol.tiles.delete(url))
  return pmtilesUrl(path)
}

function httpUrl(path: string): string {
  return `${location.origin}${import.meta.env.BASE_URL}${path}`
}
