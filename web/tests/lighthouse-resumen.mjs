// Tabla Markdown con las cifras de Lighthouse (ejecución representativa) para el resumen del job.
// Sirve para recalibrar los umbrales de lighthouserc.cjs.
import { existsSync, readFileSync } from 'node:fs'

const filas = []
for (const form of ['escritorio', 'movil']) {
  const manifiesto = `lighthouse/${form}/manifest.json`
  if (!existsSync(manifiesto)) continue
  const rep = JSON.parse(readFileSync(manifiesto, 'utf8')).find((r) => r.isRepresentativeRun)
  if (!rep) throw new Error(`${manifiesto} no tiene ejecución representativa`)
  const { audits } = JSON.parse(readFileSync(rep.jsonPath, 'utf8'))
  filas.push(
    `| ${form} | ${Math.round(rep.summary.performance * 100)} | ${Math.round(audits['largest-contentful-paint'].numericValue)} ms | ${audits['cumulative-layout-shift'].numericValue.toFixed(3)} | ${Math.round(rep.summary.seo * 100)} |`,
  )
}
console.log(['| Forma | Rendimiento | LCP | CLS | SEO |', '| --- | --- | --- | --- | --- |', ...filas].join('\n'))
