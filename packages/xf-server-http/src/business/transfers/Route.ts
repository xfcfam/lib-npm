import type { HttpMethod } from './HttpMethod.js'
import type { HttpRequest } from './HttpRequest.js'
import type { HttpResponse } from './HttpResponse.js'

/**
 * Business-layer Transfer — the HTTP address a route answers to: the
 * `{ method, path }` pair. This is the concrete `TAddr` the HTTP server
 * supplies to the generic `Route<TAddr, …>` of `@xfcfam/xf-server`.
 */
export interface HttpAddress {
  /** HTTP method (`GET`, `POST`, …). */
  readonly method: HttpMethod
  /** URL path pattern (Fastify syntax: `/users/:id`). */
  readonly path: string
}

/**
 * Function signature of every HTTP handler registered on a
 * `RestService`. The handler receives a fully decoded `HttpRequest`
 * and returns the `HttpResponse` to send back. May be async — the
 * server `await`s it.
 *
 * Structurally a `Handler<HttpRequest, HttpResponse>` from
 * `@xfcfam/xf-server`, with optional per-handler body typing.
 */
export type HttpHandler<TReqBody = unknown, TResBody = unknown> = (
  request: HttpRequest<TReqBody>,
) => Promise<HttpResponse<TResBody>> | HttpResponse<TResBody>
