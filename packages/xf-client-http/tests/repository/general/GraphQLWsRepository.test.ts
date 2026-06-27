import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { GraphQLWsRepository } from '../../../index'

class FakeWS {
  static OPEN = 1; static instances: FakeWS[] = []
  static onSend?: (sock: FakeWS, msg: any) => void
  url: string; protocols: unknown; readyState = 0; binaryType = 'blob'; sent: any[] = []
  private listeners: Record<string, Array<(ev: any) => void>> = {}
  constructor(url: string, protocols?: unknown) {
    this.url = url; this.protocols = protocols; FakeWS.instances.push(this)
    queueMicrotask(() => { this.readyState = 1; this.emit('open', {}) })
  }
  addEventListener(t: string, l: (ev: any) => void) { (this.listeners[t] ??= []).push(l) }
  removeEventListener(t: string, l: (ev: any) => void) { this.listeners[t] = (this.listeners[t] ?? []).filter(x => x !== l) }
  emit(t: string, ev: any) { for (const l of this.listeners[t] ?? []) l(ev) }
  send(d: any) { this.sent.push(d); FakeWS.onSend?.(this, JSON.parse(d)) }
  close() { this.readyState = 3; this.emit('close', { code: 1000, reason: '' }) }
}

class Subs extends GraphQLWsRepository {
  constructor() { super('wss://api.example.com') }
  live() { return this.open('/graphql', { authToken: 't' }) }
}

describe('GraphQLWsRepository (graphql-transport-ws)', () => {
  beforeEach(() => { FakeWS.instances = []; vi.stubGlobal('WebSocket', FakeWS) })
  afterEach(() => { FakeWS.onSend = undefined; vi.unstubAllGlobals() })

  it('handshakes, multiplexes a subscription, and delivers next/complete', async () => {
    FakeWS.onSend = (sock, msg) => {
      if (msg.type === 'connection_init') {
        expect(msg.payload).toEqual({ authToken: 't' })
        queueMicrotask(() => sock.emit('message', { data: JSON.stringify({ type: 'connection_ack' }) }))
      }
      if (msg.type === 'subscribe') {
        queueMicrotask(() => {
          sock.emit('message', { data: JSON.stringify({ id: msg.id, type: 'next', payload: { data: { count: 1 } } }) })
          sock.emit('message', { data: JSON.stringify({ id: msg.id, type: 'next', payload: { data: { count: 2 } } }) })
          sock.emit('message', { data: JSON.stringify({ id: msg.id, type: 'complete' }) })
        })
      }
    }
    const client = await new Subs().live()
    const sock = FakeWS.instances.at(-1)!
    expect(sock.protocols).toBe('graphql-transport-ws')

    const got: any[] = []
    let done = false
    client.subscribe('subscription{ count }', undefined, { next: (d) => got.push(d), complete: () => { done = true } })
    await new Promise((r) => setTimeout(r, 0))
    expect(got).toEqual([{ count: 1 }, { count: 2 }])
    expect(done).toBe(true)
  })

  it('replies to server ping with pong', async () => {
    FakeWS.onSend = (sock, msg) => {
      if (msg.type === 'connection_init') queueMicrotask(() => {
        sock.emit('message', { data: JSON.stringify({ type: 'connection_ack' }) })
        sock.emit('message', { data: JSON.stringify({ type: 'ping' }) })
      })
    }
    await new Subs().live()
    const sock = FakeWS.instances.at(-1)!
    await new Promise((r) => setTimeout(r, 0))
    expect(sock.sent.map((s) => JSON.parse(s).type)).toContain('pong')
  })
})
