import { describe, expect, it } from 'vitest'
import type { StyleSpecification } from 'maplibre-gl'
import { cssVars, mapType, themeCss, themes, type ThemeName } from '../src/theme/tokens'
import { expression, latest, type StylePropertySpecification } from '@maplibre/maplibre-gl-style-spec'
import { GLOBENESS_STATE, SUBNATIONAL_MIN_ZOOM, themeMapStyle, themeSky } from '../src/theme/map'

const names: ThemeName[] = ['dark', 'light']

// Contraste WCAG 2.2: colores #rrggbb o rgba(); un rgba se compone sobre `under`.
function rgb(c: string, under = [255, 255, 255]): number[] {
  if (c.startsWith('#')) return [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16))
  const [r, g, b, a = 1] = c.match(/[\d.]+/g)!.map(Number)
  return [r, g, b].map((v, i) => v * a + under[i] * (1 - a))
}
function lum([r, g, b]: number[]): number {
  const f = (v: number) => ((v /= 255) <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}
function contrast(a: number[], b: number[]): number {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p)
  return (x + 0.05) / (y + 0.05)
}

describe('tokens de tema', () => {
  it('oscuro y claro definen exactamente las mismas claves', () => {
    const keys = (t: object, p = ''): string[] =>
      Object.entries(t).flatMap(([k, v]) =>
        v && typeof v === 'object' && !Array.isArray(v) ? keys(v, `${p}${k}.`) : [`${p}${k}`],
      ).sort()
    expect(keys(themes.light)).toEqual(keys(themes.dark))
  })

  it('expone los tokens de control con los nombres que usa la interfaz', () => {
    for (const v of ['--space-half: 2px', '--size-control: 32px', '--size-control-touch: 44px', '--border-width: 1px', '--focus-width: 2px', '--focus-offset: 2px'])
      expect(themeCss()).toContain(v)
  })

  it('cssVars pasa a kebab-case y anida', () => {
    expect(cssVars({ a: { panelBg: '#000' } })).toEqual(['--a-panel-bg: #000;'])
    expect(themeCss()).toContain('[data-theme="light"]')
    expect(themeCss()).toMatch(/prefers-reduced-motion: reduce\) \{\n:root \{\n {2}--motion-fast: 0ms;/)
  })

  it.each(names)('texto sobre panel cumple WCAG AA en %s (panel translúcido sobre blanco, el peor caso)', (n) => {
    const c = themes[n].color
    const panel = rgb(c.panelBg)
    expect(contrast(rgb(c.text), panel)).toBeGreaterThanOrEqual(4.5)
    expect(contrast(rgb(c.textMuted), panel)).toBeGreaterThanOrEqual(4.5)
    expect(contrast(rgb(c.accent), panel)).toBeGreaterThanOrEqual(4.5)
    expect(contrast(rgb(c.accentText), rgb(c.accent))).toBeGreaterThanOrEqual(4.5)
    expect(contrast(rgb(c.focus), panel)).toBeGreaterThanOrEqual(3)
    // Contorno que identifica un control (WCAG 1.4.11).
    expect(contrast(rgb(c.controlBorder), panel)).toBeGreaterThanOrEqual(3)
    expect(contrast(rgb(c.text), rgb(c.bg))).toBeGreaterThanOrEqual(4.5)
    expect(contrast(rgb(c.danger), panel)).toBeGreaterThanOrEqual(4.5)
  })

  it.each(names)('colores del mapa cumplen WCAG en %s', (n) => {
    const m = themes[n].map
    const land = rgb(m.land)
    expect(contrast(rgb(m.label), land)).toBeGreaterThanOrEqual(4.5)
    expect(contrast(rgb(m.labelWater), rgb(m.ocean))).toBeGreaterThanOrEqual(4.5)
    expect(contrast(rgb(m.countrySelected), land)).toBeGreaterThanOrEqual(3)
    // El contorno de país distingue los colores de datos que no llegan a 3:1 con la tierra (WCAG 1.4.11).
    expect(contrast(rgb(m.countryBorder, land), land)).toBeGreaterThanOrEqual(3)
  })

  it('themeMapStyle colorea por source-layer sin mutar la entrada', () => {
    const base = {
      version: 8,
      sources: {},
      layers: [
        { id: 'background', type: 'background', paint: { 'background-color': '#000' } },
        { id: 'water', type: 'fill', source: 'o', 'source-layer': 'water', paint: { 'fill-opacity': 1 } },
        { id: 'road', type: 'line', source: 'o', 'source-layer': 'transportation', paint: { 'line-color': '#111' } },
      ],
    } as StyleSpecification
    const out = themeMapStyle(base, 'light')
    expect(out.layers[0]).toMatchObject({ paint: { 'background-color': themes.light.map.land } })
    expect(out.layers[1]).toMatchObject({ paint: { 'fill-color': themes.light.map.ocean, 'fill-opacity': 1 } })
    expect(out.layers[2]).toBe(base.layers[2])
    expect(out.sky?.['horizon-color']).toBe(themes.light.map.horizon)
    expect(base.layers[0]).toMatchObject({ paint: { 'background-color': '#000' } })
  })

  it.each(names)('el halo de atmósfera sigue el estado %s de la animación globo/plano', (n) => {
    const style = themeMapStyle({ version: 8, sources: {}, layers: [] } as StyleSpecification, n)
    expect(style.state).toEqual({ [GLOBENESS_STATE]: { default: 1 } })
    // Conserva el `state` que ya traiga el estilo base.
    const conBase = themeMapStyle({ version: 8, sources: {}, layers: [], state: { otro: { default: 'x' } } } as StyleSpecification, n)
    expect(conBase.state).toEqual({ otro: { default: 'x' }, [GLOBENESS_STATE]: { default: 1 } })
    expect(themeSky(n)['atmosphere-blend-transition']).toEqual({ duration: 0 })
    // Se valida con la especificación real de `sky.atmosphere-blend`: MapLibre rechaza el `zoom` anidado.
    const spec = latest.sky['atmosphere-blend'] as StylePropertySpecification
    const blend = (zoom: number, globeness: number) => {
      const exp = expression.createPropertyExpression(themeSky(n)['atmosphere-blend'], 'sky', spec, { [GLOBENESS_STATE]: globeness })
      if (exp.result !== 'success') throw new Error(JSON.stringify(exp.value))
      return exp.value.evaluate({ zoom })
    }
    const full = themes[n].map.atmosphere
    expect(blend(0, 1)).toBeCloseTo(full)
    expect(blend(0, 0.5)).toBeCloseTo(full / 2)
    expect(blend(0, 0)).toBe(0)
    expect(blend(3, 1)).toBeCloseTo(full / 2)
    expect(blend(6, 1)).toBe(0)
  })

  it('themeMapStyle oculta a zoom bajo los límites del mapa base: subnacionales con fundido y de país hasta z5', () => {
    const line = (id: string, filter: unknown, minzoom?: number) =>
      ({ id, type: 'line', source: 'o', 'source-layer': 'boundary', filter, minzoom, paint: { 'line-opacity': 1 } })
    // Filtros copiados de los estilos dark y positron de OpenFreeMap.
    const base = {
      version: 8,
      sources: {},
      layers: [
        line('boundary_state', ['==', ['get', 'admin_level'], 4]),
        line('boundary_3', ['all', ['>=', ['get', 'admin_level'], 3], ['<=', ['get', 'admin_level'], 6]], 8),
        line('boundary_country_z0-4', ['all', ['==', ['get', 'admin_level'], 2], ['!', ['has', 'claimed_by']]]),
        line('boundary_disputed', ['all', ['!=', ['get', 'maritime'], 1], ['==', ['get', 'disputed'], 1]]),
      ],
    } as StyleSpecification
    for (const t of names) {
      const [state, prov, country, disputed] = themeMapStyle(base, t).layers
      expect(state.minzoom).toBe(SUBNATIONAL_MIN_ZOOM)
      expect(prov.minzoom).toBe(8)
      expect(state.paint).toMatchObject({ 'line-color': themes[t].map.border, 'line-opacity': ['interpolate', ['linear'], ['zoom'], SUBNATIONAL_MIN_ZOOM, 0, SUBNATIONAL_MIN_ZOOM + 1, 1] })
      // Hasta z5 las fronteras de país las dibuja solo `countries-line` (Natural Earth); sin fundido.
      for (const l of [country, disputed]) expect(l).toMatchObject({ minzoom: SUBNATIONAL_MIN_ZOOM, paint: { 'line-opacity': 1 } })
    }
  })

  it('themeMapStyle: etiquetas sin mayúsculas, por clase y zoom, y sin nombres con el globo', () => {
    const sym = (id: string, src: string, filter: unknown, minzoom?: number) =>
      ({ id, type: 'symbol', source: 'o', 'source-layer': src, filter, minzoom, layout: { 'text-transform': 'uppercase', 'text-letter-spacing': 0.2 }, paint: {} })
    // Filtros recortados de dark (una clase por capa) y positron (`label_other`, varias clases).
    const base = {
      version: 8,
      sources: {},
      layers: [
        sym('place_country_major', 'place', ['all', ['==', ['get', 'class'], 'country']]),
        sym('place_state', 'place', ['all', ['==', ['get', 'class'], 'state']]),
        sym('place_city', 'place', ['all', ['==', ['get', 'class'], 'city']]),
        sym('label_other', 'place', ['match', ['get', 'class'], ['city', 'continent', 'country', 'state', 'town', 'village'], false, true], 8),
        sym('water_name', 'water_name', null),
      ],
    } as StyleSpecification
    for (const t of names) {
      const [country, state, city, other, water] = themeMapStyle(base, t).layers as Array<{ minzoom?: number; layout: Record<string, unknown>; paint: Record<string, unknown> }>
      expect([country, state, city, other, water].map((l) => l.minzoom)).toEqual([
        mapType.country.minzoom, mapType.state.minzoom, mapType.city.minzoom, mapType.minor.minzoom, mapType.water.minzoom,
      ])
      // Con el globo (zoom inicial ≈ 2,2) no hay ninguna etiqueta del mapa base.
      for (const l of [country, state, city, other, water]) {
        expect(l.minzoom).toBeGreaterThanOrEqual(4)
        expect(l.layout).toMatchObject({ 'text-transform': 'none', 'text-letter-spacing': 0 })
      }
      expect(country.paint['text-color']).toBe(themes[t].map.label)
      expect(city.paint['text-color']).toBe(themes[t].map.labelMinor)
    }
  })

  it('jerarquía del tema oscuro «Silueta»: espacio = tierra < océano < fronteras < etiquetas', () => {
    const m = themes.dark.map
    expect(m.land).toBe(themes.dark.color.bg)
    const l = (c: string) => lum(rgb(c))
    expect(l(m.land)).toBeLessThan(l(m.ocean))
    expect(l(m.ocean)).toBeLessThan(l(m.border))
    expect(l(m.border)).toBeLessThan(l(m.labelMinor))
    expect(l(m.labelMinor)).toBeLessThan(l(m.label))
  })

  it('etiquetas del mapa ≥ 4,5:1 y contorno de país ≥ 3:1 sobre tierra y océano en ambos temas', () => {
    for (const t of names) {
      const m = themes[t].map
      for (const c of [m.label, m.labelMinor]) for (const bg of [m.land, m.ocean]) expect(contrast(rgb(c), rgb(bg))).toBeGreaterThanOrEqual(4.5)
      expect(contrast(rgb(m.labelWater), rgb(m.ocean))).toBeGreaterThanOrEqual(4.5)
      for (const bg of [m.land, m.ocean]) expect(contrast(rgb(m.countryBorder, rgb(bg)), rgb(bg))).toBeGreaterThanOrEqual(3)
    }
  })

  it('conmutador activo: texto ≥ 4,5:1 sobre su tinte encima del panel', () => {
    for (const t of names) {
      const c = themes[t].color
      // Peor caso del tema oscuro: panel translúcido sobre blanco, como el resto de pruebas de panel.
      const panel = rgb(c.panelBg)
      expect(contrast(rgb(c.controlActiveText), rgb(c.controlActiveBg, panel))).toBeGreaterThanOrEqual(4.5)
    }
  })
})
