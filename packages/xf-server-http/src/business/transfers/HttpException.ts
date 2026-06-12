import { ServerException } from '@xfcfam/xf-server'

/**
 * Business-layer Exception — base class for typed HTTP errors raised
 * inside a handler. The HTTP specialisation of the transport-agnostic
 * {@link ServerException}: it adds the numeric HTTP `status` that the
 * server maps onto the wire.
 *
 * The server pipeline catches every `HttpException`, reads its
 * `status` and `body`, and writes the corresponding HTTP response.
 * Subclasses for common cases (`BadRequestException`,
 * `NotFoundException`, …) preset the status; custom domain errors can
 * extend this class with any status and shape.
 *
 * Non-`HttpException` errors raised by a handler are routed to the
 * `onError` hooks; if no hook produces a response, the server emits a
 * generic `500 Internal Server Error`.
 */
export class HttpException extends ServerException {
  /** HTTP status code to send to the client. */
  readonly status: number

  constructor(status: number, message: string, body?: unknown) {
    super(message, body)
    this.name = 'HttpException'
    this.status = status
  }
}
