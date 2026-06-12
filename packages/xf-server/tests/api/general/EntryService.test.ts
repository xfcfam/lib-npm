import { describe, it, expect } from 'vitest'
import { EntryService } from '../../../index'

interface Req { n: number }
interface Res { out: number }

class TestService extends EntryService<Req, Res> {
  onReq?: (r: Req) => Promise<Req> | Req
  onRes?: (req: Req, r: Res) => Promise<Res> | Res
  onErr?: (req: Req, e: unknown) => Promise<Res | undefined> | Res | undefined
  marker = 7 // proves the wrapped handler is bound to `this`

  // Expose wrap for testing.
  build(handler: (r: Req) => Promise<Res> | Res) {
    return this.wrap(handler)
  }

  // A handler that reads instance state — only works if bound to `this`.
  boundHandler(r: Req): Res {
    return { out: r.n + this.marker }
  }

  override async onRequest(r: Req): Promise<Req> {
    return this.onReq ? this.onReq(r) : r
  }
  override async onResponse(req: Req, r: Res): Promise<Res> {
    return this.onRes ? this.onRes(req, r) : r
  }
  override async onError(req: Req, e: unknown): Promise<Res | undefined> {
    return this.onErr ? this.onErr(req, e) : undefined
  }
}

describe('EntryService.wrap — per-service pipeline', () => {
  it('runs onRequest → handler → onResponse', async () => {
    const s = new TestService()
    const wrapped = s.build((r) => ({ out: r.n * 2 }))
    expect(await wrapped({ n: 3 })).toEqual({ out: 6 })
  })

  it('binds the handler to the service instance', async () => {
    const s = new TestService()
    const wrapped = s.build(s.boundHandler)
    // marker (7) is read from `this`; 4 + 7 = 11
    expect(await wrapped({ n: 4 })).toEqual({ out: 11 })
  })

  it('applies onRequest then onResponse around the handler', async () => {
    const s = new TestService()
    s.onReq = (r) => ({ n: r.n + 1 })
    s.onRes = (_req, r) => ({ out: r.out * 10 })
    const wrapped = s.build((r) => ({ out: r.n }))
    // (1 + 1) -> handler -> 2 -> *10 -> 20
    expect(await wrapped({ n: 1 })).toEqual({ out: 20 })
  })

  it('translates a thrown error when onError returns a response', async () => {
    const s = new TestService()
    s.onErr = () => ({ out: -42 })
    const wrapped = s.build(() => { throw new Error('boom') })
    expect(await wrapped({ n: 0 })).toEqual({ out: -42 })
  })

  it('re-throws when onError returns undefined (delegates to the server)', async () => {
    const s = new TestService()
    s.onErr = () => undefined
    const wrapped = s.build(() => { throw new Error('delegate me') })
    await expect(wrapped({ n: 0 })).rejects.toThrow('delegate me')
  })
})
