# 🧩 `@xfcfam/xf-sql-postgres`

> PostgreSQL dialect adapter for
> [`@xfcfam/xf-sql`](https://www.npmjs.com/package/@xfcfam/xf-sql) — Kysely's
> `PostgresDialect` over [`pg`](https://node-postgres.com), plus the
> SQLSTATE → typed-Exception translation, so the Business Layer never sees
> `pg` errors.

> [!NOTE]
> `pg` and `kysely` are **bundled and wired internally** — the adapter builds the
> `pg.Pool` and the dialect in its constructor. You never install or import either.

## 📦 Install

```bash
npm i @xfcfam/xf @xfcfam/xf-sql @xfcfam/xf-sql-postgres
```

## 🚀 Quick start

```ts
import { PostgresDatabaseRepository } from '@xfcfam/xf-sql-postgres'
import { UniqueViolationException } from '@xfcfam/xf-sql'

export class UsersDb extends PostgresDatabaseRepository<Schema> {
  constructor() { super({ connectionString: process.env.DATABASE_URL!, pool: { max: 10 } }) }

  createUser(input: NewUser) {
    return this.exec(() =>
      this.db.insertInto('users').values(input).returningAll().executeTakeFirstOrThrow())
  }
}
```

## 🧰 Exported Components

### Generalizations

| Component | Description |
|---|---|
| [`PostgresDatabaseRepository<Schema>`](./src/repository/general/PostgresDatabaseRepository.ts) | Extends `TransactionalDatabaseRepository`; wires `PostgresDialect` + `pg.Pool` from `PostgresOptions` (`connectionString` + optional `pool`). Its `translateError` maps `pg` SQLSTATEs to the `@xfcfam/xf-sql` exceptions. |

### Utilities

| Component | Description |
|---|---|
| [`PostgresErrorUtils`](./src/repository/utils/PostgresErrorUtils.ts) | Maps any `pg` / Kysely error to the matching `@xfcfam/xf-sql` exception. |

> [!TIP]
> SQLSTATE mapping — `23505` → `UniqueViolation`, `23503` → `ForeignKeyViolation`,
> `23514` → `Check`, `23502` → `NotNull`, `40P01` → `Deadlock`, transport codes →
> `Connection`. `table` / `column` / `constraint` are forwarded onto the exception.

## 📚 Documentation

Full specification → **[xfcfam.org](https://xfcfam.org)** · [SQLSTATE codes](https://www.postgresql.org/docs/current/errcodes-appendix.html)

## ⚖️ License

MIT
