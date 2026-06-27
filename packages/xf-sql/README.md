# 🧩 `@xfcfam/xf-sql`

> SQL Access Generalization for the **XF Architecture Model** — the
> [Kysely](https://kysely.dev) query builder behind one XF-canonical class, with
> a typed Exception hierarchy. **Dialect-agnostic.**

> [!NOTE]
> Pair it with a dialect adapter —
> [`@xfcfam/xf-sql-postgres`](https://www.npmjs.com/package/@xfcfam/xf-sql-postgres)
> today (MySQL / SQLite to follow) — or pass any Kysely `Dialect` directly.

## 📦 Install

```bash
npm i @xfcfam/xf @xfcfam/xf-sql
# + a dialect adapter (it bundles its own driver), e.g. Postgres:
npm i @xfcfam/xf-sql-postgres
```

## 🚀 Quick start

```ts
import { TransactionalDatabaseRepository } from '@xfcfam/xf-sql'

export class UsersDb extends TransactionalDatabaseRepository<Schema> {
  constructor() { super({ dialect /* from an adapter */ }) }
  getUser(id: number) {
    return this.exec(() =>
      this.db.selectFrom('users').where('id', '=', id).selectAll().executeTakeFirstOrThrow())
  }
}
```

## 🧰 Exported Components

### Generalizations

| Component | Description |
|---|---|
| [`DatabaseRepository<Schema>`](./src/repository/general/DatabaseRepository.ts) | The SQL contract over Kysely (`this.db`). `exec()` funnels driver errors through `translateError` into the typed `DatabaseException` family — `Connection` / `UniqueViolation` / `ForeignKeyViolation` / `CheckViolation` / `NotNullViolation` / `Deadlock`. Plus a stringly-typed **built-in CRUD** surface (no `Schema` required) — the data analogue of `RestRepository`'s verbs: `findById` · `findOne` · `find` · `insert` · `insertMany` · `update` · `updateMany` · `delete` · `deleteMany` · `exists` · `count` · `pluck` · `keymap` · `group` · `paginate` · `run` · `query` (raw `$1…`) · `scalar`. Filters `{ col: value \| value[] \| null }` → `=` / `IN` / `IS NULL`. |
| [`TransactionalDatabaseRepository<Schema>`](./src/repository/general/TransactionalDatabaseRepository.ts) | Adds commit / rollback-on-throw, error-translated. |

> [!IMPORTANT]
> xf-sql defines the Exception types but **does not translate driver errors
> itself** — use a dialect adapter (which overrides `translateError`) or override
> it yourself. Wrap queries in `this.exec(() => …)` so the translation runs.

> [!TIP]
> Batching is a Business concern: pair `BatchedBusiness` (from `@xfcfam/xf`) with
> `transaction()` to flush many writes as one transaction — dialect-agnostic.

## 📚 Documentation

Full specification → **[xfcfam.org](https://xfcfam.org)** · [kysely.dev](https://kysely.dev)

## ⚖️ License

MIT
