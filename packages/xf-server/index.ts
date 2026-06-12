/**
 * `@xfcfam/xf-server` — transport-agnostic **server contract** for the
 * XF Architecture Model (CFAM).
 *
 * This package holds no transport of its own. It defines the abstract
 * contract that every concrete `@xfcfam/xf-server-*` package implements,
 * so they all share one lifecycle, one registration model, and one
 * request pipeline regardless of protocol:
 *
 * - **{@link ServerBusiness}** — Business-Layer Generalization. Owns the
 *   route registry and the `onRequest → handler → onResponse` pipeline
 *   (`dispatch`); leaves `listen` / `close` and the address / wire types
 *   abstract for the protocol package.
 * - **{@link EntryService}** — Interaction-Layer Generalization. The base
 *   for entry-point services, with the per-service `wrap()` pipeline.
 * - **Transfers**: {@link Route}, {@link Handler}, {@link ServerException}.
 *
 * Concrete implementations:
 *
 * - `@xfcfam/xf-server-http` — REST / WebSocket / SSE / GraphQL over Fastify.
 * - `@xfcfam/xf-server-grpc` — gRPC over `@grpc/grpc-js` (sketch).
 * - `@xfcfam/xf-server-tcp` / `-udp` — raw sockets (sketch).
 *
 * You typically install a concrete package, not this one directly.
 *
 * See https://xfcfam.org for the full XF specification.
 */

// ── Business Generalization ───────────────────────────────
export { ServerBusiness } from './src/business/general/ServerBusiness.js'
export type { ServerState } from './src/business/general/ServerBusiness.js'

// ── Interaction Generalization ────────────────────────────
export { EntryService } from './src/api/general/EntryService.js'

// ── Transfers ─────────────────────────────────────────────
export type { Route } from './src/business/transfers/Route.js'
export type { Handler } from './src/business/transfers/Handler.js'
export { ServerException } from './src/business/transfers/ServerException.js'
