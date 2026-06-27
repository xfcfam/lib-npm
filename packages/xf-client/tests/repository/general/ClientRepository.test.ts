import { describe, it, expect } from 'vitest'
import { ClientRepository, ClientException, ConnectionException } from '../../../index'

class EchoClient extends ClientRepository<{ n: number }, { n: number }> {
  protected async send(request: { n: number }) { return { n: request.n * 2 } }
}

describe('ClientRepository — outbound pipeline', () => {
  it('runs onRequest → send → onResponse', async () => {
    const c = new EchoClient(); await c.init()
    expect(await c.call({ n: 3 })).toEqual({ n: 6 })
  })

  it('onRequest transforms the request before send', async () => {
    class C extends EchoClient { override async onRequest(r: { n: number }) { return { n: r.n + 1 } } }
    const c = new C(); await c.init()
    expect(await c.call({ n: 1 })).toEqual({ n: 4 }) // (1+1)*2
  })

  it('onResponse transforms the response after send', async () => {
    class C extends EchoClient { override async onResponse(_r: { n: number }, res: { n: number }) { return { n: res.n + 100 } } }
    const c = new C(); await c.init()
    expect(await c.call({ n: 2 })).toEqual({ n: 104 }) // 2*2 + 100
  })

  it('rethrows by default; onError can recover', async () => {
    class Failing extends ClientRepository<number, number> {
      protected async send(): Promise<number> { throw new ConnectionException(new Error('x'), 'network') }
    }
    const f = new Failing(); await f.init()
    await expect(f.call(1)).rejects.toBeInstanceOf(ConnectionException)

    class Recovering extends Failing { override async onError() { return -1 } }
    const r = new Recovering(); await r.init()
    expect(await r.call(1)).toBe(-1)
  })

  it('exposes ClientException and ConnectionException', () => {
    expect(new ClientException('m').body).toBeUndefined()
    expect(new ConnectionException(new Error(), 'timeout').kind).toBe('timeout')
  })
})
