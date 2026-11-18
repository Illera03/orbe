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
  space: { half: '2px', 1: '0.25rem', 2: '0.5rem', 3: '0.75rem', 4: '1rem', 6: '1.5rem', 8: '2rem', 12: '3rem' },
  radius: { sm: '4px', md: '8px', lg: '14px', pill: '999px' },
  // Controles: 32 px con puntero fino; 44 px de objetivo táctil mínimo en móvil.
  size: { control: '32px', controlTouch: '44px' },
  border: { width: '1px' },
  focus: { width: '2px', offset: '2px' },
  motion: { fast: '150ms', base: '300ms', camera: '1200ms', easing: 'cubic-bezier(0.2, 0, 0, 1)' },
} as const

/**
 * Tipografía y densidad de las etiquetas del mapa base (fuente Noto Sans de OpenFreeMap; aquí solo tamaños y zooms).
 * `minzoom`: desde qué zoom aparece cada clase; `size`: pares [zoom, px] que se interpolan linealmente.
 * Con el globo (z < 4) solo hay nombres de país; regiones y ciudades entran a partir de z4–z5.
 */
export const mapType = {
  country: { minzoom: 4, size: [[1, 10], [3, 12], [5, 14], [7, 16]] },
  state: { minzoom: 4.5, size: [[4.5, 10], [8, 12]] },
  city: { minzoom: 4, size: [[4, 10.5], [8, 13], [12, 15]] },
  town: { minzoom: 6, size: [[6, 10], [12, 13]] },
  minor: { minzoom: 8, size: [[8, 10], [14, 12]] },
  water: { minzoom: 5, size: [[5, 10], [10, 12]] },
  halo: { width: 1.2, blur: 0.6 },
  // Grosor de las fronteras del mapa base por zoom: finas con el globo, ganan peso al acercarse.
  borderWidth: [[0, 0.3], [4, 0.6], [6, 1], [10, 1.6]],
  // Línea de países propia (Natural Earth): un punto más que las del mapa base, que no se ven por debajo de z5.
  countryBorderWidth: [[0, 0.4], [3, 0.6], [6, 1.1], [10, 1.8]],
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
      bg: '#020307',
      panelBg: 'rgba(10, 14, 24, 0.85)',
      panelBorder: 'rgba(255, 255, 255, 0.08)',
      // Contorno de controles (campo, conmutadores): ≥ 3:1 sobre el panel (WCAG 1.4.11); panelBorder solo separa.
      controlBorder: '#7b8494',
      text: '#e8ecf3',
      textMuted: '#a3acbb',
      accent: '#7cc4ff',
      accentText: '#05070d',
      // Conmutador activo: tinte del acento en vez de relleno sólido; el texto da ≥ 4,5:1 sobre el tinte.
      controlActiveBg: 'rgba(124, 196, 255, 0.16)',
      controlActiveText: '#a8d8ff',
      focus: '#ffd166',
      danger: '#ff8a80',
    },
    shadow: { panel: '0 4px 24px rgba(0, 0, 0, 0.35)' },
    blur: { panel: '18px' },
    map: {
      // «Silueta» (D40): países del mismo negro que el espacio sobre un océano azul noche; luminosidad
      // espacio = tierra < océano < fronteras < etiquetas.
      ocean: '#0c1b33',
      land: '#020307',
      border: '#3a4e6b',
      label: '#b0bfd3',
      labelMinor: '#8b9db6',
      labelWater: '#7896bf',
      labelHalo: 'rgba(2, 3, 7, 0.8)',
      countryBorder: 'rgba(176, 191, 211, 0.50)',
      countryHover: '#e8ecf3',
      countrySelected: '#ffd166',
      noDataBg: '#0b0f18',
      noDataStripe: '#27303f',
      sky: '#020307',
      horizon: '#4f7fc4',
      fog: '#020307',
      stars: '#dfe8ff',
      starsOpacity: 0.35,
      atmosphere: 0.8,
    },
    data: {
      sequential: 'viridis',
      diverging: 'PuOr',
      categorical: ['#e69f00', '#56b4e9', '#009e73', '#f0e442', '#0072b2', '#d55e00', '#cc79a7'],
    },
  },
  light: {
    color: {
      bg: '#ebe7df',
      panelBg: '#fffdf8',
      panelBorder: '#e3ddd0',
      controlBorder: '#8a8478',
      text: '#1d1b17',
      textMuted: '#5c574d',
      accent: '#1f5f99',
      accentText: '#ffffff',
      controlActiveBg: 'rgba(31, 95, 153, 0.12)',
      controlActiveText: '#1f5f99',
      focus: '#b35900',
      danger: '#b3261e',
    },
    shadow: { panel: '0 2px 12px rgba(29, 27, 23, 0.12)' },
    blur: { panel: '0px' },
    map: {
      // «Editorial» (D40): papel marfil sobre un océano gris azulado algo más hondo, que recorta las costas.
      ocean: '#cbd8e3',
      land: '#f7f3ea',
      border: '#b9b2a3',
      label: '#3d3a34',
      labelMinor: '#5f5a50',
      labelWater: '#3f5670',
      labelHalo: 'rgba(247, 243, 234, 0.85)',
      countryBorder: 'rgba(29, 27, 23, 0.55)',
      countryHover: '#1d1b17',
      countrySelected: '#b35900',
      noDataBg: '#ece7dc',
      noDataStripe: '#c9c2b4',
      sky: '#ebe7df',
      horizon: '#b8cbdc',
      fog: '#ebe7df',
      stars: '#ffffff',
      starsOpacity: 0,
      atmosphere: 0.6,
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
