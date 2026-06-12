import { HttpException } from './HttpException.js'

/**
 * Interaction-layer Exception — HTTP 401.
 *
 * Authentication failed or not provided. The client must authenticate to retry.
 *
 * Use `throw new UnauthorizedException('message')` inside a handler; the
 * server pipeline translates it into a 401 response automatically.
 */
export class UnauthorizedException extends HttpException {
  constructor(message: string, body?: unknown) {
    super(401, message, body)
    this.name = 'UnauthorizedException'
  }
}
