import { describe, it, expect, beforeEach, vi } from 'vitest'
import { RestRepository, RestException, type RestOptions, type Serializer } from '../../../index'

// Mock ky so we can capture the options object RestRepository builds, program the
// response (or an error), and assert both the request encoding and the returned HttpResponse.
const { state } = vi.hoisted(() => ({
  state: { opts: undefined as any, response: undefined as any, error: undefined as any },
}))
vi.mock('ky', () => {
  const HTTPError = class extends Error {
    response: Response
    data: unknown
    constructor(r: Response, data?: unknown) { super('http'); this.response = r; this.data = data }
  }
  const TimeoutError = class extends Error {}
  return {
    default: {
      create: () => async (_path: string, opts?: any) => {
        state.opts = opts
        if (state.error !== undefined) throw state.error
        return state.response ?? new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } })
      },
    },
    HTTPError, TimeoutError, __HTTPError: HTTPError,
  }
})

import * as kyMod from 'ky'
const lastOpts = () => state.opts

class TestRepo extends RestRepository {
  constructor(options?: RestOptions) { super('https://api.example.com', options) }
}

describe('RestRepository — agnostic request body encoding', () => {
  let repo: TestRepo
  beforeEach(async () => { state.response = undefined; state.error = undefined; repo = new TestRepo(); await repo.init() })

  it('defaults a plain object to JSON (ky `json` channel)', async () => {
    await repo.call({ method: 'POST', path: '/x', body: { a: 1 } })
    expect(lastOpts().json).toEqual({ a: 1 })
    expect(lastOpts().body).toBeUndefined()
  })

  it('sends URLSearchParams as a raw form body when Content-Type is form-urlencoded', async () => {
    const params = new URLSearchParams({ grant_type: 'client_credentials' })
    await repo.call({
      method: 'POST', path: '/token',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
    })
    expect(lastOpts().json).toBeUndefined()
    expect(lastOpts().body).toBeInstanceOf(URLSearchParams)
    expect((lastOpts().body as URLSearchParams).toString()).toBe('grant_type=client_credentials')
  })

  it('form-encodes a plain object when Content-Type is form-urlencoded', async () => {
    await repo.call({
      method: 'POST', path: '/token',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: { a: '1', b: 2 },
    })
    expect(lastOpts().json).toBeUndefined()
    expect((lastOpts().body as URLSearchParams).toString()).toBe('a=1&b=2')
  })

  it('passes an already-encoded body (URLSearchParams) through even without a Content-Type', async () => {
    const params = new URLSearchParams({ a: '1' })
    await repo.call({ method: 'POST', path: '/x', body: params })
    expect(lastOpts().json).toBeUndefined()
    expect(lastOpts().body).toBe(params)
  })

  it('sends a string body verbatim under text/*', async () => {
    await repo.call({ method: 'POST', path: '/x', headers: { 'Content-Type': 'text/plain' }, body: 'hello' })
    expect(lastOpts().json).toBeUndefined()
    expect(lastOpts().body).toBe('hello')
  })

  it('uses a user-registered serializer for a custom Content-Type', async () => {
    const xml: Serializer = (b) => `<v>${(b as any).v}</v>`
    const r = new TestRepo({ serializers: { 'application/xml': xml } })
    await r.init()
    await r.call({ method: 'POST', path: '/x', headers: { 'Content-Type': 'application/xml' }, body: { v: 7 } })
    expect(lastOpts().json).toBeUndefined()
    expect(lastOpts().body).toBe('<v>7</v>')
  })
})

describe('RestRepository — complete HttpResponse', () => {
  let repo: TestRepo
  beforeEach(async () => { state.response = undefined; state.error = undefined; repo = new TestRepo(); await repo.init() })

  it('returns { status, headers, body } with a parsed body (header-based parsing)', async () => {
    state.response = new Response(JSON.stringify({ id: 'u1' }), {
      status: 200, headers: { 'content-type': 'application/json', 'x-trace': 'abc' },
    })
    const res = await repo.get('/users/u1')
    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toContain('application/json')
    expect(res.headers['x-trace']).toBe('abc')
    expect(res.body).toEqual({ id: 'u1' })
  })

  it('returns body null for a 204 No Content', async () => {
    state.response = new Response(null, { status: 204 })
    const res = await repo.del('/users/u1')
    expect(res.status).toBe(204)
    expect(res.body).toBeNull()
  })

  it('exposes the Location header of a 201 (e.g. resource creation)', async () => {
    state.response = new Response(null, { status: 201, headers: { location: '/users/abc-123' } })
    const res = await repo.post('/users', { name: 'x' })
    expect(res.status).toBe(201)
    expect(res.headers['location']).toBe('/users/abc-123')
  })

  it('preserves streaming: body is the raw ReadableStream when request.stream is true', async () => {
    const stream = new ReadableStream<Uint8Array>({ start(c) { c.enqueue(new TextEncoder().encode('chunk')); c.close() } })
    state.response = new Response(stream, { status: 200, headers: { 'content-type': 'application/octet-stream' } })
    const res = await repo.call({ method: 'GET', path: '/download', stream: true })
    expect(res.status).toBe(200)
    expect(typeof (res.body as any).getReader).toBe('function') // a ReadableStream, not parsed/buffered
  })
})

describe('RestRepository — RestException on non-2xx carries the full response', () => {
  let repo: TestRepo
  beforeEach(async () => { state.response = undefined; state.error = undefined; repo = new TestRepo(); await repo.init() })

  it('raises RestException with status, headers and body', async () => {
    const { __HTTPError } = kyMod as any
    state.error = new __HTTPError(
      new Response('{"error":"forbidden"}', {
        status: 403, statusText: 'Forbidden',
        headers: { 'content-type': 'application/json', 'x-trace': 'xyz' },
      }),
      { error: 'forbidden' },
    )
    await expect(repo.get('/x')).rejects.toBeInstanceOf(RestException)
    try {
      await repo.get('/x')
    } catch (e) {
      const ex = e as RestException
      expect(ex.status).toBe(403)
      expect(ex.headers['x-trace']).toBe('xyz')
      expect(ex.body).toEqual({ error: 'forbidden' })
    }
  })
})
