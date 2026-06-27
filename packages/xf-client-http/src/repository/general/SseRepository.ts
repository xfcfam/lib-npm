import { RestRepository } from './RestRepository.js'
import type { Request } from '../transfers/Request.js'
import type { ServerSentEvent } from '../transfers/ServerSentEvent.js'

/**
 * Access-Layer Generalization for consuming a **Server-Sent Events**
 * (`text/event-stream`) endpoint — the explicit, parsing counterpart of
 * the server's `SseUtils`.
 *
 * SSE is plain HTTP (a long-lived `GET` whose body is a stream), so this
 * **extends {@link RestRepository}**: it issues the request with
 * `stream: true` (so the body is the raw `ReadableStream`, never buffered)
 * and parses the SSE wire protocol into {@link ServerSentEvent}s, yielded
 * as they arrive.
 *
 * ```ts
 * export class Clock extends SseRepository {
 *   constructor() { super('https://api.example.com') }
 *   ticks() { return this.events('/clock') }
 * }
 * // for await (const ev of clock.ticks()) console.log(ev.event, JSON.parse(ev.data))
 * ```
 */
export abstract class SseRepository extends RestRepository {
  /**
   * Open an SSE stream and yield each event as it arrives. The generator
   * completes when the server closes the stream.
   */
  protected async *events(
    path: string,
    query?: Request['query'],
    headers?: Record<string, string>,
  ): AsyncGenerator<ServerSentEvent, void, unknown> {
    const res = await this.call({
      method: 'GET',
      path,
      ...(query !== undefined ? { query } : {}),
      headers: { Accept: 'text/event-stream', ...(headers ?? {}) },
      stream: true,
    })
    const stream = res.body as ReadableStream<Uint8Array> | null
    if (stream === null) return
    yield* SseRepository.parse(stream)
  }

  /** Parse an SSE byte stream into events per the wire protocol. */
  private static async *parse(stream: ReadableStream<Uint8Array>): AsyncGenerator<ServerSentEvent, void, unknown> {
    const reader = stream.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let event: string | undefined
    let id: string | undefined
    let retry: number | undefined
    let data: string[] = []

    const dispatch = (): ServerSentEvent | undefined => {
      if (data.length === 0) { event = undefined; id = undefined; retry = undefined; return undefined }
      const ev: ServerSentEvent = {
        data: data.join('\n'),
        ...(event !== undefined ? { event } : {}),
        ...(id !== undefined ? { id } : {}),
        ...(retry !== undefined ? { retry } : {}),
      }
      event = undefined; id = undefined; retry = undefined; data = []
      return ev
    }

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      let match: RegExpMatchArray | null
      while ((match = buffer.match(/\r\n|\r|\n/)) !== null) {
        const idx = match.index!
        const line = buffer.slice(0, idx)
        buffer = buffer.slice(idx + match[0].length)
        if (line === '') { const ev = dispatch(); if (ev !== undefined) yield ev; continue }
        if (line.startsWith(':')) continue // comment
        const colon = line.indexOf(':')
        const field = colon === -1 ? line : line.slice(0, colon)
        let val = colon === -1 ? '' : line.slice(colon + 1)
        if (val.startsWith(' ')) val = val.slice(1)
        if (field === 'event') event = val
        else if (field === 'data') data.push(val)
        else if (field === 'id') id = val
        else if (field === 'retry') { const n = Number(val); if (!Number.isNaN(n)) retry = n }
      }
    }
    const ev = dispatch(); if (ev !== undefined) yield ev
  }
}
