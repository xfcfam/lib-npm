import { RestService } from './RestService.js'
import type { HttpRequest } from '../transfers/HttpRequest.js'
import type { HttpResponse } from '../transfers/HttpResponse.js'
import { BadRequestException } from '../transfers/BadRequestException.js'

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
}

/**
 * Generalization for Interaction Layer components that operate on
 * **parsed JS objects** on both sides of the wire — the typical REST
 * service.
 *
 * Extends {@link RestService} with two cross-cutting policies wired
 * automatically:
 *
 *  1. **Request parsing**: the raw body (`Uint8Array` or
 *     `ReadableStream<Uint8Array>`) is parsed according to the
 *     `Content-Type` header, and the handler sees `req.body` as the
 *     parsed object. Streams are buffered before parsing.
 *  2. **Response serialisation**: the handler returns a JS value as
 *     `res.body`; the pipeline serialises it according to the
 *     response's `Content-Type` (default `application/json`) and
 *     sends the resulting bytes.
 *
 * Stream bodies (request or response) bypass parsing/serialisation:
 * if the handler returns a `ReadableStream` or a `Uint8Array`, it is
 * passed through verbatim. So streaming responses (downloads, SSE,
 * exports) coexist naturally with parsed-object endpoints in the same
 * Service.
 *
 * **Built-in parsers/serializers**: JSON only. XML / CSV / YAML
 * support is wired by passing parsers in {@link ObjectRestOptions},
 * keeping the package zero-dependency.
 *
 * The `onRequest` / `onResponse` hooks fire on the parsed objects,
 * not on the raw bytes — perfect for envelope wrappers, formal
 * `{ code, description, data }` shapes, validation, etc.
 *
 * @example
 * ```ts
 * import { ObjectRestService, SchemaValidator, HttpStatus } from '@xfcfam/xf-server'
 * import { z } from 'zod'
 *
 * const UserCreate = z.object({ name: z.string(), email: z.string().email() })
 *
 * export class UsersRestService extends ObjectRestService {
 *   override async init(): Promise<void> {
 *     this.handle('GET', '/users/:id', this.getUser)
 *     this.handle('POST', '/users',     this.createUser)
 *   }
 *
 *   private async getUser(req): Promise<HttpResponse> {
 *     const user = await B.userBusiness.findById(req.params.id)
 *     return { status: HttpStatus.OK, body: user }
 *   }
 *
 *   private async createUser(req): Promise<HttpResponse> {
 *     const dto = SchemaValidator.parse(UserCreate, req.body)
 *     const user = await B.userBusiness.create(dto)
 *     return { status: HttpStatus.CREATED, body: user }
 *   }
 * }
 * ```
 */
export abstract class ObjectRestService extends RestService {
  protected readonly parsers: ReadonlyMap<string, BodyParser>
  protected readonly serializers: ReadonlyMap<string, BodySerializer>
  protected readonly defaultMediaType: string

  constructor(options: ObjectRestOptions = {}) {
    super()
    const parsers = new Map<string, BodyParser>([
      ['application/json', ObjectRestService.parseJson],
    ])
    if (options.parsers !== undefined) {
      for (const [k, v] of options.parsers) parsers.set(k.toLowerCase(), v)
    }
    this.parsers = parsers

    const serializers = new Map<string, BodySerializer>([
      ['application/json', ObjectRestService.serializeJson],
    ])
    if (options.serializers !== undefined) {
      for (const [k, v] of options.serializers) serializers.set(k.toLowerCase(), v)
    }
    this.serializers = serializers

    this.defaultMediaType = options.defaultMediaType ?? 'application/json'
  }

  /**
   * Decode the request body to a JS value using the registered
   * parser for `Content-Type`. Stream bodies are buffered first.
   * Called by the server pipeline before the handler runs.
   */
  async parseRequestBody(request: HttpRequest): Promise<HttpRequest> {
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
      throw new BadRequestException(`Invalid ${contentType} body`, { cause: (err as Error).message })
    }
  }

  /**
   * Encode the response body to bytes using the registered serializer
   * for the response's `Content-Type` (or the default media type).
   * Streams and Uint8Arrays are passed through unchanged. Called by
   * the server pipeline after the handler returns.
   */
  serializeResponseBody(response: HttpResponse): HttpResponse {
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
        body: ObjectRestService.serializeJson(body, this.defaultMediaType),
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

  private static serializeJson(value: unknown, _mt: string): Uint8Array {
    return new TextEncoder().encode(JSON.stringify(value))
  }

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
