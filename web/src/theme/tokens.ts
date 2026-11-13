// Fichero único de tokens de Orbe (SPEC, «Diseño visual»). Ninguna pantalla define colores fuera de aquí.
// Las claves de `themes.dark` y `themes.light` deben coincidir; lo comprueba web/tests/theme-tokens.test.ts.

export type ThemeName = 'dark' | 'light'

/** Valores comunes a ambos temas. */
export const shared = {
  font: {
    sans: "'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif",
    display: "'Space Grotesk', 'Inter', system-ui, sans-serif",
    weightRegular: '400',
    weightStrong: '600',
    sizeXs: '0.75rem',
    sizeSm: '0.875rem',
    sizeMd: '1rem',
    sizeLg: '1.25rem',
    sizeXl: '1.75rem',
    sizeHero: '2.75rem',
    lineTight: '1.15',
    lineBase: '1.5',
    // Cifras tabulares para tablas y leyendas: `font-variant-numeric: var(--font-numeric-table)`.
    numericTable: 'tabular-nums',
  },
  space: { 1: '0.25rem', 2: '0.5rem', 3: '0.75rem', 4: '1rem', 6: '1.5rem', 8: '2rem', 12: '3rem' },
  radius: { sm: '4px', md: '8px', lg: '14px', pill: '999px' },
  motion: { fast: '150ms', base: '300ms', camera: '1200ms', easing: 'cubic-bezier(0.2, 0, 0, 1)' },
} as const

/** Duraciones con `prefers-reduced-motion: reduce` (SPEC: transiciones cortas); sustituyen a `shared.motion`. */
export const reducedMotion = { fast: '0ms', base: '100ms', camera: '300ms' } as const

/**
 * Valores por tema. `color` es interfaz, `map` es mapa base, globo y capa de países.
 * Paleta de datos: secuencial viridis, divergente PuOr (ColorBrewer, apta para daltonismo) y
 * categórica Okabe-Ito sin el negro; el «sin dato» es un rayado neutro (`noDataStripe` sobre `noDataBg`).
 * Algunos colores de datos (amarillo Okabe-Ito y extremos de viridis) no llegan a 3:1 con `land`: todo país
 * relleno con dato lleva el contorno `countryBorder`, que sí da ≥ 3:1 sobre `land` (WCAG 1.4.11).
 */
export const themes = {
  dark: {
    color: {
      bg: '#05070d',
      panelBg: 'rgba(14, 18, 28, 0.85)',
      panelBorder: 'rgba(255, 255, 255, 0.10)',
      text: '#e8ecf3',
      textMuted: '#a3acbb',
      accent: '#7cc4ff',
      accentText: '#05070d',
      focus: '#ffd166',
      danger: '#ff8a80',
    },
    shadow: { panel: '0 8px 32px rgba(0, 0, 0, 0.45)' },
    blur: { panel: '14px' },
    map: {
      ocean: '#0b1422',
      land: '#232833',
      border: '#4a5262',
      label: '#9aa3b2',
      labelWater: '#7a95ba',
      labelHalo: '#05070d',
      countryBorder: 'rgba(232, 236, 243, 0.40)',
      countryHover: '#e8ecf3',
      countrySelected: '#ffd166',
      noDataBg: '#2a2f3a',
      noDataStripe: '#4a5160',
      sky: '#05070d',
      horizon: '#3d6fb6',
      fog: '#05070d',
      stars: '#ffffff',
      starsOpacity: 0.6,
    },
    data: {
      sequential: 'viridis',
      diverging: 'PuOr',
      categorical: ['#e69f00', '#56b4e9', '#009e73', '#f0e442', '#0072b2', '#d55e00', '#cc79a7'],
    },
  },
  light: {
    color: {
      bg: '#e9e6df',
      panelBg: '#fffdf8',
      panelBorder: '#e3ddd0',
      text: '#1d1b17',
      textMuted: '#5c574d',
      accent: '#1f5f99',
      accentText: '#ffffff',
      focus: '#b35900',
      danger: '#b3261e',
    },
    shadow: { panel: '0 2px 12px rgba(29, 27, 23, 0.12)' },
    blur: { panel: '0px' },
    map: {
      ocean: '#d6e0e8',
      land: '#f6f1e6',
      border: '#b9b2a3',
      label: '#4a4740',
      labelWater: '#4a5e75',
      labelHalo: '#f6f1e6',
      countryBorder: 'rgba(29, 27, 23, 0.55)',
      countryHover: '#1d1b17',
      countrySelected: '#b35900',
      noDataBg: '#ece7dc',
      noDataStripe: '#c9c2b4',
      sky: '#e9e6df',
      horizon: '#c7d6e3',
      fog: '#e9e6df',
      stars: '#ffffff',
      starsOpacity: 0,
    },
    data: {
      sequential: 'viridis',
      diverging: 'PuOr',
      categorical: ['#e69f00', '#56b4e9', '#009e73', '#f0e442', '#0072b2', '#d55e00', '#cc79a7'],
    },
  },
} as const

export type ThemeTokens = (typeof themes)[ThemeName]

/** Aplana un objeto a pares `--a-b-c: valor` (camelCase a kebab-case). Los arrays se omiten. */
export function cssVars(obj: object, prefix = '-'): string[] {
  return Object.entries(obj).flatMap(([k, v]) => {
    const name = `${prefix}-${k.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase())}`
    if (Array.isArray(v)) return []
    return v !== null && typeof v === 'object' ? cssVars(v, name) : [`${name}: ${v};`]
  })
}

/** CSS completo: comunes en `:root` y por tema en `[data-theme]`; sin atributo rige el oscuro (predeterminado). */
export function themeCss(): string {
  const block = (sel: string, vars: string[]) => `${sel} {\n  ${vars.join('\n  ')}\n}`
  return [
    block(':root', cssVars(shared)),
    block(':root, [data-theme="dark"]', ['color-scheme: dark;', ...cssVars(themes.dark)]),
    block('[data-theme="light"]', ['color-scheme: light;', ...cssVars(themes.light)]),
    `@media (prefers-reduced-motion: reduce) {\n${block(':root', cssVars({ motion: reducedMotion }))}\n}`,
    block('body', [
      'margin: 0;',
      'background: var(--color-bg);',
      'color: var(--color-text);',
      'font: var(--font-weight-regular) var(--font-size-md) / var(--font-line-base) var(--font-sans);',
    ]),
  ].join('\n')
}
