/**
 * Access-layer Exception — base class for a typed error a client raises
 * after the remote answered with a *protocol* failure (a non-success
 * status, a gRPC error code, a framed error packet).
 *
 * The mirror of `@xfcfam/xf-server`'s `ServerException`: the contract
 * fixes only that the error carries the remote's machine-readable `body`
 * (whatever the server actually returned — possibly `undefined` for an
 * empty error body). How the wire status maps onto the exception is the
 * protocol package's responsibility; protocol packages subclass this —
 * `@xfcfam/xf-client-http`'s `RestException` adds the HTTP `status`, a
 * gRPC client would add a `code`.
 *
 * A pure transport failure (no response at all) is a
 * `ConnectionException` instead, not a `ClientException`.
 */
export class ClientException extends Error {
  /** The remote's machine-readable payload, as returned (may be `undefined`). */
  readonly body: unknown

  constructor(message: string, body?: unknown) {
    super(message)
    this.name = 'ClientException'
    this.body = body
  }
}
