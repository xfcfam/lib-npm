/**
 * A user session held in the key-value cache. A dumb data carrier — it
 * models no behaviour. Lives in the Access layer because the
 * `SessionRepository` stores and returns it.
 */
export interface Session {
  readonly userId: string
  readonly token: string
  readonly createdAt: number
}
