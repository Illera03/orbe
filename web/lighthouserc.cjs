/* global process, module */
// Lighthouse CI sobre el build servido con `vite preview` en /orbe/, como GitHub Pages.
// Uso: LH_FORM=desktop|mobile npx lhci autorun --config=lighthouserc.cjs (antes, npm run build).
const PORT = 4174
const desktop = process.env.LH_FORM === 'desktop'

// Umbrales: unos 5 puntos por debajo del peor rendimiento de las ejecuciones de main entre #34 y #47
// (WebGL por software del runner, D39), para que bloqueen regresiones; los objetivos de SPEC se miden a mano.
const LEVEL = 'error'

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
        'categories:performance': [LEVEL, { minScore: desktop ? 0.56 : 0.57 }],
        'categories:seo': [LEVEL, { minScore: 0.9 }],
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
