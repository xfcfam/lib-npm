import { describe, it, expect, beforeEach, vi } from 'vitest'
import { RestRepository, type RestOptions, type Serializer } from '../../../index'

// Mock ky so we can capture the options object RestRepository builds and
// assert how the request body was encoded onto it.
vi.mock('ky', () => {
  const HTTPError = class extends Error {
    response: Response
    data: unknown
    constructor(r: Response, data?: unknown) { super('http'); this.response = r; this.data = data }
  }
  const TimeoutError = class extends Error {}
  let lastOpts: any
  return {
    default: {
      create: () => async (_path: string, opts?: any) => {
        lastOpts = opts
        return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } })
      },
    },
    HTTPError,
    TimeoutError,
    __lastOpts: () => lastOpts,
  }
})

import * as kyMod from 'ky'
const lastOpts = () => (kyMod as any).__lastOpts()

class TestRepo extends RestRepository {
  constructor(options?: RestOptions) { super('https://api.example.com', options) }
}

describe('RestRepository — agnostic request body encoding', () => {
  let repo: TestRepo
  beforeEach(async () => { repo = new TestRepo(); await repo.init() })

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
      headers: { 'content-type': 'application/x-www-form-urlencoded' }, // lower-case header too
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
