import { HttpException } from './HttpException.js'

/**
 * Interaction-layer Exception — HTTP 404.
 *
 * The requested resource does not exist.
 *
 * Use `throw new NotFoundException('message')` inside a handler; the
 * server pipeline translates it into a 404 response automatically.
 */
export class NotFoundException extends HttpException {
  constructor(message: string, body?: unknown) {
    super(404, message, body)
    this.name = 'NotFoundException'
  }
}
