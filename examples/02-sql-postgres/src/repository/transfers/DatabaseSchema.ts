import type { Generated } from 'kysely'

/**
 * Kysely-typed schema of the underlying Postgres database.
 *
 * One TS interface per table. Column types are written in the
 * "raw" database shape (snake_case, native types). The Business
 * Layer never sees this interface — it stays inside the Access
 * Layer's Repositories.
 */
export interface DatabaseSchema {
  users: {
    id:         Generated<number>
    name:       string
    email:      string
    created_at: Generated<Date>
  }
}
