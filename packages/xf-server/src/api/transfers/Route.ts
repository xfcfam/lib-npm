import type { HttpMethod } from './HttpMethod.js'
import type { HttpRequest } from './HttpRequest.js'
import type { HttpResponse } from './HttpResponse.js'

/**
 * Function signature of every HTTP handler registered on a
 * `RestService`. The handler receives a fully decoded `HttpRequest`
 * and returns the `HttpResponse` to send back. May be async — the
 * server `await`s it.
 */
export type HttpHandler<TReqBody = unknown, TResBody = unknown> = (
  request: HttpRequest<TReqBody>,
) => Promise<HttpResponse<TResBody>> | HttpResponse<TResBody>

/**
 * Interaction-layer Transfer — a single endpoint registration.
 *
 * Built internally by `RestService.handle(...)`; the
 * `RestServerService` reads the resulting list of `Route`s and mounts
 * them on the underlying HTTP engine (Fastify in v0). External code
 * rarely constructs `Route` literals — use the `handle()` helper on
 * the Service instead.
 */
export interface Route {
  /** HTTP method (`GET`, `POST`, …). */
  readonly method: HttpMethod
  /** URL path pattern (Fastify syntax: `/users/:id`). */
  readonly path: string
  /** The function executed when this route matches. */
  readonly handler: HttpHandler
}
