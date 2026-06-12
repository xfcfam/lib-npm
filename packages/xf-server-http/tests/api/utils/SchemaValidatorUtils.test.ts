import { describe, it, expect } from 'vitest'
import { SchemaValidatorUtils, BadRequestException, type Schema } from '../../../index'

// A schema that always succeeds, echoing back a transformed value.
const ok = <T>(out: T): Schema<T> => ({ safeParse: () => ({ success: true, data: out }) })
// A schema that always fails, with a configurable error shape.
const fail = <T>(error: unknown): Schema<T> => ({ safeParse: () => ({ success: false, error }) })

describe('SchemaValidatorUtils.parse', () => {
  it('returns the parsed data on success', () => {
    const result = SchemaValidatorUtils.parse(ok({ id: 1, name: 'A' }), { raw: true })
    expect(result).toEqual({ id: 1, name: 'A' })
  })

  it('throws BadRequestException carrying the issue list on failure', () => {
    const schema = fail({ issues: [{ path: ['name'], message: 'required' }] })
    expect(() => SchemaValidatorUtils.parse(schema, {})).toThrow(BadRequestException)
    try {
      SchemaValidatorUtils.parse(schema, {})
    } catch (e) {
      const err = e as BadRequestException
      expect(err.status).toBe(400)
      expect(err.body).toEqual({ errors: [{ path: ['name'], message: 'required' }] })
    }
  })

  it('wraps a message-only error into a single issue', () => {
    const schema = fail({ message: 'totally invalid' })
    try {
      SchemaValidatorUtils.parse(schema, {})
    } catch (e) {
      expect((e as BadRequestException).body).toEqual({ errors: [{ message: 'totally invalid' }] })
    }
  })

  it('yields an empty issue list when the error is null/undefined', () => {
    try {
      SchemaValidatorUtils.parse(fail(null), {})
    } catch (e) {
      expect((e as BadRequestException).body).toEqual({ errors: [] })
    }
  })
})

describe('SchemaValidatorUtils.tryParse', () => {
  it('returns the data on success', () => {
    expect(SchemaValidatorUtils.tryParse(ok(42), 'whatever')).toBe(42)
  })
  it('returns null on failure instead of throwing', () => {
    expect(SchemaValidatorUtils.tryParse(fail({ issues: [] }), {})).toBeNull()
  })
})
