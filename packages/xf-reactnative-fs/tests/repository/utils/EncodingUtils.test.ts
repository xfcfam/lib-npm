import { describe, it, expect } from 'vitest'
import { EncodingUtils } from '../../../src/repository/utils/EncodingUtils.js'

describe('EncodingUtils', () => {
  it('Base64 encodes known vectors', () => {
    expect(EncodingUtils.toBase64(new Uint8Array([72, 105]))).toBe('SGk=') // "Hi"
    expect(EncodingUtils.toBase64(new Uint8Array([77, 97, 110]))).toBe('TWFu') // "Man"
    expect(EncodingUtils.toBase64(new Uint8Array([]))).toBe('')
  })

  it('Base64 round-trips arbitrary bytes', () => {
    for (let t = 0; t < 100; t++) {
      const n = Math.floor(Math.random() * 64)
      const bytes = new Uint8Array(n)
      for (let i = 0; i < n; i++) bytes[i] = Math.floor(Math.random() * 256)
      const back = EncodingUtils.fromBase64(EncodingUtils.toBase64(bytes))
      expect([...back]).toEqual([...bytes])
    }
  })

  it('byteLength counts UTF-8 bytes', () => {
    expect(EncodingUtils.byteLength('AB')).toBe(2)
    expect(EncodingUtils.byteLength('🌍')).toBe(4)
  })

  it('toBytes / fromBytes round-trip and strip BOM', () => {
    expect(EncodingUtils.fromBytes(EncodingUtils.toBytes('héllo'))).toBe('héllo')
    expect(EncodingUtils.stripBom('﻿hi')).toBe('hi')
    expect(EncodingUtils.detect(new Uint8Array([0xef, 0xbb, 0xbf]))).toBe('utf-8-bom')
  })
})
