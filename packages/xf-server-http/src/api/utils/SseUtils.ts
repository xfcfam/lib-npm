import type { HttpResponse } from '../../business/transfers/HttpResponse.js'

/**
 * A single Server-Sent Event. `data` is sent as-is when a string, or
 * JSON-encoded when an object. The optional fields map to the SSE
 * wire fields (`event:`, `id:`, `retry:`).
 */
export interface ServerSentEvent {
  /** Event payload. Strings are sent verbatim; objects are JSON-encoded. */
  readonly data: string | object
  /** Named event type (`event:` field). */
  readonly event?: string
  /** Event id (`id:` field) — clients echo it as `Last-Event-ID` on reconnect. */
  readonly id?: string
  /** Reconnection hint in milliseconds (`retry:` field). */
  readonly retry?: number
}

/**
 * Interaction-Layer Utility — turn an async stream of events into a
 * `text/event-stream` {@link HttpResponse}.
 *
 * SSE is plain HTTP (a long-lived `GET` whose body is a stream), so it
 * needs no plugin and works on any `RestService`. This helper does the
 * tedious part: setting the right headers and formatting each event per
 * the SSE wire protocol (multi-line `data:`, `event:`, `id:`, `retry:`,
 * blank-line terminator).
 *
 * @example
 * ```ts
 * import { RestService, SseUtils } from '@xfcfam/xf-server-http'
 *
 * export class ClockService extends RestService {
 *   override async init() { B.server.get('/clock', this.wrap(this.clock)) }
 *
 *   private async clock(): Promise<HttpResponse> {
 *     async function* ticks() {
 *       while (true) {
 *         yield { event: 'tick', data: { now: Date.now() } }
 *         await new Promise((r) => setTimeout(r, 1000))
 *       }
 *     }
 *     return SseUtils.stream(ticks())
 *   }
 * }
 * ```
 */
export class SseUtils {
  private constructor() {}

  /**
   * Build a streaming `text/event-stream` response from an async
   * iterable of events. The stream stays open until the source is
   * exhausted or the client disconnects.
   */
  static stream(
    source: AsyncIterable<ServerSentEvent>,
    headers?: Readonly<Record<string, string>>,
  ): HttpResponse<ReadableStream<Uint8Array>> {
    const encoder = new TextEncoder()
    const body = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const event of source) {
            controller.enqueue(encoder.encode(SseUtils.format(event)))
          }
          controller.close()
        } catch (err) {
          controller.error(err)
        }
      },
    })
    return {
      status: 200,
      headers: {
        'content-type': 'text/event-stream',
        'cache-control': 'no-cache',
        'connection': 'keep-alive',
        ...headers,
      },
      body,
    }
  }

  /** Format a single event into its SSE wire representation. */
  static format(event: ServerSentEvent): string {
    const lines: string[] = []
    if (event.event !== undefined) lines.push(`event: ${event.event}`)
    if (event.id !== undefined) lines.push(`id: ${event.id}`)
    if (event.retry !== undefined) lines.push(`retry: ${event.retry}`)
    const data = typeof event.data === 'string' ? event.data : JSON.stringify(event.data)
    for (const line of data.split('\n')) lines.push(`data: ${line}`)
    return `${lines.join('\n')}\n\n`
  }
}
