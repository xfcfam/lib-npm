/**
 * Access-layer Transfer — a single decoded Server-Sent Event received by
 * an {@link SseRepository}. The client-side counterpart of the server's
 * `ServerSentEvent`.
 *
 * `data` is the raw event payload as received (multi-line `data:` fields
 * joined by `\n`); the consumer `JSON.parse`s it when the stream carries
 * JSON. `event` / `id` / `retry` map to the SSE wire fields.
 */
export interface ServerSentEvent {
  /** Raw event payload (joined `data:` lines). */
  readonly data: string
  /** Named event type (`event:` field). Absent for the default `message` event. */
  readonly event?: string
  /** Event id (`id:` field). */
  readonly id?: string
  /** Reconnection hint in milliseconds (`retry:` field). */
  readonly retry?: number
}
