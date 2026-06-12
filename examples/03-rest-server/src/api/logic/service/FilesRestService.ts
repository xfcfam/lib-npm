import {
  ObjectRestService,
  HttpStatusUtils,
  FileResponseUtils,
  NotFoundException,
  BadRequestException,
  type HttpRequest,
  type HttpResponse,
  type MultipartPart,
} from '@xfcfam/xf-server-http'
import { B } from '../../../business/B.js'

/**
 * Demonstrates:
 *
 *   - Multipart uploads (`POST /files` — req.body comes as
 *     `MultipartPart[]` because the server has `multipart: true`).
 *   - File downloads via FileResponseUtils.attachment (forces save).
 *   - File preview via FileResponseUtils.inline (renders in-place).
 *   - Server-Sent Events via FileResponseUtils.stream + ReadableStream.
 *   - Streaming bodies in both directions — when the response body
 *     is a stream, the server pipes it without buffering.
 *   - Push route registration: routes are pushed to `B.server` from
 *     `init()`. Object endpoints use `this.object(handler)`; binary /
 *     stream endpoints use `this.wrap(handler)`.
 */
export class FilesRestService extends ObjectRestService {
  override async init(): Promise<void> {
    B.server.get('/files',              this.object(this.list))
    B.server.post('/files',             this.object(this.upload))
    B.server.get('/files/:id/download', this.wrap(this.download))
    B.server.get('/files/:id/preview',  this.wrap(this.preview))
    B.server.get('/files/events',       this.wrap(this.events))
  }

  // ── list (object response) ────────────────────────────────

  private async list(_req: HttpRequest): Promise<HttpResponse> {
    const files = await B.file.list()
    // Strip `bytes` from the listing — we just expose metadata.
    const summaries = files.map(({ id, filename, mimeType, uploadedAt }) => ({
      id, filename, mimeType, uploadedAt,
    }))
    return { status: HttpStatusUtils.OK, body: summaries }
  }

  // ── upload (multipart request) ───────────────────────────

  private async upload(req: HttpRequest): Promise<HttpResponse> {
    const parts = req.body as MultipartPart[] | unknown
    if (!Array.isArray(parts)) {
      throw new BadRequestException('Expected multipart/form-data with at least one file part')
    }
    const stored = []
    for (const part of parts as MultipartPart[]) {
      if (part.filename === undefined) continue  // skip plain form fields
      const bytes = part.body instanceof Uint8Array
        ? part.body
        : await FilesRestService.collectStream(part.body)
      const file = await B.file.save(part.filename, part.mimeType, bytes)
      stored.push({ id: file.id, filename: file.filename, size: file.bytes.byteLength })
    }
    if (stored.length === 0) {
      throw new BadRequestException('No file parts in the multipart body')
    }
    return { status: HttpStatusUtils.CREATED, body: { uploaded: stored } }
  }

  // ── download (file response — attachment) ────────────────

  private async download(req: HttpRequest): Promise<HttpResponse> {
    const file = await B.file.findById(req.params['id']!)
    if (file === null) throw new NotFoundException(`File ${req.params['id']}`)
    return FileResponseUtils.attachment(file.bytes, file.filename, file.mimeType)
  }

  // ── preview (file response — inline) ─────────────────────

  private async preview(req: HttpRequest): Promise<HttpResponse> {
    const file = await B.file.findById(req.params['id']!)
    if (file === null) throw new NotFoundException(`File ${req.params['id']}`)
    // Stream the bytes via a ReadableStream so the response demonstrates
    // streaming pass-through (rather than buffered Uint8Array).
    const stream = FilesRestService.bytesToStream(file.bytes)
    return FileResponseUtils.inline(stream, file.filename, file.mimeType)
  }

  // ── events (SSE — streaming response) ────────────────────

  private async events(_req: HttpRequest): Promise<HttpResponse> {
    // Emits 5 events over 5 seconds. Demonstrates that a streaming
    // body coexists with object endpoints in the same Service.
    const stream = B.file.eventStream(5, 1000)
    return FileResponseUtils.stream(stream, 'text/event-stream')
  }

  // ── helpers ───────────────────────────────────────────────

  private static async collectStream(stream: ReadableStream<Uint8Array>): Promise<Uint8Array> {
    const reader = stream.getReader()
    const chunks: Uint8Array[] = []
    let total = 0
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      if (value !== undefined) { chunks.push(value); total += value.byteLength }
    }
    const out = new Uint8Array(total)
    let offset = 0
    for (const c of chunks) { out.set(c, offset); offset += c.byteLength }
    return out
  }

  private static bytesToStream(bytes: Uint8Array): ReadableStream<Uint8Array> {
    return new ReadableStream<Uint8Array>({
      start(controller) { controller.enqueue(bytes); controller.close() },
    })
  }
}
