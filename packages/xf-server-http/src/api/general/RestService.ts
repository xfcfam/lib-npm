import { EntryService } from '@xfcfam/xf-server'
import type { HttpRequest } from '../../business/transfers/HttpRequest.js'
import type { HttpResponse } from '../../business/transfers/HttpResponse.js'
import { InternalServerException } from '../../business/transfers/InternalServerException.js'

/**
 * Interaction-Layer Generalization for components that expose a set of
 * HTTP endpoints over the Business-Layer server.
 *
 * The HTTP specialisation of {@link EntryService} (from
 * `@xfcfam/xf-server`): it fixes the request/response types to
 * `HttpRequest` / `HttpResponse` and adds HTTP response builders. The
 * per-service pipeline (`wrap`, `onRequest` / `onResponse` / `onError`)
 * is inherited unchanged.
 *
 * Concrete subclasses register their endpoints by calling
 * `B.server.get(path, this.wrap(handler))` (or `post`, `put`, …) from
 * within `init()`. The server (`HttpServerBusiness`) holds the route
 * registry and starts Fastify; `RestService` contributes handlers via
 * the push registration API.
 *
 * Body handling is **raw**: the request body arrives either as a
 * `Uint8Array` (when fully buffered) or as a `ReadableStream<Uint8Array>`
 * (when streamed). For the common case of JSON REST APIs that work with
 * parsed objects on both sides, extend {@link ObjectRestService} — it
 * adds automatic content-negotiation parsing and serialisation.
 *
 * @example
 * ```ts
 * import { RestService, HttpStatusUtils } from '@xfcfam/xf-server-http'
 * import { B } from '../../business/B.js'
 *
 * export class HealthRestService extends RestService {
 *   override async init(): Promise<void> {
 *     B.server.get('/health', this.wrap(this.health))
 *   }
 *
 *   private async health(_req: HttpRequest): Promise<HttpResponse> {
 *     return { status: HttpStatusUtils.OK, body: { status: 'ok' } }
 *   }
 * }
 * ```
 */
export abstract class RestService extends EntryService<HttpRequest, HttpResponse> {
  /**
   * Convenience: build a successful response. Default status 200.
   */
  protected ok<T>(body: T, headers?: Record<string, string>): HttpResponse<T> {
    const out: HttpResponse<T> = headers === undefined
      ? { status: 200, body }
      : { status: 200, body, headers }
    return out
  }

  /**
   * Convenience: build a failure response. Default status 500.
   */
  protected ko<T>(body: T, status = 500, headers?: Record<string, string>): HttpResponse<T> {
    const out: HttpResponse<T> = headers === undefined
      ? { status, body }
      : { status, body, headers }
    return out
  }

  /**
   * Convenience: build a no-body 204. Use after successful mutations
   * that don't return a payload.
   */
  protected empty(headers?: Record<string, string>): HttpResponse {
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
