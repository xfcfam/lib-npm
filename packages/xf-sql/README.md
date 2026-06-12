# `@xfcfam/xf-sql`

SQL Access Layer Generalization for the **XF Architecture Model**.
Encapsulates the [Kysely](https://kysely.dev) query builder behind a
single XF-canonical class plus a typed Exception hierarchy.

**Dialect-agnostic.** xf-sql talks to any database for which Kysely
has a dialect implementation. Pair it with one of the adapter
packages:

- [`@xfcfam/xf-sql-postgres`](https://www.npmjs.com/package/@xfcfam/xf-sql-postgres) — Postgres via `pg`
- (future) `@xfcfam/xf-sql-mysql`, `@xfcfam/xf-sql-sqlite`, …

Or supply any Kysely `Dialect` directly to `DatabaseRepository`.

Peer dependency: `@xfcfam/xf`. `kysely` is a direct (bundled)
dependency — you never install it separately.

## Install

```bash
pnpm add @xfcfam/xf @xfcfam/xf-sql
# plus one dialect adapter — it bundles its own driver, e.g. Postgres:
pnpm add @xfcfam/xf-sql-postgres
```

## What ships here

| Export | Role |
|---|---|
| `DatabaseRepository<Schema>` | Access Layer Generalization. Constructor `({ dialect })`. Protected `db: Kysely<Schema>`. `exec(op)` wrapper that funnels errors through `translateError`. Overridable hooks: `onConnected`, `onDisconnected`, `onQuery`, `onError`. |
| `TransactionalDatabaseRepository<Schema>` | Adds `transaction(callback)` that commits / rolls back the Kysely transaction and translates errors. Overridable hooks: `onTransactionStart`, `onTransactionCommit`, `onTransactionRollback`. |
| `DatabaseException` | Base class for every typed DB error. |
| `ConnectionException` | Database unreachable (DNS, refused, TLS, timeout). |
| `UniqueViolationException` | `UNIQUE` / `PRIMARY KEY` constraint violated. Carries `constraint`, `table`, `column`. |
| `ForeignKeyViolationException` | `FOREIGN KEY` constraint violated. Carries `constraint`, `table`. |
| `CheckViolationException` | `CHECK` constraint violated. Carries `constraint`, `table`. |
| `NotNullViolationException` | `NOT NULL` column set to `NULL`. Carries `table`, `column`. |
| `DeadlockException` | DB-detected deadlock; typically retryable. |

## Quick usage

```typescript
import { TransactionalDatabaseRepository, UniqueViolationException } from '@xfcfam/xf-sql'
import { PostgresDialect } from 'kysely'
import { Pool } from 'pg'

interface Schema {
  users: { id: number; name: string; email: string; created_at: Date }
}

export class UsersDb extends TransactionalDatabaseRepository<Schema> {
  constructor() {
    super({
      dialect: new PostgresDialect({
        pool: new Pool({ connectionString: process.env.DATABASE_URL }),
      }),
    })
  }
  async init()      { await super.init() }
  async terminate() { await super.terminate() }

  getUser(id: number) {
    return this.exec(() =>
      this.db.selectFrom('users').where('id', '=', id).selectAll().executeTakeFirstOrThrow()
    )
  }

  createUser(input: { name: string; email: string }) {
    return this.exec(() =>
      this.db
        .insertInto('users')
        .values({ ...input, created_at: new Date() })
        .returningAll()
        .executeTakeFirstOrThrow()
    )
  }
}
```

> The example above uses the generic `DatabaseRepository` with a
> raw Kysely dialect — this DIY path is the one case where you bring
> the driver yourself (`pnpm add pg`), since xf-sql is dialect-agnostic
> and bundles no driver. In a real project you would typically extend
> `PostgresDatabaseRepository` from `@xfcfam/xf-sql-postgres`, which
> **bundles `pg`**, wires the dialect, and translates Postgres errors
> automatically — no driver to install.

## Batching pattern (deferred writes)

When a workload generates many small writes, batching them into a
single transaction can cut latency and load on the database
dramatically. xf-sql doesn't ship a dedicated "batch repository" —
batching is a Business-Layer concern (a policy on **when** to write),
not a SQL protocol concern. Compose the building blocks:

- **`BatchedBusiness<T>`** from `@xfcfam/xf` accumulates items in
  memory and flushes them by size, by time, manually or on terminate.
  Dialect-agnostic — works with Postgres, MySQL, SQLite, anything.
- **`TransactionalDatabaseRepository`** in the consumer's Access
  Layer executes the flush as a single transaction.

```typescript
import { BatchedBusiness } from '@xfcfam/xf'
import { R } from '../R.js'                  // your Access injection

interface AuditEvent { actor: string; action: string; at: Date }

export class AuditBatchBusiness extends BatchedBusiness<AuditEvent> {
  constructor() {
    super({
      maxSize: 500,          // flush when 500 events queued, OR
      maxAgeMs: 5_000,       // every 5 seconds, whichever comes first
      onErrorPolicy: 'retain',
      flush: batch => R.auditDb.recordMany(batch),  // single TX on the receiving Repository
    })
  }

  record(event: AuditEvent) { this.add(event) }

  protected override onFlushStart(batch: readonly AuditEvent[], reason) {
    console.log(`[audit] flushing ${batch.length} events (${reason})`)
  }
  protected override onFlushError(batch, err) {
    console.error(`[audit] flush failed, ${batch.length} events retained`, err)
  }
}
```

And on the receiving Repository:

```typescript
import { TransactionalDatabaseRepository } from '@xfcfam/xf-sql'

export class AuditDb extends TransactionalDatabaseRepository<Schema> {
  recordMany(batch: readonly AuditEvent[]) {
    return this.transaction(async (trx) => {
      await trx.insertInto('audit').values([...batch]).execute()
    })
  }
}
```

This pattern is **fully compatible across dialects** — `AuditBatchBusiness`
doesn't know whether the target is Postgres, MySQL or SQLite. Swap the
dialect adapter, the business component stays unchanged.

## Error translation

xf-sql defines the Exception types but **does not translate driver
errors itself** — it doesn't know about Postgres SQLSTATEs or MySQL
error numbers. Either:

- Use a dialect adapter (e.g. `PostgresDatabaseRepository`) that
  overrides `translateError` for you, **or**
- Override `translateError(err)` in your own subclass and map the
  driver's error shape to the `*Exception` types above.

Wrap queries in `this.exec(() => …)` so the translation runs.
Transactions are wrapped automatically by
`TransactionalDatabaseRepository.transaction`.

## Documentation

- Specification — [xfcfam.org](https://xfcfam.org)
- Kysely docs — [kysely.dev](https://kysely.dev)
- Source — [github.com/xfcfam/lib-npm](https://github.com/xfcfam/lib-npm)

## License

MIT.
