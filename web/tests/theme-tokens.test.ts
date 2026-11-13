import { describe, expect, it } from 'vitest'
import type { StyleSpecification } from 'maplibre-gl'
import { cssVars, themeCss, themes, type ThemeName } from '../src/theme/tokens'
import { themeMapStyle } from '../src/theme/map'

const names: ThemeName[] = ['dark', 'light']

// Contraste WCAG 2.2: colores #rrggbb o rgba(); un rgba se compone sobre `under`.
function rgb(c: string, under = [255, 255, 255]): number[] {
  if (c.startsWith('#')) return [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16))
  const [r, g, b, a = 1] = c.match(/[\d.]+/g)!.map(Number)
  return [r, g, b].map((v, i) => v * a + under[i] * (1 - a))
}
function lum([r, g, b]: number[]): number {
  const f = (v: number) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
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

  it('cssVars pasa a kebab-case y anida', () => {
    expect(cssVars({ a: { panelBg: '#000' } })).toEqual(['--a-panel-bg: #000;'])
    expect(themeCss()).toContain('[data-theme="light"]')
  })

  it.each(names)('texto sobre panel cumple WCAG AA en %s (panel translúcido sobre blanco, el peor caso)', (n) => {
    const c = themes[n].color
    const panel = rgb(c.panelBg)
    expect(contrast(rgb(c.text), panel)).toBeGreaterThanOrEqual(4.5)
    expect(contrast(rgb(c.textMuted), panel)).toBeGreaterThanOrEqual(4.5)
    expect(contrast(rgb(c.accent), panel)).toBeGreaterThanOrEqual(4.5)
    expect(contrast(rgb(c.accentText), rgb(c.accent))).toBeGreaterThanOrEqual(4.5)
    expect(contrast(rgb(c.focus), panel)).toBeGreaterThanOrEqual(3)
    expect(contrast(rgb(c.text), rgb(c.bg))).toBeGreaterThanOrEqual(4.5)
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
})
