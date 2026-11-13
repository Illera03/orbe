import { describe, expect, it } from 'vitest'
import { createFpsCounter } from '../src/map/fps'

describe('createFpsCounter', () => {
  it('informa de los fotogramas por segundo en cada ventana de 1 s', () => {
    const out: number[] = []
    const tick = createFpsCounter((fps) => out.push(fps))
    for (let i = 0; i <= 120; i++) tick(i * (1000 / 60))
    expect(out).toEqual([60, 60])
  })
})
