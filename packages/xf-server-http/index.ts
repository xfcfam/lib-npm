/**
 * `@xfcfam/xf-server-http` — HTTP transport for the XF Architecture
 * Model (CFAM). The Fastify implementation of the `@xfcfam/xf-server`
 * contract.
 *
 * Exposes:
 *
 * - **{@link HttpServerBusiness}** — Business-Layer orchestrator. Owns
 *   the Fastify lifecycle and the route registry. Concrete subclasses
 *   live in the Business Layer; services push routes to it from their
 *   own `init()` via `B.server.get(path, handler)`.
 *
 * - **{@link RestService}** — Interaction Generalization for raw-body
 *   endpoints (streams or bytes). Provides `wrap(handler)`.
 *
 * - **{@link ObjectRestService}** — Same protocol, adds automatic
 *   request parsing and response serialisation by `Content-Type` via
 *   `object(handler)`. JSON built-in; XML/CSV/YAML pluggable;
 *   developer-chosen date handling.
 *
 * - **Transfers**: {@link HttpRequest}, {@link HttpResponse},
 *   {@link HttpAddress}, {@link HttpHandler}, {@link HttpMethod},
 *   {@link MultipartPart}.
 *
 * - **Exceptions**: {@link HttpException} (base) +
 *   `BadRequestException`, `UnauthorizedException`,
 *   `ForbiddenException`, `NotFoundException`,
 *   `InternalServerException`.
 *
 * - **Utilities**: {@link HttpStatusUtils}, {@link SchemaValidatorUtils},
 *   {@link FileResponseUtils}, {@link ResponseUtils}.
 *
 * See https://xfcfam.org for the full XF specification.
 */

// ── Business Generalization ───────────────────────────────
export { HttpServerBusiness } from './src/business/general/HttpServerBusiness.js'
export type { ServerOptions, MultipartConfig } from './src/business/general/HttpServerBusiness.js'

// ── Interaction Generalizations ───────────────────────────
export { RestService } from './src/api/general/RestService.js'
export { ObjectRestService } from './src/api/general/ObjectRestService.js'
export type {
  ObjectRestOptions,
  BodyParser,
  BodySerializer,
} from './src/api/general/ObjectRestService.js'
export { WebSocketService } from './src/api/general/WebSocketService.js'
export { GraphQLService } from './src/api/general/GraphQLService.js'

// ── Transfers ─────────────────────────────────────────────
export type { HttpMethod } from './src/business/transfers/HttpMethod.js'
export type { HttpRequest } from './src/business/transfers/HttpRequest.js'
export type { HttpResponse } from './src/business/transfers/HttpResponse.js'
export type { HttpAddress, HttpHandler } from './src/business/transfers/Route.js'
export type { MultipartPart } from './src/business/transfers/MultipartPart.js'
export type { WebSocketConnection, WebSocketHandler } from './src/business/transfers/WebSocketConnection.js'
export type { GraphQLConfig } from './src/business/transfers/GraphQLConfig.js'

// ── Exceptions ────────────────────────────────────────────
export { HttpException } from './src/business/transfers/HttpException.js'
export { BadRequestException } from './src/business/transfers/BadRequestException.js'
export { UnauthorizedException } from './src/business/transfers/UnauthorizedException.js'
export { ForbiddenException } from './src/business/transfers/ForbiddenException.js'
export { NotFoundException } from './src/business/transfers/NotFoundException.js'
export { InternalServerException } from './src/business/transfers/InternalServerException.js'

// ── Utilities ─────────────────────────────────────────────
export { HttpStatusUtils } from './src/api/utils/HttpStatusUtils.js'
export { SchemaValidatorUtils } from './src/api/utils/SchemaValidatorUtils.js'
export type { Schema, SchemaParseResult } from './src/api/utils/SchemaValidatorUtils.js'
export { FileResponseUtils } from './src/api/utils/FileResponseUtils.js'
export type { FileBody } from './src/api/utils/FileResponseUtils.js'
export { ResponseUtils } from './src/api/utils/ResponseUtils.js'
export { SseUtils } from './src/api/utils/SseUtils.js'
export type { ServerSentEvent } from './src/api/utils/SseUtils.js'
