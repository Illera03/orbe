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
  const archive = new PMTiles(httpUrl(path))
  protocol.add(archive)
  // Si falla, MapLibre vuelve a pedirla al añadir la fuente y muestra el error allí.
  archive.getHeader().catch(() => {})
  return pmtilesUrl(path)
}

function httpUrl(path: string): string {
  return `${location.origin}${import.meta.env.BASE_URL}${path}`
}
