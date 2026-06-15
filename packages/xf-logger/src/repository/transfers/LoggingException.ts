/**
 * Raised when the logging machinery itself fails (a sink cannot be
 * written, a formatter throws). A Transfer of the exception subtype.
 *
 * Logging is best-effort: `LoggerRepository` routes tree failures through
 * its `onError` hook rather than propagating, so a broken sink never
 * crashes the program. This type exists for code that *does* want to
 * surface a logging fault explicitly.
 */
export class LoggingException extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'LoggingException'
  }
}
