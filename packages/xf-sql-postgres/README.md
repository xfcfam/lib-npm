# `@xfcfam/xf-sql-postgres`

PostgreSQL dialect adapter for [`@xfcfam/xf-sql`](https://www.npmjs.com/package/@xfcfam/xf-sql).
Encapsulates `kysely`'s `PostgresDialect` over the [`pg`](https://node-postgres.com)
driver and ships the SQLSTATE → typed-Exception translation so the
Business Layer never sees `pg` errors.

Peer dependencies: [`@xfcfam/xf`](https://www.npmjs.com/package/@xfcfam/xf),
[`@xfcfam/xf-sql`](https://www.npmjs.com/package/@xfcfam/xf-sql),
[`kysely`](https://kysely.dev).
Runtime dependency: `pg`.

## Install

```bash
pnpm add @xfcfam/xf @xfcfam/xf-sql @xfcfam/xf-sql-postgres kysely pg
```

## What ships here

| Export | Role |
|---|---|
| `PostgresDatabaseRepository<Schema>` | Ready-to-use Access Layer Generalization. Extends `TransactionalDatabaseRepository` from `@xfcfam/xf-sql`. Wires `PostgresDialect` + `pg.Pool`. Overrides `translateError` with the SQLSTATE mapping. |
| `PostgresOptions` | Constructor options: `connectionString`, optional `pool: pg.PoolConfig`. |
| `PostgresErrorUtils` | Static utility class. `translate(err)` maps any `pg`/Kysely error to the corresponding `@xfcfam/xf-sql` Exception. Constants for the SQLSTATEs it recognises (`SQLSTATE_UNIQUE_VIOLATION`, …). |

## Quick usage

```typescript
import { PostgresDatabaseRepository } from '@xfcfam/xf-sql-postgres'
import { UniqueViolationException, ConnectionException } from '@xfcfam/xf-sql'

interface Schema {
  users: {
    id: number
    name: string
    email: string
    created_at: Date
  }
}

export class UsersDb extends PostgresDatabaseRepository<Schema> {
  constructor() {
    super({
      connectionString: process.env.DATABASE_URL!,
      pool: { max: 10, idleTimeoutMillis: 30_000 },
    })
  }
  async init()      { await super.init() }
  async terminate() { await super.terminate() }

  getUser(id: number) {
    return this.exec(() =>
      this.db.selectFrom('users').where('id', '=', id).selectAll().executeTakeFirstOrThrow()
    )
  }

  async createUser(input: { name: string; email: string }) {
    try {
      return await this.exec(() =>
        this.db
          .insertInto('users')
          .values({ ...input, created_at: new Date() })
          .returningAll()
          .executeTakeFirstOrThrow()
      )
    } catch (err) {
      if (err instanceof UniqueViolationException && err.column === 'email') {
        throw new DomainError('Email already registered')
      }
      throw err
    }
  }

  async transferOrder(orderId: number, newOwner: number) {
    // transaction() commits on success, rolls back on throw.
    return this.transaction(async (trx) => {
      await trx.updateTable('orders').set({ owner_id: newOwner }).where('id', '=', orderId).execute()
      await trx.insertInto('order_audit').values({ order_id: orderId, action: 'transfer' }).execute()
    })
  }
}
```

## SQLSTATE → Exception mapping

The default `translateError` covers the most common PostgreSQL error
codes. Anything not in this table is returned unchanged (so
implementer-specific exceptions still propagate cleanly).

| SQLSTATE | Postgres condition | Translates to |
|---|---|---|
| `23505` | unique_violation | `UniqueViolationException` |
| `23503` | foreign_key_violation | `ForeignKeyViolationException` |
| `23514` | check_violation | `CheckViolationException` |
| `23502` | not_null_violation | `NotNullViolationException` |
| `40P01` | deadlock_detected | `DeadlockException` |
| `ECONNREFUSED`, `ENOTFOUND`, `ETIMEDOUT`, `ECONNRESET`, `EHOSTUNREACH`, `EAI_AGAIN` | transport-level (not a SQLSTATE) | `ConnectionException` |
| anything else | — | passed through untouched |

When the driver attaches `table`, `column`, `constraint` to the
error, these are forwarded to the Exception so the Business Layer can
branch on them without parsing strings.

## Documentation

- Specification — [xfcfam.org](https://xfcfam.org)
- Kysely docs — [kysely.dev](https://kysely.dev)
- Postgres SQLSTATE codes — [postgresql.org docs](https://www.postgresql.org/docs/current/errcodes-appendix.html)
- Source — [github.com/xfcfam/lib-npm](https://github.com/xfcfam/lib-npm)

## License

MIT.
