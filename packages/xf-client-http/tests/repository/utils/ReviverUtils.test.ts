import { describe, it, expect } from 'vitest'
import { ReviverUtils, type Reviver } from '../../../index'

describe('ReviverUtils.isoDateReviver', () => {
  it('turns an ISO 8601 datetime string into a Date', () => {
    const out = ReviverUtils.isoDateReviver('createdAt', '2026-05-16T12:34:56Z')
    expect(out).toBeInstanceOf(Date)
    expect((out as Date).getUTCFullYear()).toBe(2026)
  })

  it('turns an ISO 8601 date-only string into a Date', () => {
    expect(ReviverUtils.isoDateReviver('d', '2026-05-16')).toBeInstanceOf(Date)
  })

  it('handles datetime with milliseconds and offset', () => {
    expect(ReviverUtils.isoDateReviver('d', '2026-05-16T12:34:56.789+01:00')).toBeInstanceOf(Date)
  })

  it('leaves non-ISO strings untouched', () => {
    expect(ReviverUtils.isoDateReviver('name', 'not-a-date')).toBe('not-a-date')
    expect(ReviverUtils.isoDateReviver('s', '2026/05/16')).toBe('2026/05/16')
  })

  it('leaves non-string values untouched', () => {
    expect(ReviverUtils.isoDateReviver('n', 42)).toBe(42)
    expect(ReviverUtils.isoDateReviver('b', true)).toBe(true)
    expect(ReviverUtils.isoDateReviver('z', null)).toBeNull()
  })
})

describe('ReviverUtils.walkReviver', () => {
  it('walks a flat object and applies the reviver to every leaf', () => {
    const tree = { a: 'x', b: 'y' }
    const upper: Reviver = (_k, v) => typeof v === 'string' ? v.toUpperCase() : v
    expect(ReviverUtils.walkReviver(tree, upper)).toEqual({ a: 'X', b: 'Y' })
  })

  it('walks a nested object and revives Date leaves', () => {
    const tree = {
      id: '1',
      createdAt: '2026-05-16T12:34:56Z',
      items: [
        { sku: 'A', updatedAt: '2026-01-01T00:00:00Z' },
        { sku: 'B', updatedAt: 'never' },
      ],
    }
    const out: any = ReviverUtils.walkReviver(tree, ReviverUtils.isoDateReviver)
    expect(out.id).toBe('1')
    expect(out.createdAt).toBeInstanceOf(Date)
    expect(out.items[0].updatedAt).toBeInstanceOf(Date)
    expect(out.items[1].updatedAt).toBe('never')
  })

  it('handles arrays at the root', () => {
    const tree = ['a', 'b', 'c']
    const upper: Reviver = (_k, v) => typeof v === 'string' ? v.toUpperCase() : v
    expect(ReviverUtils.walkReviver(tree, upper)).toEqual(['A', 'B', 'C'])
  })

  it('handles primitive at the root', () => {
    expect(ReviverUtils.walkReviver(42, (_, v) => v)).toBe(42)
    expect(ReviverUtils.walkReviver(null, (_, v) => v)).toBeNull()
  })
})

describe('ReviverUtils.composeRevivers', () => {
  it('applies revivers left-to-right', () => {
    const a: Reviver = (_, v) => typeof v === 'string' ? v + '-a' : v
    const b: Reviver = (_, v) => typeof v === 'string' ? v + '-b' : v
    expect(ReviverUtils.composeRevivers(a, b)('k', 'x')).toBe('x-a-b')
  })

  it('downstream revivers see upstream transformations', () => {
    // isoDateReviver outputs a Date; upper only acts on strings.
    const upper: Reviver = (_, v) => typeof v === 'string' ? v.toUpperCase() : v
    const composed = ReviverUtils.composeRevivers(ReviverUtils.isoDateReviver, upper)
    // For an ISO date string: isoDateReviver returns Date → upper skips
    expect(composed('k', '2026-05-16T12:34:56Z')).toBeInstanceOf(Date)
    // For a non-date string: isoDateReviver passes through → upper transforms
    expect(composed('k', 'hello')).toBe('HELLO')
  })

  it('works with a single reviver', () => {
    const r: Reviver = (_, v) => v
    expect(ReviverUtils.composeRevivers(r)('k', 42)).toBe(42)
  })

  it('works with zero revivers (identity)', () => {
    expect(ReviverUtils.composeRevivers()('k', 'x')).toBe('x')
  })
})
