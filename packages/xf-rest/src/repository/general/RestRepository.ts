import { Repository, NotInitializedException } from '@xfcfam/xf'
import ky, { HTTPError, TimeoutError, type KyInstance, type Options as KyOptions } from 'ky'
import type { Request } from '../transfers/Request.js'
import { RestException } from '../transfers/RestException.js'
import { ConnectionException } from '../transfers/ConnectionException.js'
import { ParseUtils, type Parser } from '../utils/ParseUtils.js'
import { ReviverUtils, type Reviver } from '../utils/ReviverUtils.js'

/**
 * Configuration accepted by {@link RestRepository}'s constructor.
 *
 * All fields are optional. Hooks are invoked in the order:
 * `interceptor → onRequest → (HTTP call) → onResponse | onError`.
 */
export interface RestOptions {
  /** Headers applied to every request. Per-request headers in {@link Request.headers} are merged on top. */
  defaultHeaders?: Record<string, string>
  /** Per-request timeout in milliseconds. */
  timeout?: number
  /**
   * Transform hook. Receives the {@link Request} BEFORE it is
   * dispatched and may return a modified copy. Use this to add
   * authentication headers, rewrite paths, sign payloads, etc.
   * Runs exactly once per `call()`, before any retry attempts.
   */
  interceptor?: (request: Request) => Request | Promise<Request>
  /** Observer hook. Notified with the (post-interceptor) request. */
  onRequest?: (request: Request) => void | Promise<void>
  /** Observer hook. Notified with the raw `Response` and the originating request. */
  onResponse?: (response: Response, request: Request) => void | Promise<void>
  /** Observer hook. Notified with the translated {@link RestException} or {@link ConnectionException}. */
  onError?: (error: RestException | ConnectionException) => void | Promise<void>
  /**
   * Content-Type → {@link Parser} map. Keys are matched
   * case-insensitively against the response media type (the part of
   * `content-type` before any `;` parameters). User entries override
   * the built-in JSON / text routing.
   */
  parsers?: Record<string, Parser>
  /**
   * Reviver applied to the parsed response (and to parsed error
   * bodies). Walks the value tree depth-first. Combine
   * `ReviverUtils.isoDateReviver` with project-specific revivers via
   * `ReviverUtils.composeRevivers`.
   */
  reviver?: Reviver
}

/**
 * Generalization for Access Layer components that talk to an external
 * service over REST.
 *
 * The concrete component supplies a `baseUrl` (and optional
 * {@link RestOptions}) in its constructor and exposes business-meaningful
 * methods that call into the {@link get} / {@link post} / {@link put} /
 * {@link del} / {@link call} helpers provided by the base class.
 *
 * Under the hood the request is dispatched through `ky`. xf-rest
 * translates `ky`'s `HTTPError` and `TimeoutError` into the XF Transfer
 * objects {@link RestException} and {@link ConnectionException} so the
 * Business Layer never sees library-specific error shapes.
 *
 * Response bodies are parsed according to their `Content-Type` header:
 * built-in support for JSON (including `*+json` variants) and plain
 * text via {@link ParseUtils}. Register additional parsers via
 * {@link RestOptions.parsers}. Apply post-parse transformations —
 * typically date revival — via {@link RestOptions.reviver}.
 *
 * The internal HTTP client is lazily created on first use (or
 * eagerly in {@link init}). Subclasses that override `init()` or
 * `terminate()` may freely add their own setup/teardown.
 *
 * @example
 * ```ts
 * import { RestRepository, ReviverUtils } from '@xfcfam/xf-rest'
 *
 * export class UsersRestRepository extends RestRepository {
 *   constructor() {
 *     super('https://api.example.com', {
 *       defaultHeaders: { Accept: 'application/json' },
 *       timeout: 10_000,
 *       reviver: ReviverUtils.isoDateReviver,
 *     })
 *   }
 *
 *   getUser(id: string) { return this.get<User>(`/users/${id}`) }
 * }
 * ```
 */
export abstract class RestRepository extends Repository<null> {
  /** Base URL prepended to every {@link Request.path}. */
  protected readonly baseUrl: string
  /** Options provided at construction time. */
  protected readonly options: RestOptions

  /** Per-instance HTTP client. Created in {@link init}. */
  private client: KyInstance | undefined = undefined

  /**
   * @param baseUrl  Base URL of the remote service (no trailing slash).
   * @param options  Default headers, timeout, hooks, parsers, reviver.
   */
  constructor(baseUrl: string, options: RestOptions = {}) {
    super(null)
    this.baseUrl = baseUrl
    this.options = options
  }

  /**
   * Create the internal `ky` HTTP client. Idempotent: if the client
   * has already been created by a previous `init()` call, this method
   * returns immediately without recreating it.
   *
   * Subclasses that override `init()` MUST call `await super.init()`
   * first.
   */
  async init(): Promise<void> {
    if (this.client !== undefined) return
    // ky v2 renamed `prefixUrl` → `prefix`. `prefix` keeps v1's
    // slash-join semantics (the full base path is preserved, unlike
    // `baseUrl`, which uses web-standard relative resolution and would
    // drop a non-trailing-slash path segment).
    const opts: KyOptions = { prefix: this.baseUrl }
    if (this.options.defaultHeaders !== undefined) opts.headers = this.options.defaultHeaders
    if (this.options.timeout !== undefined) opts.timeout = this.options.timeout
    this.client = ky.create(opts)
  }

  /** Discard the internal `ky` HTTP client, releasing it for GC. */
  async terminate(): Promise<void> {
    this.client = undefined
  }

  /** Issue a `GET` request. */
  async get<R = unknown>(path: string, query?: Request['query'], headers?: Request['headers']): Promise<R> {
    return this.call<R>({ method: 'GET', path, ...(query !== undefined ? { query } : {}), ...(headers !== undefined ? { headers } : {}) })
  }

  /** Issue a `POST` request with optional JSON body. */
  async post<R = unknown>(path: string, body?: unknown, headers?: Request['headers']): Promise<R> {
    return this.call<R>({ method: 'POST', path, ...(body !== undefined ? { body } : {}), ...(headers !== undefined ? { headers } : {}) })
  }

  /** Issue a `PUT` request with optional JSON body. */
  async put<R = unknown>(path: string, body?: unknown, headers?: Request['headers']): Promise<R> {
    return this.call<R>({ method: 'PUT', path, ...(body !== undefined ? { body } : {}), ...(headers !== undefined ? { headers } : {}) })
  }

  /** Issue a `DELETE` request. Named `del` because `delete` is a reserved word. */
  async del<R = unknown>(path: string, headers?: Request['headers']): Promise<R> {
    return this.call<R>({ method: 'DELETE', path, ...(headers !== undefined ? { headers } : {}) })
  }

  /**
   * Issue a fully-described {@link Request}. The base helpers
   * ({@link get}, {@link post}, {@link put}, {@link del}) all funnel
   * through this method.
   */
  async call<R = unknown>(request: Request): Promise<R> {
    if (this.client === undefined) {
      throw new NotInitializedException('RestRepository: init() was not called')
    }

    let req = request
    if (this.options.interceptor !== undefined) req = await this.options.interceptor(req)
    if (this.options.onRequest !== undefined) await this.options.onRequest(req)

    const path = req.path.replace(/^\//, '')
    const kyOpts: KyOptions = { method: req.method }
    if (req.headers !== undefined) kyOpts.headers = req.headers
    if (req.query !== undefined) kyOpts.searchParams = this.serializeQuery(req.query)
    if (req.body !== undefined) kyOpts.json = req.body

    try {
      const response = await this.client(path, kyOpts)
      if (this.options.onResponse !== undefined) await this.options.onResponse(response, req)
      return (await this.parseResponseBody(response)) as R
    } catch (err) {
      const translated = await this.translateError(err, req)
      if (this.options.onError !== undefined) await this.options.onError(translated)
      throw translated
    }
  }

  private serializeQuery(query: NonNullable<Request['query']>): Record<string, string> {
    const out: Record<string, string> = {}
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined) out[k] = String(v)
    }
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
      // ky v2 auto-consumes the response body to populate `err.data`
      // (JSON parsed by Content-Type, other content types as text,
      // `undefined` when empty or unparsable). The body methods on
      // `err.response` no longer work, so read `err.data` directly;
      // `err.response` remains valid for status / statusText / headers.
      let body: unknown = err.data
      if (body !== undefined && this.options.reviver !== undefined) {
        body = ReviverUtils.walkReviver(body, this.options.reviver)
      }
      return new RestException(err.response.status, err.response.statusText, body, req)
    }
    if (err instanceof TimeoutError) {
      return new ConnectionException(err, req, 'timeout')
    }
    return new ConnectionException(err, req, 'network')
  }
}
