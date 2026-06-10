# 02 · SQL / Postgres

End-to-end XF artefact that consumes `@xfcfam/xf`, `@xfcfam/xf-sql`,
and `@xfcfam/xf-sql-postgres`. Talks to a local Postgres provisioned
by `docker compose`. No external accounts, no auth — boot, run, tear
down.

## Run it

From the monorepo root:

```bash
pnpm install
pnpm --filter @xfcfam-examples/02-sql-postgres db:up      # starts Postgres in docker
sleep 2                                                    # let it become healthy
pnpm --filter @xfcfam-examples/02-sql-postgres db:schema  # loads schema.sql + seed
pnpm --filter @xfcfam-examples/02-sql-postgres start      # runs main.ts
```

When you're done:

```bash
pnpm --filter @xfcfam-examples/02-sql-postgres db:down    # stops Postgres + wipes volume
```

The example reads its connection string from `DATABASE_URL`,
defaulting to `postgres://xf:xf@localhost:5432/xfdemo` (matching
`docker-compose.yml`).

## What you'll see

Four demo operations executed against the seeded schema:

1. Fetch user `#1` (Alice) and print her name + email.
2. List "active-looking" users — those whose email's domain has a dot
   (the trivial domain rule lives in `UserBusiness`, **not** in
   `UsersDb`).
3. Register a new user with a fresh email — success path.
4. Register again with the same email — the Postgres `UNIQUE`
   constraint fires, `xf-sql-postgres` translates SQLSTATE `23505`
   into `UniqueViolationException`, and `UserBusiness.register`
   surfaces it as a typed `{ duplicate: true }` domain result.

## Layout

```
src/
├── repository/                          (Access Layer)
│   ├── logic/local/UsersDb.ts           ← extends PostgresDatabaseRepository
│   ├── structs/User.ts                  ← Transfer
│   ├── structs/DatabaseSchema.ts        ← Kysely table types
│   └── R.ts                             ← Injection
├── business/                            (Business Layer)
│   ├── logic/UserBusiness.ts            ← extends StatelessBusiness
│   └── B.ts                             ← Injection
├── api/                                 (Interaction Layer)
│   ├── logic/service/UserService.ts     ← extends StatelessView
│   └── A.ts                             ← Injection
└── main.ts                              ← Bootstrap: R → B → A
```

Three things this example showcases:

- **No Postgres types in Business or Interaction.** `pg`, SQLSTATE
  codes, Kysely builders — all stay inside the Access Layer. Business
  works with the `User` Transfer object and typed Exceptions
  (`UniqueViolationException`).
- **Repository → Transfer mapping.** `UsersDb.rowToUser` translates
  the database shape (snake_case, `Date` columns) to the domain shape
  (camelCase `User`). The mapping lives in the Repository, never
  leaks upward.
- **Typed exception flow.** `UniqueViolationException` is caught at
  the Business boundary and turned into a domain-meaningful return
  value (`{ duplicate: true }`). The HTTP/CLI/GUI doesn't see the
  database error class.

## Layer responsibilities recap

| Layer | What it knows about | What it must not know |
|---|---|---|
| Access (`/repository`) | `pg`, Kysely, SQLSTATE codes, table shapes | Domain rules, business invariants |
| Business (`/business`) | Domain rules, the `User` Transfer, typed Exceptions | `pg`, SQL, Kysely, HTTP, CLI |
| Interaction (`/api`) | The user-facing surface (CLI in this case), service methods | Database, SQL — must go through Business |

## Customising

- Want to inspect SQL? Add a Kysely `log` option in the constructor
  of `UsersDb`.
- Want connection pooling tuned? Edit the `pool` option in `UsersDb`
  (`max`, `idleTimeoutMillis`, `ssl`, etc.).
- Want to add tables? Add them to both `schema.sql` and
  `DatabaseSchema.ts`, then add Repositories under `repository/logic/`.

## Why not use `XF.init()`?

Same reason as the `01-rest-basic` example: `@xfcfam/xf`'s `XF.init()`
calls placeholder R/B/A from the library, not this project's R/B/A.
The bootstrap in `main.ts` calls our own R/B/A directly. The pattern
is identical to xf's `XF` — the example's R/B/A just live in our
namespace.
