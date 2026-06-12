import { describe, it, expect } from 'vitest'
import { ServerException } from '../../../index'

describe('ServerException', () => {
  it('carries the message on the Error and a default body of { message }', () => {
    const err = new ServerException('boom')
    expect(err).toBeInstanceOf(Error)
    expect(err.message).toBe('boom')
    expect(err.body).toEqual({ message: 'boom' })
  })

  it('uses an explicit body when one is provided', () => {
    const err = new ServerException('nope', { code: 'X1', detail: 'why' })
    expect(err.body).toEqual({ code: 'X1', detail: 'why' })
    // The message is still the human-readable Error message.
    expect(err.message).toBe('nope')
  })

  it('keeps a falsy-but-present body verbatim only when not undefined', () => {
    // `body ?? { message }` — null is replaced, but other falsy values stay.
    expect(new ServerException('a', null as unknown as object).body).toEqual({ message: 'a' })
    expect(new ServerException('b', 0 as unknown as object).body).toBe(0)
    expect(new ServerException('c', '' as unknown as object).body).toBe('')
    expect(new ServerException('d', false as unknown as object).body).toBe(false)
  })

  it('sets the name to ServerException', () => {
    expect(new ServerException('x').name).toBe('ServerException')
  })

  it('can be thrown and caught as an Error', () => {
    expect(() => {
      throw new ServerException('thrown', { k: 'v' })
    }).toThrow('thrown')
    try {
      throw new ServerException('thrown', { k: 'v' })
    } catch (e) {
      expect((e as ServerException).body).toEqual({ k: 'v' })
    }
  })
})
