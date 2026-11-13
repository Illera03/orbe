import { describe, expect, it } from 'vitest'
import es from '../src/i18n/es.json'
import en from '../src/i18n/en.json'

function keys(obj: object, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    v !== null && typeof v === 'object' ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`],
  )
}

describe('i18n', () => {
  it('es y en tienen exactamente las mismas claves', () => {
    expect(keys(en).sort()).toEqual(keys(es).sort())
  })

  it('keys detecta claves anidadas', () => {
    expect(keys({ a: { b: 'x' }, c: 'y' })).toEqual(['a.b', 'c'])
  })
})
