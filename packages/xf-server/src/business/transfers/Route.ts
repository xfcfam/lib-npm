import type { Handler } from './Handler.js'

/**
 * Business-layer Transfer — a single inbound entry-point registration,
 * transport-agnostic.
 *
 * A `Route` binds an **address** to a **handler**. What an address *is*
 * depends on the protocol and is the whole point of the `TAddr` type
 * parameter:
 *
 * - HTTP    → `{ method, path }` (e.g. `GET /users/:id`)
 * - gRPC    → `{ service, method }` (e.g. `users.UserService/Get`)
 * - raw TCP → a connection (no address; a single catch-all handler)
 * - UDP     → a datagram (no address; a single message handler)
 *
 * The core {@link ServerBusiness} keeps a list of `Route`s in its state
 * and mounts them on the underlying transport when it starts. Protocol
 * packages rarely expose `Route` literals to users — they provide
 * ergonomic helpers (`get`, `post`, `service`, …) that build the
 * address and call the protected `register`.
 *
 * @typeParam TAddr  Protocol-specific address type.
 * @typeParam TReq   Protocol-specific request type.
 * @typeParam TRes   Protocol-specific response type.
 */
export interface Route<TAddr, TReq = unknown, TRes = unknown> {
  /** The protocol-specific address this route answers to. */
  readonly address: TAddr
  /** The function executed when an inbound message matches this address. */
  readonly handler: Handler<TReq, TRes>
}
