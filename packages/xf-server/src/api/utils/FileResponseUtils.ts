import type { HttpResponse } from '../transfers/HttpResponse.js'

/**
 * Body shape acceptable for `FileResponseUtils` builders. Mirrors what
 * `HttpResponse.body` already supports — every helper just wraps it
 * with the right `Content-Type` and `Content-Disposition` headers.
 */
export type FileBody =
  | Uint8Array
  | ReadableStream<Uint8Array>
  | string

/**
 * Static utility — ergonomic builders for HTTP responses that
 * deliver files (downloads, photos, videos, PDFs, exports). Pure
 * (no I/O) — these are just `HttpResponse` literal factories with
 * the right headers preset.
 *
 * Two patterns are commonly distinguished:
 *
 *  - **`attachment`**: the client should save the file with the given
 *    name. Use for downloads (PDFs, CSV exports, archives).
 *  - **`inline`**: the client may render the file in place (images
 *    in `<img>`, PDFs in the browser viewer, videos in `<video>`).
 *
 * Both helpers accept a `Uint8Array` (small/buffered files), a
 * `ReadableStream<Uint8Array>` (streaming downloads / large files),
 * or a `string` (text-based content). The server pipeline writes the
 * body verbatim — no extra serialisation.
 */
export class FileResponseUtils {
  private constructor() {}

  /**
   * Build an HTTP response that prompts the client to download and
   * save the file under `filename`.
   *
   * @example
   * ```ts
   * const stream = await B.docs.openStream(req.params.id)
   * return FileResponseUtils.attachment(stream, 'report.pdf', 'application/pdf')
   * ```
   */
  static attachment(body: FileBody, filename: string, mimeType: string, status = 200): HttpResponse<FileBody> {
    return {
      status,
      headers: {
        'content-type': mimeType,
        'content-disposition': `attachment; filename="${FileResponseUtils.escapeFilename(filename)}"`,
      },
      body,
    }
  }

  /**
   * Build an HTTP response that the client may render in place
   * (images, embeddable PDFs, video). The optional `filename` hint
   * is included so user agents can name the file if the user
   * decides to save it.
   *
   * @example
   * ```ts
   * const stream = await B.photos.openStream(req.params.id)
   * return FileResponseUtils.inline(stream, 'photo.jpg', 'image/jpeg')
   * ```
   */
  static inline(body: FileBody, filenameOrMime: string, mimeType?: string, status = 200): HttpResponse<FileBody> {
    // Allow `inline(body, 'image/jpeg')` shorthand when no filename
    // hint is meaningful (e.g. on-the-fly generated previews).
    const filename = mimeType === undefined ? undefined : filenameOrMime
    const ct = mimeType ?? filenameOrMime
    const headers: Record<string, string> = { 'content-type': ct }
    headers['content-disposition'] = filename === undefined
      ? 'inline'
      : `inline; filename="${FileResponseUtils.escapeFilename(filename)}"`
    return { status, headers, body }
  }

  /**
   * Build a streaming response with a custom `Content-Type` and
   * **no** `Content-Disposition`. For SSE, NDJSON, audio/video
   * progressive streams, anything the client consumes incrementally.
   *
   * @example
   * ```ts
   * return FileResponseUtils.stream(eventStream, 'text/event-stream')
   * ```
   */
  static stream(body: ReadableStream<Uint8Array>, mimeType: string, status = 200): HttpResponse<ReadableStream<Uint8Array>> {
    return { status, headers: { 'content-type': mimeType }, body }
  }

  /** Escape a filename for safe inclusion in a `Content-Disposition` header. */
  private static escapeFilename(filename: string): string {
    return filename.replace(/[\\"]/g, '\\$&')
  }
}
