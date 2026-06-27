import { describe, it, expect, beforeEach, vi } from 'vitest'
import { SseRepository, type ServerSentEvent } from '../../../index'

const { state } = vi.hoisted(() => ({ state: { opts: undefined as any, response: undefined as any } }))
vi.mock('ky', () => {
  const HTTPError = class extends Error { response: Response; data: unknown; constructor(r: Response, d?: unknown) { super('http'); this.response = r; this.data = d } }
  const TimeoutError = class extends Error {}
  return { default: { create: () => async (_p: string, opts?: any) => { state.opts = opts; return state.response } }, HTTPError, TimeoutError }
})

function sseResponse(text: string): Response {
  const body = new ReadableStream<Uint8Array>({ start(c) { c.enqueue(new TextEncoder().encode(text)); c.close() } })
  return new Response(body, { status: 200, headers: { 'content-type': 'text/event-stream' } })
}

class Clock extends SseRepository {
  constructor() { super('https://api.example.com') }
  ticks() { return this.events('/clock') }
}

describe('SseRepository', () => {
  let clock: Clock
  beforeEach(async () => { clock = new Clock(); await clock.init() })

  it('requests with stream:true and Accept: text/event-stream', async () => {
    state.response = sseResponse('data: x\n\n')
    for await (const _ of clock.ticks()) break
    expect(state.opts.method).toBe('GET')
  })

  it('parses event/data/id fields and multi-line data', async () => {
    state.response = sseResponse(
      'event: tick\nid: 1\ndata: {"n":1}\n\n' +   // event with named type + id + json data
      'data: line1\ndata: line2\n\n' +             // default event, multi-line data
      ': a comment\n\n',                            // comment + blank → no event
    )
    const events: ServerSentEvent[] = []
    for await (const ev of clock.ticks()) events.push(ev)
    expect(events).toHaveLength(2)
    expect(events[0]).toEqual({ event: 'tick', id: '1', data: '{"n":1}' })
    expect(events[1]).toEqual({ data: 'line1\nline2' })
  })
})
