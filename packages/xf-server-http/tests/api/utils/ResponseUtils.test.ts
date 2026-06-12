import { describe, it, expect } from 'vitest'
import { ResponseUtils } from '../../../index'

const stream = () => new ReadableStream<Uint8Array>({ start(c) { c.close() } })

describe('ResponseUtils.isStream', () => {
  it('is true only for objects exposing getReader()', () => {
    expect(ResponseUtils.isStream(stream())).toBe(true)
    expect(ResponseUtils.isStream({ getReader: () => {} })).toBe(true)
  })
  it('is false for non-streams', () => {
    expect(ResponseUtils.isStream({})).toBe(false)
    expect(ResponseUtils.isStream(null)).toBe(false)
    expect(ResponseUtils.isStream('x')).toBe(false)
    expect(ResponseUtils.isStream(new Uint8Array())).toBe(false)
  })
})

describe('ResponseUtils.isBinary', () => {
  it('is true for Uint8Array and Buffer (a Uint8Array subtype)', () => {
    expect(ResponseUtils.isBinary(new Uint8Array([1, 2]))).toBe(true)
    expect(ResponseUtils.isBinary(Buffer.from('hi'))).toBe(true)
  })
  it('is false otherwise', () => {
    expect(ResponseUtils.isBinary([1, 2])).toBe(false)
    expect(ResponseUtils.isBinary('hi')).toBe(false)
    expect(ResponseUtils.isBinary({})).toBe(false)
  })
})

describe('ResponseUtils.isTextual', () => {
  it('is true only for strings', () => {
    expect(ResponseUtils.isTextual('')).toBe(true)
    expect(ResponseUtils.isTextual('hello')).toBe(true)
    expect(ResponseUtils.isTextual(5)).toBe(false)
    expect(ResponseUtils.isTextual({})).toBe(false)
  })
})

describe('ResponseUtils.isObject', () => {
  it('is true for JS values that will be JSON-serialised', () => {
    expect(ResponseUtils.isObject({ a: 1 })).toBe(true)
    expect(ResponseUtils.isObject([1, 2])).toBe(true)
    expect(ResponseUtils.isObject(5)).toBe(true)
    expect(ResponseUtils.isObject(true)).toBe(true)
    expect(ResponseUtils.isObject(null)).toBe(true)
  })
  it('is false for streams, bytes, strings and undefined', () => {
    expect(ResponseUtils.isObject(stream())).toBe(false)
    expect(ResponseUtils.isObject(new Uint8Array())).toBe(false)
    expect(ResponseUtils.isObject('x')).toBe(false)
    expect(ResponseUtils.isObject(undefined)).toBe(false)
  })
})

describe('ResponseUtils.isEmpty', () => {
  it('is true only for undefined', () => {
    expect(ResponseUtils.isEmpty(undefined)).toBe(true)
    expect(ResponseUtils.isEmpty(null)).toBe(false)
    expect(ResponseUtils.isEmpty('')).toBe(false)
    expect(ResponseUtils.isEmpty(0)).toBe(false)
  })
})

describe('ResponseUtils — classifiers are exhaustive and disjoint for defined bodies', () => {
  const bodies: unknown[] = [stream(), new Uint8Array([1]), 'text', { a: 1 }, [1], 42, true, null]
  it('every defined body is exactly one of stream / binary / textual / object', () => {
    for (const b of bodies) {
      const hits = [
        ResponseUtils.isStream(b),
        ResponseUtils.isBinary(b),
        ResponseUtils.isTextual(b),
        ResponseUtils.isObject(b),
      ].filter(Boolean)
      expect(hits).toHaveLength(1)
    }
  })
  it('undefined matches none of the four classifiers', () => {
    expect(ResponseUtils.isStream(undefined)).toBe(false)
    expect(ResponseUtils.isBinary(undefined)).toBe(false)
    expect(ResponseUtils.isTextual(undefined)).toBe(false)
    expect(ResponseUtils.isObject(undefined)).toBe(false)
  })
})
