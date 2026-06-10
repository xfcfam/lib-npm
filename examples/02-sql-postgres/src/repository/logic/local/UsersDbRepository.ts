import { PostgresDatabaseRepository } from '@xfcfam/xf-sql-postgres'
import { UniqueViolationException } from '@xfcfam/xf-sql'
import type { DatabaseSchema } from '../../transfers/DatabaseSchema'
import type { User } from '../../transfers/User'

/**
 * Access Layer Logical for the `users` table.
 *
 * Extends `PostgresDatabaseRepository` (xf-sql-postgres) so we get
 * Postgres dialect wiring + automatic SQLSTATE → typed exception
 * translation. Knows the URL/connection of the database and the
 * shape of the table — and nothing else. No domain rules.
 *
 * Maps between the database shape (`snake_case` columns) and the
 * `User` Transfer object the Business Layer expects.
 */
export class UsersDbRepository extends PostgresDatabaseRepository<DatabaseSchema> {
  constructor() {
    super({
      connectionString: process.env['DATABASE_URL'] ?? 'postgres://xf:xf@localhost:5432/xfdemo',
      pool: { max: 5, idleTimeoutMillis: 30_000 },
    })
  }

  override async init()      { await super.init() }
  override async terminate() { await super.terminate() }

  async fetchAll(): Promise<User[]> {
    const rows = await this.exec(() =>
      this.db.selectFrom('users').selectAll().orderBy('id').execute()
    )
    return rows.map(UsersDbRepository.rowToUser)
  }

  async fetchById(id: number): Promise<User> {
    const row = await this.exec(() =>
      this.db.selectFrom('users').where('id', '=', id).selectAll().executeTakeFirstOrThrow()
    )
    return UsersDbRepository.rowToUser(row)
  }

  async create(input: { name: string; email: string }): Promise<User> {
    try {
      const row = await this.exec(() =>
        this.db.insertInto('users').values(input).returningAll().executeTakeFirstOrThrow()
      )
      return UsersDbRepository.rowToUser(row)
    } catch (err) {
      if (err instanceof UniqueViolationException && err.constraint === 'users_email_key') {
        // Bubble up with a clearer message — Business will branch on the type.
        throw new UniqueViolationException(`Email already exists: ${input.email}`, {
          constraint: 'users_email_key',
          table: 'users',
          column: 'email',
          cause: err.cause,
        })
      }
      throw err
    }
  }

  private static rowToUser(row: {
    id: number
    name: string
    email: string
    created_at: Date
  }): User {
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      createdAt: row.created_at,
    }
  }
}
