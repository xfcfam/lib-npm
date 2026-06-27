/**
 * `@xfcfam/xf-client-http` — HTTP outbound client for the XF Architecture
 * Model (CFAM). The `ky` implementation of the `@xfcfam/xf-client`
 * contract, and the client-side counterpart of `@xfcfam/xf-server-http`:
 * REST + GraphQL + WebSocket from one package.
 *
 * - **{@link RestRepository}** / **{@link RetryRestRepository}** — REST
 *   over `ky`. `call` / `get` / `post` / … resolve to the complete
 *   {@link HttpResponse} (`status` / `headers` / `body`). The transport is
 *   content-type agnostic: responses parse by `Content-Type`
 *   (`RestOptions.parsers`); request bodies encode by type / explicit
 *   `Content-Type` (`RestOptions.serializers`). Streaming via
 *   `Request.stream`.
 * - **{@link GraphQLRepository}** — GraphQL over HTTP (extends
 *   `RestRepository`): `query` / `mutate` unwrap `data`, raising a
 *   {@link GraphQLException} on `errors`. Counterpart of the server's
 *   `GraphQLService`.
 * - **{@link WebSocketRepository}** — outbound WebSocket (duplex) over the
 *   platform global `WebSocket`; hands back a {@link WebSocketConnection}.
 *   Counterpart of the server's `WebSocketService`.
 *
 * `@xfcfam/xf` and `@xfcfam/xf-client` are peer dependencies.
 *
 * See https://xfcfam.org for the XF specification.
 */

// ── Access — REST ─────────────────────────────────────────
export { RestRepository } from './src/repository/general/RestRepository.js'
export type { RestOptions } from './src/repository/general/RestRepository.js'
export { RetryRestRepository } from './src/repository/general/RetryRestRepository.js'

// ── Access — GraphQL ──────────────────────────────────────
export { GraphQLRepository } from './src/repository/general/GraphQLRepository.js'
export { GraphQLWsRepository } from './src/repository/general/GraphQLWsRepository.js'
export { GraphQLException } from './src/repository/transfers/GraphQLException.js'
export type { GraphQLRequest, GraphQLResponse, GraphQLError } from './src/repository/transfers/GraphQLMessage.js'
export type { GraphQLSubscriptionSink, GraphQLWsClient } from './src/repository/transfers/GraphQLSubscription.js'

// ── Access — WebSocket ────────────────────────────────────
export { WebSocketRepository } from './src/repository/general/WebSocketRepository.js'
export type { WebSocketConnection, WebSocketHandler } from './src/repository/transfers/WebSocketConnection.js'

// ── Access — SSE ──────────────────────────────────────────
export { SseRepository } from './src/repository/general/SseRepository.js'
export type { ServerSentEvent } from './src/repository/transfers/ServerSentEvent.js'

// ── Access — structs ──────────────────────────────────────
export type { Request, HttpMethod } from './src/repository/transfers/Request.js'
export type { HttpResponse } from './src/repository/transfers/HttpResponse.js'
export { RestException } from './src/repository/transfers/RestException.js'
export { ConnectionException } from './src/repository/transfers/ConnectionException.js'

// ── Access — utils ────────────────────────────────────────
export { ParseUtils } from './src/repository/utils/ParseUtils.js'
export type { Parser } from './src/repository/utils/ParseUtils.js'
export { SerializeUtils } from './src/repository/utils/SerializeUtils.js'
export type { Serializer } from './src/repository/utils/SerializeUtils.js'
export { ReviverUtils } from './src/repository/utils/ReviverUtils.js'
export type { Reviver } from './src/repository/utils/ReviverUtils.js'
