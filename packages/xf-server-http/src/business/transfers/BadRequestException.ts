import { HttpException } from './HttpException.js'

/**
 * Interaction-layer Exception — HTTP 400.
 *
 * Client error — the request is malformed (missing fields, invalid types, validation failure).
 *
 * Use `throw new BadRequestException('message')` inside a handler; the
 * server pipeline translates it into a 400 response automatically.
 */
export class BadRequestException extends HttpException {
  constructor(message: string, body?: unknown) {
    super(400, message, body)
    this.name = 'BadRequestException'
  }
}
