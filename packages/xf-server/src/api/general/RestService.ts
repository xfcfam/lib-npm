import { StatelessView } from '@xfcfam/xf'
import type { HttpMethod } from '../transfers/HttpMethod.js'
import type { HttpRequest } from '../transfers/HttpRequest.js'
import type { HttpResponse } from '../transfers/HttpResponse.js'
import type { HttpHandler, Route } from '../transfers/Route.js'
import { InternalServerException } from '../transfers/InternalServerException.js'

/**
 * Generalization for Interaction Layer components that expose a set
 * of HTTP endpoints over the local server.
 *
 * Concrete subclasses declare their endpoints by calling
 * `this.handle(method, path, handler)` from within `init()`. The
 * Service maintains an internal list of {@link Route}s; the
 * `RestServerService` reads this list once the Service is initialised
 * and mounts the corresponding routes on the underlying HTTP engine.
 *
 * Body handling is **raw**: the request body arrives either as a
 * `Uint8Array` (when fully buffered) or as a `ReadableStream<Uint8Array>`
 * (when streamed). Likewise, the response body may be any of the
 * shapes documented in {@link HttpResponse} — including a
 * `ReadableStream` for streaming downloads / server-sent events.
 *
 * For the more common case of JSON / XML / CSV REST APIs that work
 * with parsed objects on both sides, extend {@link ObjectRestService}
 * — it adds automatic content-negotiation parsing and serialisation
 * on top of `RestService`.
 *
 * @example
 * ```ts
 * import { RestService, HttpStatusUtils, NotFoundException } from '@xfcfam/xf-server'
 * import { B } from '../../business/B.js'
 *
 * export class UsersRestService extends RestService {
 *   override async init(): Promise<void> {
 *     this.handle('GET', '/users/:id', this.getUser)
 *     this.handle('POST', '/users/:id/avatar', this.uploadAvatar)
 *   }
 *
 *   private async getUser(req): Promise<HttpResponse> {
 *     const user = await B.userBusiness.findById(req.params.id)
 *     if (user === null) throw new NotFoundException(`User ${req.params.id}`)
 *     return { status: HttpStatusUtils.OK, body: user }
 *   }
 *
 *   // Streaming upload: req.body is a ReadableStream<Uint8Array>.
 *   private async uploadAvatar(req): Promise<HttpResponse> {
 *     await B.userBusiness.storeAvatar(req.params.id, req.body)
 *     return { status: HttpStatusUtils.NO_CONTENT }
 *   }
 * }
 * ```
 */
export abstract class RestService extends StatelessView {
  private readonly routes_: Route[] = []

  override async init(): Promise<void> {
    // Subclasses override and call this.handle(...) inside.
  }

  override async terminate(): Promise<void> {}

  /**
   * Register a single endpoint. Typically called from `init()` once
   * per endpoint. The handler is bound to `this` automatically.
   */
  protected handle<TReqBody = unknown, TResBody = unknown>(
    method: HttpMethod,
    path: string,
    handler: HttpHandler<TReqBody, TResBody>,
  ): void {
    this.routes_.push({
      method,
      path,
      handler: handler.bind(this) as HttpHandler,
    })
  }

  /**
   * Read-only view of every route registered by this Service.
   * Consumed by the `RestServerService` at mount time.
   */
  get routes(): readonly Route[] {
    return this.routes_
  }

  // ─── Pipeline hooks (overridable, scoped to this Service) ──

  /**
   * Invoked before the matched handler runs. Override to transform
   * the request (auth headers, body normalisation) per-Service.
   * Return value replaces the request seen by the handler.
   */
  async onRequest<T>(request: HttpRequest<T>): Promise<HttpRequest<T>> {
    return request
  }

  /**
   * Invoked after the handler returns. Override to transform the
   * response per-Service (envelope wrappers, default headers).
   * Return value replaces the response seen by the server.
   */
  async onResponse<T>(_request: HttpRequest, response: HttpResponse<T>): Promise<HttpResponse<T>> {
    return response
  }

  /**
   * Invoked when the handler (or upstream hook) throws. Return an
   * `HttpResponse` to translate the error; return `undefined` to
   * delegate to the next handler in the chain (the global server
   * hook). The default behaviour propagates so the server pipeline
   * can deal with it.
   */
  async onError(_request: HttpRequest, _error: unknown): Promise<HttpResponse | undefined> {
    return undefined
  }

  /**
   * Convenience: build a successful response. Default status 200.
   */
  protected ok<T>(body: T, status = 200, headers?: Record<string, string>): HttpResponse<T> {
    const out: HttpResponse<T> = headers === undefined
      ? { status, body }
      : { status, body, headers }
    return out
  }

  /**
   * Convenience: build a no-body 204. Use after successful mutations
   * that don't return a payload.
   */
  protected noContent(headers?: Record<string, string>): HttpResponse {
    return headers === undefined ? { status: 204 } : { status: 204, headers }
  }

  /**
   * Convenience: throw an `InternalServerException`. Use only when no
   * more specific HttpException applies.
   */
  protected fail(message: string, body?: unknown): never {
    throw new InternalServerException(message, body)
  }
}
