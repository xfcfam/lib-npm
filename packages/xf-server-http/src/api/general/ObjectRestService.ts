import { RestService } from './RestService.js'
import type { HttpRequest } from '../../business/transfers/HttpRequest.js'
import type { HttpResponse } from '../../business/transfers/HttpResponse.js'
import type { HttpHandler } from '../../business/transfers/Route.js'
import { BadRequestException } from '../../business/transfers/BadRequestException.js'

/**
 * Body parser: given the raw bytes of a request and the value of the
 * `Content-Type` header, produce the parsed JS object. May throw on
 * invalid input; the pipeline wraps the failure in a
 * `BadRequestException`.
 */
export type BodyParser = (bytes: Uint8Array, contentType: string) => unknown

/**
 * Body serializer: given a JS value and the negotiated media type,
 * produce the byte buffer to send on the wire. Mirror of
 * {@link BodyParser}.
 */
export type BodySerializer = (value: unknown, mediaType: string) => Uint8Array

/**
 * Configuration accepted by {@link ObjectRestService}'s constructor.
 * All keys are optional — sensible JSON defaults are wired
 * automatically.
 */
export interface ObjectRestOptions {
  /**
   * Content-Type → parser map. Keys are matched case-insensitively
   * against the request's `Content-Type` (the media type before any
   * `;` parameters). User entries override the built-in JSON parser.
   *
   * To support XML / CSV / YAML, supply the parser yourself and let
   * the consumer choose the underlying library:
   *
   * ```ts
   * new MyService({
   *   parsers: new Map([
   *     ['application/xml', (bytes) => xmlParser(decode(bytes))],
   *   ]),
   * })
   * ```
   */
  readonly parsers?: ReadonlyMap<string, BodyParser>
  /**
   * Media-type → serializer map. Selected by the response's
   * `Content-Type` (defaulting to `application/json`).
   */
  readonly serializers?: ReadonlyMap<string, BodySerializer>
  /**
   * Media type to use for serialisation when the response does not
   * carry an explicit `Content-Type`. Default `'application/json'`.
   */
  readonly defaultMediaType?: string
  /**
   * When `true`, the built-in JSON parser revives ISO-8601 date strings
   * into `Date` objects (via {@link ObjectRestService.dateReviver}), so
   * handlers receive real `Date`s on the request side. Serialising
   * `Date`s back to string is automatic — see {@link formatDate} — so
   * dates round-trip with this single flag. Default `false`.
   */
  readonly reviveDates?: boolean
  /**
   * How a `Date` is rendered to text when serialising the response body.
   * The developer decides the wire format: the default is ISO-8601
   * (`date.toISOString()`), but any function works — date-only, epoch
   * millis, a locale string, or a custom formatter.
   *
   * ```ts
   * new MyService({ formatDate: (d) => d.toISOString().slice(0, 10) }) // YYYY-MM-DD
   * new MyService({ formatDate: (d) => String(d.getTime()) })          // epoch ms
   * ```
   *
   * Applied to every `Date` found anywhere in the response body (nested
   * objects and arrays included). Default: ISO-8601.
   */
  readonly formatDate?: (date: Date) => string
}

/**
 * Generalization for Interaction Layer components that operate on
 * **parsed JS objects** on both sides of the wire — the typical REST
 * service.
 *
 * Extends {@link RestService} with automatic body parsing and
 * serialisation. Use `this.object(handler)` when registering a route
 * to wrap the handler in the full parse → handle → serialize pipeline:
 *
 * ```ts
 * B.server.post('/users', this.object(this.createUser))
 * ```
 *
 * Combine with `this.wrap(this.object(handler))` to add the
 * per-service `onRequest` / `onResponse` hooks on top.
 *
 * **Built-in**: JSON parse + serialize, with developer-chosen date
 * handling (see {@link ObjectRestService.dateReviver}, the `reviveDates`
 * option, and `formatDate` in {@link ObjectRestOptions}). XML/CSV/YAML
 * parsing and any other serializers are wired by passing them in
 * {@link ObjectRestOptions}, keeping the package zero-dependency.
 *
 * Stream bodies (request or response) bypass parsing/serialisation:
 * if the request body is a `ReadableStream` the handler may consume
 * it directly; if the handler returns a `ReadableStream` or a
 * `Uint8Array` it is sent verbatim.
 *
 * @example
 * ```ts
 * import { ObjectRestService, HttpStatusUtils } from '@xfcfam/xf-server'
 * import { B } from '../../business/B.js'
 *
 * export class UsersRestService extends ObjectRestService {
 *   override async init(): Promise<void> {
 *     B.server.get('/users/:id', this.wrap(this.getUser))
 *     B.server.post('/users',    this.object(this.createUser))
 *   }
 *
 *   private async getUser(req: HttpRequest): Promise<HttpResponse> {
 *     const user = await B.usersBusiness.findById(req.params.id!)
 *     return { status: HttpStatusUtils.OK, body: user }
 *   }
 *
 *   private async createUser(req: HttpRequest): Promise<HttpResponse> {
 *     const body = req.body as { name: string; email: string }
 *     const user = await B.usersBusiness.create(body)
 *     return { status: HttpStatusUtils.CREATED, body: user }
 *   }
 * }
 * ```
 */
export abstract class ObjectRestService extends RestService {
  protected readonly parsers: ReadonlyMap<string, BodyParser>
  protected readonly serializers: ReadonlyMap<string, BodySerializer>
  protected readonly defaultMediaType: string
  /** Developer-chosen `Date` → text formatter for the JSON serializer. */
  protected readonly formatDate: (date: Date) => string

  constructor(options: ObjectRestOptions = {}) {
    super()
    this.formatDate = options.formatDate ?? ObjectRestService.toIsoString

    const jsonParser: BodyParser = options.reviveDates === true
      ? (bytes) => JSON.parse(new TextDecoder('utf-8').decode(bytes), ObjectRestService.dateReviver)
      : ObjectRestService.parseJson
    const parsers = new Map<string, BodyParser>([
      ['application/json', jsonParser],
    ])
    if (options.parsers !== undefined) {
      for (const [k, v] of options.parsers) parsers.set(k.toLowerCase(), v)
    }
    this.parsers = parsers

    const formatDate = this.formatDate
    const serializers = new Map<string, BodySerializer>([
      ['application/json', (value) => ObjectRestService.serializeJson(value, formatDate)],
    ])
    if (options.serializers !== undefined) {
      for (const [k, v] of options.serializers) serializers.set(k.toLowerCase(), v)
    }
    this.serializers = serializers

    this.defaultMediaType = options.defaultMediaType ?? 'application/json'
  }

  /**
   * Wrap a handler in the body parse → handle → serialize pipeline,
   * plus the per-service `onRequest` / `onResponse` / `onError` hooks.
   *
   * This is the recommended registration method for
   * `ObjectRestService` handlers:
   *
   * ```ts
   * B.server.post('/users', this.object(this.createUser))
   * ```
   *
   * The pipeline runs:
   *   1. `onRequest(req)` (per-service hook)
   *   2. parse request body (bytes → object, by Content-Type)
   *   3. handler
   *   4. `onResponse(req, res)` (per-service hook)
   *   5. serialize response body (object → bytes, by Content-Type)
   *
   * `onResponse` fires before serialisation so envelope wrappers see
   * the original payload.
   *
   * Use `this.wrap(handler)` instead when the handler already manages
   * its own bytes (upload / download / SSE endpoints).
   */
  protected object<TReqBody = unknown, TResBody = unknown>(
    handler: HttpHandler<TReqBody, TResBody>,
  ): HttpHandler {
    const bound = handler.bind(this) as HttpHandler
    return async (req: HttpRequest): Promise<HttpResponse> => {
      let r = await this.onRequest(req)
      try {
        r = await this.parseRequestBody(r)
        const res = await bound(r)
        const afterHook = await this.onResponse(r, res)
        return this.serializeResponseBody(afterHook)
      } catch (err) {
        const resolved = await this.onError(r, err)
        if (resolved !== undefined) return resolved
        throw err
      }
    }
  }

  /**
   * Decode the request body to a JS value using the registered
   * parser for `Content-Type`. Stream bodies are buffered first.
   * Exposed as `protected` so subclasses can call it directly when
   * composing custom pipelines.
   */
  protected async parseRequestBody(request: HttpRequest): Promise<HttpRequest> {
    const body = request.body
    if (body === null || body === undefined) return request
    // Multipart bodies are already an array of MultipartPart (the
    // server adapter produced them before the parser ran). Pass
    // through unchanged.
    if (Array.isArray(body)) return request
    // Pass through non-bytes (e.g. already-parsed, or handler chose to consume the stream directly).
    if (!(body instanceof Uint8Array) && !ObjectRestService.isReadableStream(body)) return request

    const bytes = body instanceof Uint8Array
      ? body
      : await ObjectRestService.collect(body as ReadableStream<Uint8Array>)

    if (bytes.byteLength === 0) return { ...request, body: null }

    const contentType = ObjectRestService.mediaTypeOf(request.headers['content-type'])
    const parser = this.parsers.get(contentType.toLowerCase())
    if (parser === undefined) {
      // Unknown content-type → leave the bytes as-is; the handler may
      // know what to do with them. Common case for binary uploads
      // that bypass parsing.
      return { ...request, body: bytes }
    }
    try {
      const parsed = parser(bytes, contentType)
      return { ...request, body: parsed }
    } catch (err) {
      throw new BadRequestException(`Invalid ${contentType} body`, { detail: (err as Error).message })
    }
  }

  /**
   * Encode the response body to bytes using the registered serializer
   * for the response's `Content-Type` (or the default media type).
   * Streams and Uint8Arrays are passed through unchanged. Exposed as
   * `protected` so subclasses can call it directly when composing
   * custom pipelines.
   */
  protected serializeResponseBody(response: HttpResponse): HttpResponse {
    const body = response.body
    if (body === null || body === undefined) return response
    if (body instanceof Uint8Array) return response
    if (typeof body === 'string') return response
    if (ObjectRestService.isReadableStream(body)) return response

    const headers = response.headers ?? {}
    const explicit = headers['content-type']
    const mediaType = ObjectRestService.mediaTypeOf(explicit) || this.defaultMediaType
    const serializer = this.serializers.get(mediaType.toLowerCase())
    if (serializer === undefined) {
      // Fall back to JSON serialisation if the explicit media type
      // is unknown — a sensible default rather than a 500.
      return {
        status: response.status,
        headers: { ...headers, 'content-type': this.defaultMediaType },
        body: ObjectRestService.serializeJson(body, this.formatDate),
      }
    }
    return {
      status: response.status,
      headers: { ...headers, 'content-type': mediaType },
      body: serializer(body, mediaType),
    }
  }

  // ─── Helpers ────────────────────────────────────────────────

  private static parseJson(bytes: Uint8Array, _ct: string): unknown {
    const text = new TextDecoder('utf-8').decode(bytes)
    return JSON.parse(text)
  }

  private static serializeJson(value: unknown, formatDate: (date: Date) => string): Uint8Array {
    // Fast path: the default ISO formatter matches `Date.toJSON`, so
    // `JSON.stringify` already produces the right text — skip the walk.
    const prepared = formatDate === ObjectRestService.toIsoString
      ? value
      : ObjectRestService.applyDateFormat(value, formatDate)
    return new TextEncoder().encode(JSON.stringify(prepared))
  }

  private static toIsoString(date: Date): string {
    return date.toISOString()
  }

  /**
   * Deep-copy `value`, replacing every `Date` with `formatDate(date)` so
   * a developer-chosen date format survives `JSON.stringify` (which would
   * otherwise call `Date.toJSON` and force ISO-8601).
   */
  private static applyDateFormat(value: unknown, formatDate: (date: Date) => string): unknown {
    if (value instanceof Date) return formatDate(value)
    if (Array.isArray(value)) {
      return value.map(v => ObjectRestService.applyDateFormat(v, formatDate))
    }
    if (value !== null && typeof value === 'object') {
      const out: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        out[k] = ObjectRestService.applyDateFormat(v, formatDate)
      }
      return out
    }
    return value
  }

  /**
   * JSON reviver that turns ISO-8601 date strings into `Date` objects —
   * the developer shortcut for date handling. Use it directly with
   * `JSON.parse(text, ObjectRestService.dateReviver)`, or set
   * `reviveDates: true` in {@link ObjectRestOptions} to apply it to the
   * built-in JSON parser. The inverse is automatic: a `Date` serializes
   * back to text via the `formatDate` option (ISO-8601 by default).
   */
  static dateReviver(_key: string, value: unknown): unknown {
    if (typeof value === 'string' && ObjectRestService.ISO_DATE_RE.test(value)) {
      const ms = Date.parse(value)
      if (!Number.isNaN(ms)) return new Date(ms)
    }
    return value
  }

  private static readonly ISO_DATE_RE =
    /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?)?$/

  private static mediaTypeOf(contentType: string | readonly string[] | undefined): string {
    const ct = Array.isArray(contentType) ? contentType[0] : contentType
    if (typeof ct !== 'string' || ct.length === 0) return ''
    const semi = ct.indexOf(';')
    return (semi < 0 ? ct : ct.substring(0, semi)).trim().toLowerCase()
  }

  private static isReadableStream(value: unknown): value is ReadableStream<Uint8Array> {
    return typeof value === 'object'
      && value !== null
      && typeof (value as { getReader?: unknown }).getReader === 'function'
  }

  private static async collect(stream: ReadableStream<Uint8Array>): Promise<Uint8Array> {
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
    for (const chunk of chunks) { out.set(chunk, offset); offset += chunk.byteLength }
    return out
  }
}
