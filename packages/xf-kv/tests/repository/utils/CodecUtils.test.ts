import { describe, it, expect } from 'vitest'
import { CodecUtils } from '../../../index'

describe('CodecUtils.json (default codec)', () => {
  it('round-trips a value through JSON', () => {
    const codec = CodecUtils.json<{ a: number; b: string }>()
    const raw = codec.encode({ a: 1, b: 'two' })
    expect(raw).toBe('{"a":1,"b":"two"}')
    expect(codec.decode(raw)).toEqual({ a: 1, b: 'two' })
  })
  it('encodes primitives and arrays', () => {
    expect(CodecUtils.json<number>().encode(42)).toBe('42')
    expect(CodecUtils.json<number[]>().decode('[1,2,3]')).toEqual([1, 2, 3])
  })
})

describe('CodecUtils.text (identity codec)', () => {
  it('stores and reads strings verbatim (no JSON quoting)', () => {
    const codec = CodecUtils.text()
    expect(codec.encode('plain')).toBe('plain')
    expect(codec.decode('plain')).toBe('plain')
  })
})
