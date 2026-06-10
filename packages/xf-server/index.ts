/**
 * `@xfcfam/xf-server` — HTTP server Interaction Layer Generalization
 * for the XF Architecture Model (CFAM).
 *
 * Exposes:
 *
 * - **{@link RestService}** — Generalization for raw-body endpoints
 *   (streams or bytes). Use for uploads, downloads, SSE, anything
 *   where the body shape is not a parsed JS object.
 *
 * - **{@link ObjectRestService}** — Same protocol, adds automatic
 *   request parsing and response serialisation by `Content-Type`.
 *   JSON built-in; XML/CSV/YAML pluggable.
 *
 * - **{@link RestServerService}** — Artefact-level server orchestrator.
 *   Concrete subclass declares which Services to expose; the base
 *   starts Fastify in `init()`, shuts down in `terminate()`. Includes
 *   `discover(InjectionClass)` static helper for zero-boilerplate
 *   service registration.
 *
 * - **Transfers**: {@link HttpRequest}, {@link HttpResponse},
 *   {@link Route}, {@link HttpHandler}, {@link HttpMethod},
 *   {@link MultipartPart}.
 *
 * - **Exceptions**: {@link HttpException} (base) +
 *   `BadRequestException`, `UnauthorizedException`,
 *   `ForbiddenException`, `NotFoundException`,
 *   `InternalServerException`.
 *
 * - **Utilities**: {@link HttpStatusUtils} (status code constants),
 *   {@link SchemaValidatorUtils} (duck-typed validation),
 *   {@link FileResponseUtils} (attachment / inline / stream helpers).
 *
 * See https://xfcfam.org for the full XF specification.
 */

// ── Interaction Generalizations ───────────────────────────
export { RestService } from './src/api/general/RestService.js'
export { ObjectRestService } from './src/api/general/ObjectRestService.js'
export type {
  ObjectRestOptions,
  BodyParser,
  BodySerializer,
} from './src/api/general/ObjectRestService.js'
export { RestServerService } from './src/api/general/RestServerService.js'
export type { RestServerOptions, MultipartConfig } from './src/api/general/RestServerService.js'

// ── Transfers ─────────────────────────────────────────────
export type { HttpMethod } from './src/api/transfers/HttpMethod.js'
export type { HttpRequest } from './src/api/transfers/HttpRequest.js'
export type { HttpResponse } from './src/api/transfers/HttpResponse.js'
export type { Route, HttpHandler } from './src/api/transfers/Route.js'
export type { MultipartPart } from './src/api/transfers/MultipartPart.js'

// ── Exceptions ────────────────────────────────────────────
export { HttpException } from './src/api/transfers/HttpException.js'
export { BadRequestException } from './src/api/transfers/BadRequestException.js'
export { UnauthorizedException } from './src/api/transfers/UnauthorizedException.js'
export { ForbiddenException } from './src/api/transfers/ForbiddenException.js'
export { NotFoundException } from './src/api/transfers/NotFoundException.js'
export { InternalServerException } from './src/api/transfers/InternalServerException.js'

// ── Utilities ─────────────────────────────────────────────
export { HttpStatusUtils } from './src/api/utils/HttpStatusUtils.js'
export { SchemaValidatorUtils } from './src/api/utils/SchemaValidatorUtils.js'
export type { Schema, SchemaParseResult } from './src/api/utils/SchemaValidatorUtils.js'
export { FileResponseUtils } from './src/api/utils/FileResponseUtils.js'
export type { FileBody } from './src/api/utils/FileResponseUtils.js'
export { ResponseUtils } from './src/api/utils/ResponseUtils.js'
