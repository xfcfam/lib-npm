import { HttpException } from './HttpException.js'

/**
 * Interaction-layer Exception — HTTP 403.
 *
 * Authentication succeeded but the principal is not allowed to perform the action.
 *
 * Use `throw new ForbiddenException('message')` inside a handler; the
 * server pipeline translates it into a 403 response automatically.
 */
export class ForbiddenException extends HttpException {
  constructor(message: string, body?: unknown) {
    super(403, message, body)
    this.name = 'ForbiddenException'
  }
}
