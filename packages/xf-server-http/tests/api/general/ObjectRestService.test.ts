import { describe, it, expect } from 'vitest'
import {
  ObjectRestService,
  BadRequestException,
  type HttpRequest,
  type HttpResponse,
} from '../../../index'

// Concrete subclass exposing the protected parse/serialize/pipeline
// surface so the pure transformation logic can be tested directly.
class TestService extends ObjectRestService {
  parse(req: HttpRequest): Promise<HttpRequest> {
    return this.parseRequestBody(req)
  }
  serialize(res: HttpResponse): HttpResponse {
    return this.serializeResponseBody(res)
  }
  pipeline(handler: (req: HttpRequest) => Promise<HttpResponse> | HttpResponse) {
    // `object()` is protected; expose it for an end-to-end test.
    return (this as unknown as { object: (h: typeof handler) => (r: HttpRequest) => Promise<HttpResponse> }).object(handler)
  }
}

const enc = (o: unknown): Uint8Array => new TextEncoder().encode(JSON.stringify(o))
const decode = (b: unknown): string => new TextDecoder().decode(b as Uint8Array)
const req = (body: unknown, contentType?: string): HttpRequest =>
  ({ headers: contentType ? { 'content-type': contentType } : {}, body } as unknown as HttpRequest)

describe('ObjectRestService.dateReviver (static)', () => {
  it('revives full ISO-8601 timestamps into Date', () => {
    const d = ObjectRestService.dateReviver('k', '2026-01-02T03:04:05.000Z')
    expect(d).toBeInstanceOf(Date)
    expect((d as Date).toISOString()).toBe('2026-01-02T03:04:05.000Z')
  })
  it('revives date-only ISO strings', () => {
    expect(ObjectRestService.dateReviver('k', '2026-01-02')).toBeInstanceOf(Date)
  })
  it('leaves non-ISO strings untouched', () => {
    expect(ObjectRestService.dateReviver('k', '2026/01/02')).toBe('2026/01/02')
    expect(ObjectRestService.dateReviver('k', 'hello')).toBe('hello')
  })
  it('leaves ISO-shaped but invalid dates as the original string', () => {
    expect(ObjectRestService.dateReviver('k', '2026-13-45')).toBe('2026-13-45')
  })
  it('leaves non-string values untouched', () => {
    expect(ObjectRestService.dateReviver('k', 5)).toBe(5)
    expect(ObjectRestService.dateReviver('k', null)).toBeNull()
  })
})

describe('ObjectRestService.serializeResponseBody — date formatting', () => {
  const when = new Date('2026-01-02T03:04:05.000Z')

  it('defaults to ISO-8601', () => {
    const svc = new TestService()
    const out = svc.serialize({ status: 200, body: { when } })
    expect(JSON.parse(decode(out.body))).toEqual({ when: '2026-01-02T03:04:05.000Z' })
    expect(out.headers!['content-type']).toBe('application/json')
  })

  it('applies a developer-chosen date-only formatter, deeply (nested + arrays)', () => {
    const svc = new TestService({ formatDate: (d) => d.toISOString().slice(0, 10) })
    const out = svc.serialize({
      status: 200,
      body: { a: { when }, list: [{ when }, { other: 1 }] },
    })
    expect(JSON.parse(decode(out.body))).toEqual({
      a: { when: '2026-01-02' },
      list: [{ when: '2026-01-02' }, { other: 1 }],
    })
  })

  it('applies an epoch-millis formatter', () => {
    const svc = new TestService({ formatDate: (d) => String(d.getTime()) })
    const out = svc.serialize({ status: 200, body: { when } })
    expect(JSON.parse(decode(out.body))).toEqual({ when: String(when.getTime()) })
  })
})

describe('ObjectRestService.serializeResponseBody — pass-through cases', () => {
  const svc = new TestService()
  it('passes a string body through unchanged', () => {
    const res = { status: 200, body: 'plain text' }
    expect(svc.serialize(res)).toBe(res)
  })
  it('passes a Uint8Array body through unchanged', () => {
    const res = { status: 200, body: new Uint8Array([1, 2, 3]) }
    expect(svc.serialize(res)).toBe(res)
  })
  it('passes null / undefined bodies through unchanged', () => {
    const a = { status: 204, body: null } as unknown as HttpResponse
    const b = { status: 204 } as HttpResponse
    expect(svc.serialize(a)).toBe(a)
    expect(svc.serialize(b)).toBe(b)
  })
  it('falls back to JSON when the explicit content-type has no serializer', () => {
    const out = svc.serialize({ status: 200, headers: { 'content-type': 'application/xml' }, body: { a: 1 } })
    expect(out.headers!['content-type']).toBe('application/json')
    expect(JSON.parse(decode(out.body))).toEqual({ a: 1 })
  })
})

describe('ObjectRestService.parseRequestBody', () => {
  it('parses a JSON body to an object', async () => {
    const svc = new TestService()
    const out = await svc.parse(req(enc({ a: 1, b: 'two' }), 'application/json'))
    expect(out.body).toEqual({ a: 1, b: 'two' })
  })

  it('treats an empty byte body as null', async () => {
    const svc = new TestService()
    const out = await svc.parse(req(new Uint8Array(), 'application/json'))
    expect(out.body).toBeNull()
  })

  it('passes raw bytes through for an unknown content-type', async () => {
    const svc = new TestService()
    const raw = new Uint8Array([5, 6, 7])
    const out = await svc.parse(req(raw, 'application/octet-stream'))
    expect(out.body).toBe(raw)
  })

  it('throws BadRequestException on malformed JSON', async () => {
    const svc = new TestService()
    const bad = new TextEncoder().encode('{not json')
    await expect(svc.parse(req(bad, 'application/json'))).rejects.toBeInstanceOf(BadRequestException)
  })

  it('matches the content-type case-insensitively and ignores ;charset params', async () => {
    const svc = new TestService()
    const out = await svc.parse(req(enc({ ok: true }), 'Application/JSON; charset=utf-8'))
    expect(out.body).toEqual({ ok: true })
  })

  it('revives dates when reviveDates is enabled', async () => {
    const svc = new TestService({ reviveDates: true })
    const out = await svc.parse(req(enc({ when: '2026-01-02T03:04:05.000Z' }), 'application/json'))
    expect((out.body as { when: Date }).when).toBeInstanceOf(Date)
  })

  it('does NOT revive dates by default', async () => {
    const svc = new TestService()
    const out = await svc.parse(req(enc({ when: '2026-01-02T03:04:05.000Z' }), 'application/json'))
    expect(typeof (out.body as { when: unknown }).when).toBe('string')
  })

  it('passes a multipart array body through unchanged', async () => {
    const svc = new TestService()
    const parts = [{ name: 'file', data: new Uint8Array([1]) }]
    const out = await svc.parse(req(parts, 'multipart/form-data'))
    expect(out.body).toBe(parts)
  })
})

describe('ObjectRestService.object — full parse → handle → serialize pipeline', () => {
  it('parses the request, runs the handler, and serialises the response', async () => {
    const svc = new TestService()
    const handler = svc.pipeline((r) => ({ status: 201, body: { echoed: (r.body as { name: string }).name } }))
    const out = await handler(req(enc({ name: 'Ada' }), 'application/json'))
    expect(out.status).toBe(201)
    expect(JSON.parse(decode(out.body))).toEqual({ echoed: 'Ada' })
  })

  it('routes a thrown BadRequestException via onError back out of the pipeline', async () => {
    const svc = new TestService()
    const handler = svc.pipeline(() => { throw new BadRequestException('nope') })
    await expect(handler(req(enc({}), 'application/json'))).rejects.toBeInstanceOf(BadRequestException)
  })
})
