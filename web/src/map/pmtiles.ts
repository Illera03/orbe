import * as maplibregl from 'maplibre-gl'
import { Protocol } from 'pmtiles'

let registered = false

export function registerPmtiles(): void {
  if (registered) return
  maplibregl.addProtocol('pmtiles', new Protocol().tile)
  registered = true
}

/** `path` relativo a la base de la web, p. ej. `data/poc/countries.pmtiles`. */
export function pmtilesUrl(path: string): string {
  return `pmtiles://${location.origin}${import.meta.env.BASE_URL}${path}`
}
