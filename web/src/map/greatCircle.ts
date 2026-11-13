const EARTH_RADIUS_M = 6_371_000
const RAD = Math.PI / 180

/**
 * Arco de círculo máximo entre dos puntos [lon, lat] con altura parabólica, como [lon, lat, metros].
 * Sustituye a ArcLayer sobre el globo de MapLibre, donde deck.gl 9.4 lo proyecta mal (ver DECISIONS.md).
 * Las longitudes salen continuas (pueden pasar de ±180) para que el trazo no salte en el antimeridiano.
 */
export function greatCircleArc(
  from: [number, number],
  to: [number, number],
  segments = 64,
  heightRatio = 0.15,
): [number, number, number][] {
  const toXyz = ([lon, lat]: [number, number]) => [
    Math.cos(lat * RAD) * Math.cos(lon * RAD),
    Math.cos(lat * RAD) * Math.sin(lon * RAD),
    Math.sin(lat * RAD),
  ]
  const a = toXyz(from)
  const b = toXyz(to)
  const angle = Math.acos(Math.min(1, Math.max(-1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2])))
  const peak = angle * EARTH_RADIUS_M * heightRatio
  const out: [number, number, number][] = []
  let prevLon = from[0]
  for (let i = 0; i <= segments; i++) {
    const t = i / segments
    // Puntos coincidentes o antípodas: sin plano único, se interpola en línea recta (sin NaN).
    const flat = Math.sin(angle) < 1e-9
    const sa = flat ? 1 - t : Math.sin((1 - t) * angle) / Math.sin(angle)
    const sb = flat ? t : Math.sin(t * angle) / Math.sin(angle)
    const [x, y, z] = [0, 1, 2].map((k) => sa * a[k] + sb * b[k])
    let lon = Math.atan2(y, x) / RAD
    lon += Math.round((prevLon - lon) / 360) * 360
    prevLon = lon
    const lat = Math.atan2(z, Math.hypot(x, y)) / RAD
    out.push([lon, lat, 4 * t * (1 - t) * peak])
  }
  return out
}
