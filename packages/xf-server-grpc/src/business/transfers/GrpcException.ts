import { ServerException } from '@xfcfam/xf-server'

/**
 * Business-layer Exception — the gRPC specialisation of the
 * transport-agnostic {@link ServerException}. Adds the numeric gRPC
 * status `code` the server maps onto the RPC trailers (e.g. `5` =
 * `NOT_FOUND`, `7` = `PERMISSION_DENIED`, `13` = `INTERNAL`).
 *
 * Throw inside a handler; the server reads `code` and `body` and ends
 * the RPC with the corresponding status. Non-`GrpcException` errors
 * become `INTERNAL` (13).
 */
export class GrpcException extends ServerException {
  /** gRPC status code (0 = OK). */
  readonly code: number

  constructor(code: number, message: string, body?: unknown) {
    super(message, body)
    this.name = 'GrpcException'
    this.code = code
  }
}
