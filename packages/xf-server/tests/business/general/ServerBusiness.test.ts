import { describe, it, expect } from 'vitest'
import { ServerBusiness, type Route } from '../../../index'

// ── Minimal concrete server used to exercise the transport-agnostic
//    pipeline. Addresses are strings, requests/responses are tiny
//    records. The transport methods are no-ops; we only test the
//    registry + dispatch logic the core owns.
interface Req { n: number }
interface Res { out: number }

class TestServer extends ServerBusiness<string, Req, Res> {
  // Optional hooks, toggled per test via the public setters below.
  onReq?: (r: Req) => Promise<Req> | Req
  onRes?: (req: Req, r: Res) => Promise<Res> | Res
  onErr?: (req: Req, e: unknown) => Promise<Res | undefined> | Res | undefined
  registered: Array<Route<string, Req, Res>> = []

  constructor() {
    super({ routes: [] })
  }

  async listen(): Promise<void> {}
  async close(): Promise<void> {}

  // Expose the protected surface for testing.
  add(address: string, handler: (r: Req) => Promise<Res> | Res): void {
    this.register(address, handler)
  }
  get routeList(): ReadonlyArray<Route<string, Req, Res>> {
    return this.routes
  }
  run(
    req: Req,
    handler: (r: Req) => Promise<Res> | Res,
    errorToResponse: (e: unknown) => Res,
  ): Promise<Res> {
    return this.dispatch(req, handler, errorToResponse)
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
  override async onRegister(route: Route<string, Req, Res>): Promise<void> {
    this.registered.push(route)
  }
}

const E2R = (): Res => ({ out: -1 }) // sentinel "internal error" response

describe('ServerBusiness — route registry', () => {
  it('records pushed routes in order and exposes them read-only', () => {
    const s = new TestServer()
    const h1 = async () => ({ out: 1 })
    const h2 = async () => ({ out: 2 })
    s.add('a', h1)
    s.add('b', h2)
    expect(s.routeList).toHaveLength(2)
    expect(s.routeList[0]).toEqual({ address: 'a', handler: h1 })
    expect(s.routeList[1]!.address).toBe('b')
  })

  it('notifies onRegister for every pushed route', () => {
    const s = new TestServer()
    s.add('x', async () => ({ out: 0 }))
    expect(s.registered).toHaveLength(1)
    expect(s.registered[0]!.address).toBe('x')
  })
})

describe('ServerBusiness — dispatch pipeline', () => {
  it('runs onRequest → handler → onResponse on the happy path', async () => {
    const s = new TestServer()
    const res = await s.run({ n: 2 }, (r) => ({ out: r.n * 10 }), E2R)
    expect(res).toEqual({ out: 20 })
  })

  it('lets onRequest replace the request the handler sees', async () => {
    const s = new TestServer()
    s.onReq = (r) => ({ n: r.n + 100 })
    const res = await s.run({ n: 1 }, (r) => ({ out: r.n }), E2R)
    expect(res).toEqual({ out: 101 })
  })

  it('lets onResponse replace the handler response', async () => {
    const s = new TestServer()
    s.onRes = (_req, r) => ({ out: r.out + 1 })
    const res = await s.run({ n: 5 }, (r) => ({ out: r.n }), E2R)
    expect(res).toEqual({ out: 6 })
  })

  it('routes a handler error to onError and returns its response when defined', async () => {
    const s = new TestServer()
    s.onErr = () => ({ out: 999 })
    const res = await s.run(
      { n: 1 },
      () => { throw new Error('handler boom') },
      E2R,
    )
    expect(res).toEqual({ out: 999 })
  })

  it('falls back to errorToResponse when onError returns undefined', async () => {
    const s = new TestServer()
    s.onErr = () => undefined
    const res = await s.run(
      { n: 1 },
      () => { throw new Error('unhandled') },
      E2R,
    )
    expect(res).toEqual({ out: -1 })
  })

  it('catches an error thrown by onRequest (before the handler runs)', async () => {
    const s = new TestServer()
    let handlerRan = false
    s.onReq = () => { throw new Error('onRequest boom') }
    const res = await s.run(
      { n: 1 },
      () => { handlerRan = true; return { out: 0 } },
      E2R,
    )
    expect(handlerRan).toBe(false)
    expect(res).toEqual({ out: -1 })
  })

  it('passes the thrown error through to errorToResponse', async () => {
    const s = new TestServer()
    const seen: unknown[] = []
    await s.run(
      { n: 1 },
      () => { throw new Error('capture me') },
      (e) => { seen.push(e); return { out: 0 } },
    )
    expect(seen).toHaveLength(1)
    expect((seen[0] as Error).message).toBe('capture me')
  })
})
