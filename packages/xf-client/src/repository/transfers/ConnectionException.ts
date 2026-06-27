/**
 * Access-layer Exception — a transport-level failure that prevented a
 * response from ever being received: the remote was unreachable,
 * timed out, or the connection dropped mid-flight.
 *
 * Transport-agnostic: HTTP (DNS / TLS / socket / timeout), gRPC
 * (`UNAVAILABLE`), raw TCP/UDP (connect / send errors) all surface as
 * a `ConnectionException`. Distinct from a *protocol* error where the
 * remote answered with a failing status — that is the protocol
 * package's own exception (e.g. `RestException`).
 */
export class ConnectionException extends Error {
  /** The originating low-level error. */
  override readonly cause: unknown
  /** Coarse failure kind, useful for retry policies. */
  readonly kind: 'timeout' | 'connect' | 'network'
  /** The originating request (protocol-specific shape), when available. */
  readonly request?: unknown

  constructor(cause: unknown, kind: 'timeout' | 'connect' | 'network', request?: unknown) {
    super(`Connection ${kind}`)
    this.name = 'ConnectionException'
    this.cause = cause
    this.kind = kind
    if (request !== undefined) this.request = request
  }
}
