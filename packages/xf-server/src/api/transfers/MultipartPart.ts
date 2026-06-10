/**
 * Interaction-layer Transfer — a single part of a
 * `multipart/form-data` request body.
 *
 * Each form-data section becomes one `MultipartPart`: text fields,
 * file uploads, attached blobs. The same shape covers all of them —
 * `filename` distinguishes a file (where it carries the original
 * client-side filename) from a plain field (where it is undefined).
 *
 * Body is streaming-friendly: small parts arrive as `Uint8Array`,
 * large ones as `ReadableStream<Uint8Array>`. The handler decides
 * whether to buffer or pipe.
 *
 * `MultipartPart[]` is what an `ObjectRestService` produces in
 * `req.body` for any request whose `Content-Type` is
 * `multipart/form-data`, when the host `RestServerService` enables
 * the multipart option.
 */
export interface MultipartPart {
  /** Name of the form field (the `name=` attribute on the client side). */
  readonly field: string
  /**
   * Original client-side filename if the part is a file upload;
   * undefined for plain text fields.
   */
  readonly filename?: string
  /** MIME type sent by the client, e.g. `image/jpeg` or `text/plain`. */
  readonly mimeType: string
  /**
   * Part body. `Uint8Array` for small/buffered content,
   * `ReadableStream<Uint8Array>` for streaming uploads when the
   * underlying library supports it.
   */
  readonly body: Uint8Array | ReadableStream<Uint8Array>
  /** Byte size of the part if known upfront. */
  readonly size?: number
}
