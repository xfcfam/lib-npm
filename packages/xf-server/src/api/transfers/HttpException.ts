/**
 * Interaction-layer Exception — base class for typed HTTP errors
 * raised inside a handler.
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
export class HttpException extends Error {
  /** HTTP status code to send to the client. */
  readonly status: number
  /** Response body to send. Default: `{ message }`. */
  readonly body: unknown

  constructor(status: number, message: string, body?: unknown) {
    super(message)
    this.name = 'HttpException'
    this.status = status
    this.body = body ?? { message }
  }
}
