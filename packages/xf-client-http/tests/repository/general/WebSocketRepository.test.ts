import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { WebSocketRepository } from '../../../index'

class FakeWS {
  static CONNECTING = 0; static OPEN = 1; static CLOSING = 2; static CLOSED = 3
  static instances: FakeWS[] = []
  url: string; protocols: unknown; readyState = 0; binaryType = 'blob'
  sent: unknown[] = []
  private listeners: Record<string, Array<(ev: any) => void>> = {}
  constructor(url: string, protocols?: unknown) {
    this.url = url; this.protocols = protocols; FakeWS.instances.push(this)
    queueMicrotask(() => { this.readyState = 1; this.emit('open', {}) })
  }
  addEventListener(t: string, l: (ev: any) => void): void { (this.listeners[t] ??= []).push(l) }
  removeEventListener(t: string, l: (ev: any) => void): void { this.listeners[t] = (this.listeners[t] ?? []).filter(x => x !== l) }
  emit(t: string, ev: any): void { for (const l of this.listeners[t] ?? []) l(ev) }
  send(d: unknown): void { this.sent.push(d) }
  close(code?: number, reason?: string): void { this.readyState = 3; this.emit('close', { code: code ?? 1000, reason: reason ?? '' }) }
}

class Chat extends WebSocketRepository {
  constructor() { super('wss://api.example.com') }
  async open() { return this.connect('/chat', 'json') }
}

describe('WebSocketRepository', () => {
  beforeEach(() => { FakeWS.instances = []; vi.stubGlobal('WebSocket', FakeWS) })
  afterEach(() => { vi.unstubAllGlobals() })

  it('connects to baseUrl + path and resolves an open connection', async () => {
    const repo = new Chat(); await repo.init()
    const conn = await repo.open()
    const sock = FakeWS.instances.at(-1)!
    expect(sock.url).toBe('wss://api.example.com/chat')
    expect(sock.protocols).toBe('json')
    expect(conn.readyState).toBe(FakeWS.OPEN)
  })

  it('routes inbound text/binary frames and outbound send/close', async () => {
    const repo = new Chat(); await repo.init()
    const conn = await repo.open()
    const sock = FakeWS.instances.at(-1)!
    const got: Array<string | Uint8Array> = []
    conn.onMessage((d) => got.push(d))
    sock.emit('message', { data: 'hello' })
    sock.emit('message', { data: new ArrayBuffer(3) })
    expect(got[0]).toBe('hello')
    expect(got[1]).toBeInstanceOf(Uint8Array)

    conn.send('ping')
    expect(sock.sent).toContain('ping')

    let closed: { code: number; reason: string } | undefined
    conn.onClose((code, reason) => { closed = { code, reason } })
    conn.close(1001, 'bye')
    expect(closed).toEqual({ code: 1001, reason: 'bye' })
  })
})
