/**
 * Business-layer Exception — base class for typed errors raised inside
 * an entry-point handler, transport-agnostic.
 *
 * The core defines only the *contract*: an error that carries a
 * machine-readable `body` to be surfaced to the caller. How that body
 * is mapped onto the wire — an HTTP status, a gRPC status code, a
 * framed error packet — is the protocol package's responsibility,
 * implemented in its `errorToResponse(err)` (see
 * {@link ServerBusiness}).
 *
 * Protocol packages subclass this to add their own metadata. For
 * example, `@xfcfam/xf-server-http`'s `HttpException` adds a numeric
 * HTTP `status`; a gRPC package would add a `code`.
 *
 * Non-`ServerException` errors raised by a handler are routed to the
 * `onError` hooks; if no hook produces a response, the protocol emits
 * its generic "internal error" response.
 */
export class ServerException extends Error {
  /** Machine-readable payload to surface to the caller. Default: `{ message }`. */
  readonly body: unknown

  constructor(message: string, body?: unknown) {
    super(message)
    this.name = 'ServerException'
    this.body = body ?? { message }
  }
}
