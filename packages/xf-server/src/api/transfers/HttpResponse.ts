/**
 * Interaction-layer Transfer — the response a `RestService` handler
 * returns to the server pipeline.
 *
 * `body` is unified: it may be any of —
 *
 *   - a JS value (object, array, primitive) → serialised according to
 *     the response's `Content-Type` (or to JSON by default, when
 *     `ObjectRestService` is in use);
 *   - a `Uint8Array` → written verbatim to the response body;
 *   - a `ReadableStream<Uint8Array>` → streamed to the client in
 *     chunks (file downloads, server-sent events, large exports);
 *   - a `string` → sent as text;
 *   - `null` / `undefined` → empty body.
 *
 * No separate `pipe` field: streaming is just a body whose type is a
 * `ReadableStream`. Keeps the surface area minimal and treats
 * streaming as a first-class case rather than an afterthought.
 */
export interface HttpResponse<TBody = unknown> {
  /** HTTP status code. */
  readonly status: number
  /** Response headers. Lowercased name → value. */
  readonly headers?: Readonly<Record<string, string>>
  /** Response body. See class docstring for the supported shapes. */
  readonly body?: TBody
}
