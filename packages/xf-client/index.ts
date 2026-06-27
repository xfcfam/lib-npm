/**
 * `@xfcfam/xf-client` — transport-agnostic **outbound client contract**
 * for the XF Architecture Model (CFAM). The Access-layer counterpart of
 * `@xfcfam/xf-server`.
 *
 * Holds no transport of its own. It defines the abstract contract every
 * concrete `@xfcfam/xf-client-*` package implements, so they all share
 * one lifecycle and one request pipeline regardless of protocol:
 *
 * - **{@link ClientRepository}** — Access-Layer Generalization. Owns the
 *   `onRequest → send → onResponse` pipeline (`call`); leaves `send` and
 *   the wire types abstract for the protocol package.
 * - **Exceptions**: {@link ClientException} (protocol failure — the
 *   remote answered with an error) and {@link ConnectionException}
 *   (transport failure — no response at all).
 *
 * Concrete implementations:
 *
 * - `@xfcfam/xf-client-http` — REST over `ky`.
 * - `@xfcfam/xf-client-grpc` — gRPC over `@grpc/grpc-js` (sketch).
 * - `@xfcfam/xf-client-tcp` / `-udp` — raw sockets (sketch).
 *
 * You typically install a concrete package, not this one directly.
 *
 * See https://xfcfam.org for the full XF specification.
 */

// ── Access Generalization ─────────────────────────────────
export { ClientRepository } from './src/repository/general/ClientRepository.js'

// ── Exceptions ────────────────────────────────────────────
export { ClientException } from './src/repository/transfers/ClientException.js'
export { ConnectionException } from './src/repository/transfers/ConnectionException.js'
