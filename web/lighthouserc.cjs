/* global process, module */
// Lighthouse CI sobre el build servido con `vite preview` en /orbe/, como GitHub Pages.
// Uso: LH_FORM=desktop|mobile npx lhci autorun --config=lighthouserc.cjs (antes, npm run build).
const PORT = 4174
const desktop = process.env.LH_FORM === 'desktop'

// shortcut: D29, las aserciones son 'warn' porque el WebGL por software del runner da cifras poco fiables;
// con cinco ejecuciones de referencia en main, cambiar LEVEL a 'error' y fijar los umbrales de SPEC
// (escritorio: rendimiento >= 0.85, LCP < 2500 ms, CLS < 0.1; móvil: rendimiento >= 0.70),
// o los que den esas ejecuciones si están por encima, y anotarlo en DECISIONS.md.
const LEVEL = 'warn'

module.exports = {
  ci: {
    collect: {
      startServerCommand: `npm run preview -- --port ${PORT} --strictPort`,
      startServerReadyPattern: 'Local',
      url: [`http://localhost:${PORT}/orbe/`],
      numberOfRuns: 3,
      settings: {
        ...(desktop ? { preset: 'desktop' } : {}),
        // Chrome sin sandbox en el runner de Linux.
        chromeFlags: '--no-sandbox',
      },
    },
    assert: {
      assertions: {
        'categories:performance': [LEVEL, { minScore: desktop ? 0.85 : 0.7 }],
        // SPEC fija LCP y CLS solo en escritorio.
        ...(desktop
          ? {
              'largest-contentful-paint': [LEVEL, { maxNumericValue: 2500 }],
              'cumulative-layout-shift': [LEVEL, { maxNumericValue: 0.1 }],
            }
          : {}),
      },
    },
    upload: {
      target: 'filesystem',
      outputDir: `lighthouse/${desktop ? 'escritorio' : 'movil'}`,
    },
  },
}
