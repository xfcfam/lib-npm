import { describe, it, expect } from 'vitest'
import { SerializeUtils, type Serializer } from '../../../index'

describe('SerializeUtils.pickSerializer', () => {
  it('routes application/x-www-form-urlencoded to the built-in form serializer', () => {
    expect(SerializeUtils.pickSerializer('application/x-www-form-urlencoded')).toBe(SerializeUtils.FormSerializer)
  })

  it('is case-insensitive and strips parameters after `;`', () => {
    expect(SerializeUtils.pickSerializer('Application/X-WWW-Form-Urlencoded; charset=utf-8'))
      .toBe(SerializeUtils.FormSerializer)
  })

  it('routes text/* to the built-in text serializer', () => {
    expect(SerializeUtils.pickSerializer('text/plain')).toBe(SerializeUtils.TextSerializer)
    expect(SerializeUtils.pickSerializer('text/csv')).toBe(SerializeUtils.TextSerializer)
  })

  it('returns undefined for application/json (kept on ky\'s json channel)', () => {
    expect(SerializeUtils.pickSerializer('application/json')).toBeUndefined()
    expect(SerializeUtils.pickSerializer('application/vnd.api+json')).toBeUndefined()
  })

  it('lets a user serializer override the built-ins (case-insensitive)', () => {
    const xml: Serializer = (b) => `<xml>${String(b)}</xml>`
    const picked = SerializeUtils.pickSerializer('Application/XML', { 'application/xml': xml })
    expect(picked).toBe(xml)
  })
})

describe('SerializeUtils.FormSerializer', () => {
  it('passes a URLSearchParams through unchanged', () => {
    const p = new URLSearchParams({ a: '1' })
    expect(SerializeUtils.FormSerializer(p)).toBe(p)
  })

  it('encodes a flat record into URLSearchParams, dropping null/undefined', () => {
    const out = SerializeUtils.FormSerializer({ a: '1', b: 2, c: null, d: undefined }) as URLSearchParams
    expect(out).toBeInstanceOf(URLSearchParams)
    expect(out.toString()).toBe('a=1&b=2')
  })
})

describe('SerializeUtils.isEncoded', () => {
  it('recognizes transport-ready bodies', () => {
    expect(SerializeUtils.isEncoded('raw')).toBe(true)
    expect(SerializeUtils.isEncoded(new URLSearchParams())).toBe(true)
    expect(SerializeUtils.isEncoded(new Uint8Array([1, 2]))).toBe(true)
    expect(SerializeUtils.isEncoded(new ArrayBuffer(4))).toBe(true)
  })

  it('rejects plain objects and arrays (these default to JSON)', () => {
    expect(SerializeUtils.isEncoded({ a: 1 })).toBe(false)
    expect(SerializeUtils.isEncoded([1, 2, 3])).toBe(false)
    expect(SerializeUtils.isEncoded(42)).toBe(false)
  })
})
