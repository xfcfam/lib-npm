import { describe, it, expect } from 'vitest'
import { KeyUtils } from '../../../index'

describe('KeyUtils.namespaced', () => {
  it('prefixes the key with the namespace and separator', () => {
    expect(KeyUtils.namespaced('sess', 'abc')).toBe('sess:abc')
  })
  it('returns the key unchanged when the namespace is empty', () => {
    expect(KeyUtils.namespaced('', 'abc')).toBe('abc')
  })
})

describe('KeyUtils.prefix', () => {
  it('is the namespace + separator', () => {
    expect(KeyUtils.prefix('sess')).toBe('sess:')
  })
  it('is empty for an empty namespace', () => {
    expect(KeyUtils.prefix('')).toBe('')
  })
})

describe('KeyUtils.strip', () => {
  it('removes the namespace prefix from a stored key', () => {
    expect(KeyUtils.strip('sess', 'sess:abc')).toBe('abc')
  })
  it('leaves a key without the prefix unchanged', () => {
    expect(KeyUtils.strip('sess', 'other:abc')).toBe('other:abc')
    expect(KeyUtils.strip('', 'abc')).toBe('abc')
  })
})
