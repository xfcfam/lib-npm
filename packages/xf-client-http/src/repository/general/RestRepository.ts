import { ClientRepository } from '@xfcfam/xf-client'
import { NotInitializedException } from '@xfcfam/xf'
import ky, { HTTPError, TimeoutError, type KyInstance, type Options as KyOptions } from 'ky'
import type { Request } from '../transfers/Request.js'
import type { HttpResponse } from '../transfers/HttpResponse.js'
import { RestException } from '../transfers/RestException.js'
import { ConnectionException } from '../transfers/ConnectionException.js'
import { ParseUtils, type Parser } from '../utils/ParseUtils.js'
import { SerializeUtils, type Serializer } from '../utils/SerializeUtils.js'
import { ReviverUtils, type Reviver } from '../utils/ReviverUtils.js'

/**
 * Configuration accepted by {@link RestRepository}'s constructor. All
 * fields are optional. (Pipeline hooks — `onRequest` / `onResponse` /
 * `onError` — are overridable methods inherited from
 * `@xfcfam/xf-client`'s `ClientRepository`, not options.)
 */
export interface RestOptions {
  /** Headers applied to every request. Per-request headers in {@link Request.headers} are merged on top. */
  defaultHeaders?: Record<string, string>
  /** Per-request timeout in milliseconds. */
  timeout?: number
  /**
   * Response Content-Type → {@link Parser} map. Keys are matched
   * case-insensitively against the response media type. User entries
   * override the built-in JSON / text routing.
   */
  parsers?: Record<string, Parser>
  /**
   * Request Content-Type → {@link Serializer} map for outbound bodies —
   * the request-side mirror of {@link parsers}.
   */
  serializers?: Record<string, Serializer>
  /** Reviver applied to the parsed response (and to parsed error bodies). */
  reviver?: Reviver
}

/**
 * Access-Layer Generalization for components that talk to an external
 * service over HTTP/REST — the `ky` implementation of the
 * `@xfcfam/xf-client` contract, and the client-side counterpart of
 * `@xfcfam/xf-server-http`.
 *
 * The concrete component supplies a `baseUrl` (and optional
 * {@link RestOptions}) and exposes business-meaningful methods that call
 * into {@link get} / {@link post} / {@link put} / {@link del} / `call`.
 * `call` (inherited from `ClientRepository`) runs the
 * `onRequest → send → onResponse` pipeline; {@link send} performs the
 * actual `ky` dispatch.
 *
 * Every call resolves to the complete {@link HttpResponse}
 * (`status` / `headers` / `body`). A 2xx `body` is the parsed value
 * (header-based parsing by `Content-Type`), or the raw
 * `ReadableStream<Uint8Array>` when `request.stream === true`. A non-2xx
 * response is raised as a {@link RestException}; a transport failure as a
 * {@link ConnectionException}.
 *
 * @example
 * ```ts
 * import { RestRepository, ReviverUtils } from '@xfcfam/xf-client-http'
 *
 * export class UsersRestRepository extends RestRepository {
 *   constructor() {
 *     super('https://api.example.com', { reviver: ReviverUtils.isoDateReviver })
 *   }
 *   async getUser(id: string): Promise<User> {
 *     return (await this.get<User>(`/users/${id}`)).body
 *   }
 * }
 * ```
 */
export abstract class RestRepository extends ClientRepository<Request, HttpResponse<unknown>> {
  /** Base URL prepended to every {@link Request.path}. */
  protected readonly baseUrl: string
  /** Options provided at construction time. */
  protected readonly options: RestOptions

  /** Per-instance HTTP client. Created in {@link init}. */
  private client: KyInstance | undefined = undefined

  /**
   * @param baseUrl  Base URL of the remote service (no trailing slash).
   * @param options  Default headers, timeout, parsers, serializers, reviver.
   */
  constructor(baseUrl: string, options: RestOptions = {}) {
    super()
    this.baseUrl = baseUrl
    this.options = options
  }

  /** Create the internal `ky` HTTP client. Idempotent. */
  override async init(): Promise<void> {
    if (this.client !== undefined) return
    const opts: KyOptions = { prefix: this.baseUrl }
    if (this.options.defaultHeaders !== undefined) opts.headers = this.options.defaultHeaders
    if (this.options.timeout !== undefined) opts.timeout = this.options.timeout
    this.client = ky.create(opts)
  }

  /** Discard the internal `ky` HTTP client, releasing it for GC. */
  override async terminate(): Promise<void> {
    this.client = undefined
  }

  /** Issue a `GET` request. Returns the complete {@link HttpResponse}. */
  async get<R = unknown>(path: string, query?: Request['query'], headers?: Request['headers']): Promise<HttpResponse<R>> {
    return this.call({ method: 'GET', path, ...(query !== undefined ? { query } : {}), ...(headers !== undefined ? { headers } : {}) }) as Promise<HttpResponse<R>>
  }

  /** Issue a `POST` request with optional body. Returns the complete {@link HttpResponse}. */
  async post<R = unknown>(path: string, body?: unknown, headers?: Request['headers']): Promise<HttpResponse<R>> {
    return this.call({ method: 'POST', path, ...(body !== undefined ? { body } : {}), ...(headers !== undefined ? { headers } : {}) }) as Promise<HttpResponse<R>>
  }

  /** Issue a `PUT` request with optional body. Returns the complete {@link HttpResponse}. */
  async put<R = unknown>(path: string, body?: unknown, headers?: Request['headers']): Promise<HttpResponse<R>> {
    return this.call({ method: 'PUT', path, ...(body !== undefined ? { body } : {}), ...(headers !== undefined ? { headers } : {}) }) as Promise<HttpResponse<R>>
  }

  /** Issue a `DELETE` request. Returns the complete {@link HttpResponse}. */
  async del<R = unknown>(path: string, headers?: Request['headers']): Promise<HttpResponse<R>> {
    return this.call({ method: 'DELETE', path, ...(headers !== undefined ? { headers } : {}) }) as Promise<HttpResponse<R>>
  }

  /**
   * Transport dispatch — the `ky` call. Wrapped by `ClientRepository.call`
   * in the `onRequest → send → onResponse` pipeline. On a 2xx response
   * returns the complete {@link HttpResponse}; a non-2xx is thrown as a
   * {@link RestException}, a transport failure as a {@link ConnectionException}.
   */
  protected async send(request: Request): Promise<HttpResponse<unknown>> {
    if (this.client === undefined) {
      throw new NotInitializedException('RestRepository: init() was not called')
    }

    const path = request.path.replace(/^\//, '')
    const kyOpts: KyOptions = { method: request.method }
    if (request.headers !== undefined) kyOpts.headers = request.headers
    if (request.query !== undefined) kyOpts.searchParams = this.serializeQuery(request.query)
    if (request.body !== undefined) await this.encodeBody(request, kyOpts)

    try {
      const response = await this.client(path, kyOpts)
      const body = request.stream === true
        ? (response.body as unknown) // raw ReadableStream<Uint8Array> | null — not buffered/parsed
        : await this.parseResponseBody(response)
      return { status: response.status, headers: this.collectHeaders(response.headers), body }
    } catch (err) {
      throw await this.translateError(err, request)
    }
  }

  private serializeQuery(query: NonNullable<Request['query']>): Record<string, string> {
    const out: Record<string, string> = {}
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined) out[k] = String(v)
    }
    return out
  }

  /** Encode the request body onto `kyOpts`, agnostic to the wire format. */
  private async encodeBody(req: Request, kyOpts: KyOptions): Promise<void> {
    const contentType = this.headerValue(req.headers, 'content-type')
    const serializer =
      contentType !== undefined
        ? SerializeUtils.pickSerializer(contentType, this.options.serializers ?? {})
        : undefined

    if (serializer !== undefined) {
      kyOpts.body = await serializer(req.body)
    } else if (SerializeUtils.isEncoded(req.body)) {
      kyOpts.body = req.body
    } else {
      kyOpts.json = req.body
    }
  }

  /** Case-insensitive lookup of a single request header value. */
  private headerValue(headers: Request['headers'], name: string): string | undefined {
    if (headers === undefined) return undefined
    const lower = name.toLowerCase()
    for (const key of Object.keys(headers)) {
      if (key.toLowerCase() === lower) return headers[key]
    }
    return undefined
  }

  /** Collect a `Headers` object into a plain lowercased-key record. */
  private collectHeaders(headers: Headers): Record<string, string> {
    const out: Record<string, string> = {}
    headers.forEach((value, key) => { out[key] = value })
    return out
  }

  private async parseResponseBody(response: Response): Promise<unknown> {
    if (response.status === 204) return null
    const text = await response.text()
    if (text.length === 0) return null
    const parser = ParseUtils.pickParser(response.headers.get('content-type') ?? '', this.options.parsers ?? {})
    let value = await parser(text)
    if (this.options.reviver !== undefined) value = ReviverUtils.walkReviver(value, this.options.reviver)
    return value
  }

  private async translateError(err: unknown, req: Request): Promise<RestException | ConnectionException> {
    if (err instanceof HTTPError) {
      let body: unknown = err.data
      if (body !== undefined && this.options.reviver !== undefined) {
        body = ReviverUtils.walkReviver(body, this.options.reviver)
      }
      return new RestException(
        err.response.status,
        err.response.statusText,
        this.collectHeaders(err.response.headers),
        body,
        req,
      )
    }
    if (err instanceof TimeoutError) {
      return new ConnectionException(err, 'timeout', req)
    }
    return new ConnectionException(err, 'network', req)
  }
}
