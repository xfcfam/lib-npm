import { describe, it, expect } from 'vitest'
import { SseUtils, type ServerSentEvent } from '../../../index'

describe('SseUtils.format — SSE wire encoding', () => {
  it('emits only a data line for a minimal string event, terminated by a blank line', () => {
    expect(SseUtils.format({ data: 'hello' })).toBe('data: hello\n\n')
  })

  it('orders the fields event → id → retry → data', () => {
    const e: ServerSentEvent = { event: 'tick', id: '42', retry: 3000, data: 'x' }
    expect(SseUtils.format(e)).toBe('event: tick\nid: 42\nretry: 3000\ndata: x\n\n')
  })

  it('includes only the optional fields that are present', () => {
    expect(SseUtils.format({ event: 'ping', data: 'x' })).toBe('event: ping\ndata: x\n\n')
    expect(SseUtils.format({ id: '7', data: 'x' })).toBe('id: 7\ndata: x\n\n')
    expect(SseUtils.format({ retry: 1000, data: 'x' })).toBe('retry: 1000\ndata: x\n\n')
  })

  it('JSON-encodes object data', () => {
    expect(SseUtils.format({ data: { a: 1, b: 'two' } })).toBe('data: {"a":1,"b":"two"}\n\n')
  })

  it('splits multi-line string data into one data: line per line', () => {
    expect(SseUtils.format({ data: 'line1\nline2\nline3' }))
      .toBe('data: line1\ndata: line2\ndata: line3\n\n')
  })

  it('treats retry: 0 and id: "" as present (not skipped)', () => {
    expect(SseUtils.format({ retry: 0, data: 'x' })).toBe('retry: 0\ndata: x\n\n')
    expect(SseUtils.format({ id: '', data: 'x' })).toBe('id: \ndata: x\n\n')
  })
})

describe('SseUtils.stream — text/event-stream response', () => {
  it('sets the streaming headers and wraps the source in a ReadableStream', () => {
    async function* source(): AsyncGenerator<ServerSentEvent> {
      yield { event: 'a', data: '1' }
    }
    const res = SseUtils.stream(source())
    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toBe('text/event-stream')
    expect(res.headers['cache-control']).toBe('no-cache')
    expect(res.headers['connection']).toBe('keep-alive')
    expect(typeof (res.body as ReadableStream).getReader).toBe('function')
  })

  it('lets caller headers extend (and override) the defaults', () => {
    async function* source(): AsyncGenerator<ServerSentEvent> {}
    const res = SseUtils.stream(source(), { 'x-trace': 'abc', 'cache-control': 'private' })
    expect(res.headers['x-trace']).toBe('abc')
    expect(res.headers['cache-control']).toBe('private')
  })

  it('streams each event through, formatted, in order', async () => {
    async function* source(): AsyncGenerator<ServerSentEvent> {
      yield { event: 'a', data: '1' }
      yield { data: { n: 2 } }
    }
    const res = SseUtils.stream(source())
    const reader = (res.body as ReadableStream<Uint8Array>).getReader()
    const decoder = new TextDecoder()
    let text = ''
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      if (value) text += decoder.decode(value)
    }
    expect(text).toBe('event: a\ndata: 1\n\ndata: {"n":2}\n\n')
  })
})
