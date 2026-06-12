import { HttpException } from './HttpException.js'

/**
 * Interaction-layer Exception — HTTP 500.
 *
 * An unexpected condition prevented the server from fulfilling the request.
 *
 * Use `throw new InternalServerException('message')` inside a handler; the
 * server pipeline translates it into a 500 response automatically.
 */
export class InternalServerException extends HttpException {
  constructor(message: string, body?: unknown) {
    super(500, message, body)
    this.name = 'InternalServerException'
  }
}
