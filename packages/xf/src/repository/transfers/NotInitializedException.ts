/**
 * Access-layer Exception — a Repository (or any lifecycle component)
 * was used before its `init()` ran, or after `terminate()` cleared
 * its state.
 *
 * Surfaced by Repositories whose operational state lives behind a
 * private resource (HTTP client, DB connection, file handle, …) and
 * thus depends on `init()` to be set up. Downstream layers catch and
 * re-throw, or treat as a programmer error.
 */
export class NotInitializedException extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'NotInitializedException'
  }
}
