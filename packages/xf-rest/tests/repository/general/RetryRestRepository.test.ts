import { describe, it, expect, beforeEach, vi } from 'vitest'
import { RetryRestRepository, RestException, ConnectionException, type Request } from '../../../index'

// We mock ky at the module level so RestRepository's ky.create returns a
// controllable function. Each test can program the response sequence.
vi.mock('ky', () => {
  // ky v2: HTTPError keeps `response` (for status/headers) and adds a
  // pre-parsed `data` property (the consumed body). Tests pass `data`
  // explicitly since the mock can't async-parse the Response body.
  const HTTPError = class extends Error {
    response: Response
    data: unknown
    constructor(r: Response, data?: unknown) { super('http'); this.response = r; this.data = data }
  }
  const TimeoutError = class extends Error {}
  // The current mock instance — re-assigned per test via __set
  let mockFn: ((path: string, opts?: any) => Promise<Response>) | undefined
  return {
    default: {
      create: () => async (path: string, opts?: any) => {
        if (mockFn === undefined) throw new Error('ky mock not configured')
        return mockFn(path, opts)
      },
    },
    HTTPError,
    TimeoutError,
    __setMock: (fn: typeof mockFn) => { mockFn = fn },
  }
})

import * as kyMod from 'ky'

class UsersRest extends RetryRestRepository {
  constructor() { super('https://api.example.com') }
  async getUser(id: string) {
    return this.withRetry(() => this.get(`/users/${id}`),
                          { maxAttempts: 5, baseMs: 1, factor: 1, jitter: false })
  }
}

const fakeRequest: Request = { method: 'GET', path: '/users/x' }

describe('RetryRestRepository — default shouldRetry policy', () => {
  let repo: UsersRest
  beforeEach(async () => {
    repo = new UsersRest()
    await repo.init()
  })

  it('retries on RestException with status >= 500', () => {
    const shouldRetry = (repo as any).shouldRetry.bind(repo)
    expect(shouldRetry(new RestException(500, 'x', null, fakeRequest))).toBe(true)
    expect(shouldRetry(new RestException(503, 'x', null, fakeRequest))).toBe(true)
    expect(shouldRetry(new RestException(599, 'x', null, fakeRequest))).toBe(true)
  })

  it('retries on RestException with status 429 (Too Many Requests)', () => {
    const shouldRetry = (repo as any).shouldRetry.bind(repo)
    expect(shouldRetry(new RestException(429, 'x', null, fakeRequest))).toBe(true)
  })

  it('does NOT retry on other 4xx', () => {
    const shouldRetry = (repo as any).shouldRetry.bind(repo)
    expect(shouldRetry(new RestException(400, 'x', null, fakeRequest))).toBe(false)
    expect(shouldRetry(new RestException(401, 'x', null, fakeRequest))).toBe(false)
    expect(shouldRetry(new RestException(403, 'x', null, fakeRequest))).toBe(false)
    expect(shouldRetry(new RestException(404, 'x', null, fakeRequest))).toBe(false)
  })

  it('retries on ConnectionException (timeout or network)', () => {
    const shouldRetry = (repo as any).shouldRetry.bind(repo)
    expect(shouldRetry(new ConnectionException(new Error(), fakeRequest, 'timeout'))).toBe(true)
    expect(shouldRetry(new ConnectionException(new Error(), fakeRequest, 'network'))).toBe(true)
  })

  it('does NOT retry on programming errors or unrelated throws', () => {
    const shouldRetry = (repo as any).shouldRetry.bind(repo)
    expect(shouldRetry(new TypeError('bug'))).toBe(false)
    expect(shouldRetry('not even an error')).toBe(false)
    expect(shouldRetry(undefined)).toBe(false)
  })
})

describe('RetryRestRepository — actual retry behavior', () => {
  it('retries 500 responses until success', async () => {
    let attempt = 0
    const { HTTPError, __setMock } = kyMod as any
    __setMock(async () => {
      attempt++
      if (attempt < 3) {
        throw new HTTPError(new Response('{}', {
          status: 500, statusText: 'Internal',
          headers: { 'content-type': 'application/json' },
        }), {})
      }
      return new Response(JSON.stringify({ id: 'u1' }), {
        status: 200, headers: { 'content-type': 'application/json' },
      })
    })
    const repo = new UsersRest()
    await repo.init()
    const user = await repo.getUser('u1')
    expect((user as any).id).toBe('u1')
    expect(attempt).toBe(3)
    await repo.terminate()
  })

  it('does NOT retry on a 404', async () => {
    let attempt = 0
    const { HTTPError, __setMock } = kyMod as any
    __setMock(async () => {
      attempt++
      throw new HTTPError(new Response('{"err":"not found"}', {
        status: 404, statusText: 'Not Found',
        headers: { 'content-type': 'application/json' },
      }), { err: 'not found' })
    })
    const repo = new UsersRest()
    await repo.init()
    await expect(repo.getUser('missing')).rejects.toBeInstanceOf(RestException)
    expect(attempt).toBe(1)
    await repo.terminate()
  })
})

describe('RestRepository — HTTPError body reads from ky v2 `data`', () => {
  it('populates RestException.body from err.data', async () => {
    const { HTTPError, __setMock } = kyMod as any
    __setMock(async () => {
      throw new HTTPError(
        new Response('{"error":"invalid"}', {
          status: 422, statusText: 'Unprocessable Entity',
          headers: { 'content-type': 'application/json' },
        }),
        { error: 'invalid' },
      )
    })
    const repo = new UsersRest()
    await repo.init()
    try {
      await repo.getUser('x')
      throw new Error('should have thrown a RestException')
    } catch (e) {
      expect(e).toBeInstanceOf(RestException)
      const ex = e as RestException
      expect(ex.status).toBe(422)
      expect(ex.statusText).toBe('Unprocessable Entity')
      expect(ex.body).toEqual({ error: 'invalid' })
    }
    await repo.terminate()
  })

  it('leaves body undefined when err.data is undefined (empty error body)', async () => {
    const { HTTPError, __setMock } = kyMod as any
    __setMock(async () => {
      throw new HTTPError(
        new Response(null, { status: 400, statusText: 'Bad Request' }),
        undefined,
      )
    })
    const repo = new UsersRest()
    await repo.init()
    try {
      await repo.getUser('x')
      throw new Error('should have thrown a RestException')
    } catch (e) {
      expect((e as RestException).status).toBe(400)
      expect((e as RestException).body).toBeUndefined()
    }
    await repo.terminate()
  })
})
