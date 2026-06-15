# 🧩 XF Architecture Model — TypeScript libraries

> Reference implementation of the **XF Architecture Model** (CFAM,
> Cross-Framework Architecture Model) for the TypeScript ecosystem — a
> [pnpm](https://pnpm.io) monorepo of independently-published `@xfcfam/*` packages.

> [!NOTE]
> XF is a technology-agnostic classification system: every component in an artefact
> belongs to exactly one **layer** (Access · Business · Interaction) × one **type**
> (Logical · Generalization · Injection · Utility · Transfer) — 15 cells of a 3 × 5
> matrix, with dependencies flowing strictly **downward**. Full specification →
> **[xfcfam.org](https://xfcfam.org)**.

## 📦 Packages

> [!TIP]
> Every package depends on the core `@xfcfam/xf`; adapters add their contract package
> (e.g. `xf-kv` for `xf-kv-redis`). Install instructions live in each package's README.

### Core

| Package | What it provides |
|---|---|
| [`@xfcfam/xf`](./packages/xf) | The three-layer Generalizations (`Repository`/`Business`/`View` + variants), the `R`/`B`/`A` Injection contracts, and the `XF` lifecycle orchestrator. |

### Access — reaching the outside world

| Package | Role |
|---|---|
| [`xf-rest`](./packages/xf-rest) | REST client (**outbound** HTTP) over `ky` — `RestRepository` + ready-made retry. |
| [`xf-fs`](./packages/xf-fs) | Filesystem over `node:fs` — `FileRepository` (+ `Cached` / `Audited`). |
| [`xf-reactnative-fs`](./packages/xf-reactnative-fs) | React Native sibling of `xf-fs`, same API over `@dr.pogodin/react-native-fs`. |
| [`xf-sql`](./packages/xf-sql) · [`-postgres`](./packages/xf-sql-postgres) | SQL over Kysely (dialect-agnostic) + the PostgreSQL adapter. |
| [`xf-kv`](./packages/xf-kv) · [`-redis`](./packages/xf-kv-redis) · [`-memcached`](./packages/xf-kv-memcached) | Key-value / cache contract + Redis & Memcached adapters. |
| [`xf-logger`](./packages/xf-logger) · [`-file`](./packages/xf-logger-file) | Logging access point (`R.logger`) + rotating file tree. |

### Interaction — entry points & views

| Package | Role |
|---|---|
| [`xf-server`](./packages/xf-server) | Transport-agnostic **inbound-server** contract (abstract). |
| [`xf-server-http`](./packages/xf-server-http) | HTTP transport — REST · WebSocket · SSE · GraphQL (Fastify). |
| [`-grpc`](./packages/xf-server-grpc) · [`-tcp`](./packages/xf-server-tcp) · [`-udp`](./packages/xf-server-udp) | gRPC / TCP / UDP transports — **sketches** (not production-ready). |
| [`xf-react-view`](./packages/xf-react-view) | React presentation Generalizations — Mixin factories that graft the Interaction `View` onto a `React.Component` peer base. |

## 🚀 Quick start

The smallest XF artefact wires the three layers through the canonical Injections:

```ts
import { StatelessBusiness } from '@xfcfam/xf'
import { RetryRestRepository } from '@xfcfam/xf-rest'

class UsersRest extends RetryRestRepository {
  constructor() { super('https://api.example.com') }
  fetchUser(id: number) { return this.withRetry(() => this.get(`/users/${id}`)) }
}
// reached only through the injection:  R.users.fetchUser(42)
```

## 🧪 Examples

| Example | Demonstrates |
|---|---|
| [`01-rest-basic`](./examples/01-rest-basic) | REST client artefact (`xf` + `xf-rest`). |
| [`02-sql-postgres`](./examples/02-sql-postgres) | Postgres artefact (`xf` + `xf-sql` + `xf-sql-postgres`). |
| [`03-rest-server`](./examples/03-rest-server) | HTTP server — REST / WS / SSE / GraphQL on one port. |
| [`04-kv-memory`](./examples/04-kv-memory) | In-memory key-value cache, no server (`xf` + `xf-kv`). |
| [`06-logger`](./examples/06-logger) | Logging from all three layers + a rotating file tree. |

```bash
pnpm --filter @xfcfam-examples/01-rest-basic start
```

## 🛠️ Development

```bash
pnpm install      # bootstrap the workspace (one-time)
pnpm build        # dist/ for every package
pnpm typecheck    # tsc --noEmit across the workspace
pnpm test         # vitest across the workspace
```

Each package follows the canonical XF folder structure — `src/repository/`,
`src/business/`, `src/api/`, each with its `general/` · `logic/` · `transfers/` ·
`utils/` partitions. Tests live in `tests/` and stay out of the published tarball.

## 🤝 Contributing

Pull requests welcome. Please add or update tests for any change of behaviour, and
keep the XF canonicity of the source tree intact (no free functions or runtime state
at module scope — follow the existing conventions).

## ⚖️ License

MIT — see [LICENSE](./LICENSE).
