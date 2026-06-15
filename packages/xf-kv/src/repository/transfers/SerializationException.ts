import { KeyValueException } from './KeyValueException.js'

/**
 * Thrown when the configured value codec fails to **encode** a value
 * before a write or **decode** a raw payload after a read (e.g. invalid
 * JSON in the store). The original codec error is preserved as
 * `Error.cause`.
 */
export class SerializationException extends KeyValueException {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'SerializationException'
  }
}
