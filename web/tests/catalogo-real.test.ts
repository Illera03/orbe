// Smoke del catálogo publicado (QA-5): cada indicador de data/ carga y su escala de color no da NaN.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { colorScaleFor } from '../src/map/colorScale'
import type { Catalog, IndicatorData } from '../src/state/data'
import { legendLabels } from '../src/ui/legend'

const read = <T>(path: string): T => JSON.parse(readFileSync(new URL(`../../data/${path}`, import.meta.url), 'utf8'))
const { indicators } = read<Catalog>('catalog.json')
// viridis da «#rrggbb» y PuOr «rgb(r, g, b)».
const COLOR = /^(#[0-9a-f]{6}|rgb\(\d{1,3}, \d{1,3}, \d{1,3}\))$/

describe('catálogo publicado', () => {
  it.each(indicators.map((m) => [m.id, m] as const))('%s: carga y colorScaleFor da dominio finito y colores válidos', (id, meta) => {
    const data = read<IndicatorData>(meta.file)
    expect(data.id).toBe(id)
    const scale = colorScaleFor(meta, data)
    expect(scale.domain.length).toBeGreaterThanOrEqual(2)
    for (const d of scale.domain) expect(Number.isFinite(d), `dominio ${scale.domain}`).toBe(true)
    for (const [a3, series] of Object.entries(data.values)) {
      for (const v of series) {
        if (v == null) continue
        expect(scale.color(v), `${a3} = ${v}`).toMatch(COLOR)
      }
    }
  })

  it.each(indicators.map((m) => [m.id, m] as const))('%s: la leyenda no repite etiquetas seguidas (es y en)', (_id, meta) => {
    const scale = colorScaleFor(meta, read<IndicatorData>(meta.file))
    for (const language of ['es', 'en'] as const) {
      const labels = legendLabels(scale, language, meta.decimals)
      for (let i = 1; i < labels.length; i++) expect(labels[i], `${language}: ${labels.join(' | ')}`).not.toBe(labels[i - 1])
    }
  })
})
