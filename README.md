# XF Architecture Model — TypeScript libraries

Reference implementation of the **XF Architecture Model** (CFAM,
Cross-Framework Architecture Model) for the TypeScript ecosystem.

XF is a technology-agnostic classification system for software
components. Every component in an XF-compliant artefact belongs to
exactly one **layer** (Access · Business · Interaction) and exactly
one **type** (Logical · Generalization · Injection · Utility ·
Transfer) — fifteen possible cells in a 3 × 5 matrix. The full
specification lives at [xfcfam.org](https://xfcfam.org).

This repository is a [pnpm](https://pnpm.io) workspace. Each package
is published independently to npm; they evolve together in the same
repo so cross-package changes stay atomic.

## Packages

Every package depends on the core `@xfcfam/xf`; install it alongside any
adapter.

| Package | Layer · role | What it provides | Install |
|---|---|---|---|
| [`@xfcfam/xf`](./packages/xf) | Core | Abstract Generalizations of the three layers (`Repository<T>`, `Business<T>`, `View<T>` and their `Stateless`/`Observable`/`Schedule`/`Composable`/`Cacheable`/`Retryable`/`Paginated`/`Validated`/`StateMachine`/`EventSourced` variants), the Injection contracts (`R`/`B`/`A`), and the lifecycle orchestrator (`XF`). | `pnpm add @xfcfam/xf` |
| [`@xfcfam/xf-rest`](./packages/xf-rest) | Access | REST Access Generalization. Encapsulates the `ky` HTTP client behind `RestRepository` + the ready-to-use `RetryRestRepository`, plus `ParseUtils` / `ReviverUtils` for XML, CSV, custom content types, and date revival. | `pnpm add @xfcfam/xf @xfcfam/xf-rest` |
| [`@xfcfam/xf-fs`](./packages/xf-fs) | Access | Filesystem Access Generalization over `node:fs` — `FileRepository` and its `Cached`/`Audited` variants for local-disk operations. | `pnpm add @xfcfam/xf @xfcfam/xf-fs` |
| [`@xfcfam/xf-sql`](./packages/xf-sql) | Access | SQL Access Generalization over the Kysely query builder. Dialect-agnostic; `DatabaseRepository` + `TransactionalDatabaseRepository`. Pair with a dialect adapter. | `pnpm add @xfcfam/xf @xfcfam/xf-sql` |
| [`@xfcfam/xf-sql-postgres`](./packages/xf-sql-postgres) | Access | PostgreSQL dialect adapter for `@xfcfam/xf-sql` — wraps Kysely's `PostgresDialect` + the `pg` driver and maps Postgres `SQLSTATE` codes to the typed Exceptions of `xf-sql`. | `pnpm add @xfcfam/xf @xfcfam/xf-sql @xfcfam/xf-sql-postgres` |
| [`@xfcfam/xf-server`](./packages/xf-server) | Interaction | HTTP-server Interaction Generalization over Fastify — the canonical `RestService` / `ObjectRestService` / `RestServerService` bases for exposing an artefact over HTTP. | `pnpm add @xfcfam/xf @xfcfam/xf-server` |

## Quick start

The smallest XF artefact has the three layers wired through the
canonical Injections:

```typescript
import { StatelessBusiness, StatelessView } from '@xfcfam/xf'
import { RetryRestRepository } from '@xfcfam/xf-rest'

class UsersRest extends RetryRestRepository {
  constructor() { super('https://api.example.com') }
  async init()      { await super.init() }
  async terminate() { await super.terminate() }
  fetchUser(id: number) { return this.withRetry(() => this.get(`/users/${id}`)) }
}
```

See [`examples/01-rest-basic`](./examples/01-rest-basic) for the
complete artefact with `R`/`B`/`A` Injections and a `main.ts` that
bootstraps the artefact end-to-end. Run it with:

```bash
pnpm --filter @xfcfam-examples/01-rest-basic start
```

## Development

```bash
pnpm install            # bootstraps the workspace (one-time)
pnpm test               # vitest across every package
pnpm typecheck          # tsc --noEmit across every package
pnpm build              # produces dist/ for every package
```

Each package can be addressed individually:

```bash
pnpm --filter @xfcfam/xf      test
pnpm --filter @xfcfam/xf-rest test
pnpm --filter @xfcfam/xf      build
```

## Repository layout

```
lib-npm/
├── packages/
│   ├── xf/                 ← @xfcfam/xf              — core library
│   ├── xf-rest/            ← @xfcfam/xf-rest         — REST Access Generalization
│   ├── xf-fs/              ← @xfcfam/xf-fs           — filesystem Access Generalization
│   ├── xf-sql/             ← @xfcfam/xf-sql          — SQL Access Generalization (Kysely)
│   ├── xf-sql-postgres/    ← @xfcfam/xf-sql-postgres — Postgres dialect adapter
│   └── xf-server/          ← @xfcfam/xf-server       — HTTP-server Interaction Generalization
└── examples/
    ├── 01-rest-basic/      — REST client artefact (xf + xf-rest)
    ├── 02-sql-postgres/    — Postgres artefact (xf + xf-sql + xf-sql-postgres)
    └── 03-rest-server/     — HTTP server artefact (xf + xf-server)
```

The internal layout of every published package follows the canonical
XF folder structure: `src/repository/`, `src/business/`, `src/api/`,
each with its `base/` (Generalizations), `logic/`, `structs/` and
`utils/` partitions as needed. Tests live in `tests/` (mirroring
`src/`) and stay out of the published tarball.

## Contributing

Pull requests welcome. Please add or update tests for any change of
behaviour, and keep the XF canonicity of the source tree intact
(no free functions or runtime state at module scope — see the
existing code for the convention).

## License

MIT. See [LICENSE](./LICENSE).
