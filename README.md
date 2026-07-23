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
> All packages are published under the `@xfcfam/*` scope and depend on the core
> `@xfcfam/xf`; adapters also depend on their contract package (e.g. `xf-kv` for
> `xf-kv-redis`). Install instructions live in each package's README. Packages marked
> *sketch* are unpublished boundary-case explorations, not production-ready.

| Package&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; | Description |
|---|---|
| [`xf`](./packages/xf) | Core library — the three-layer Generalizations (`Repository` / `Business` / `View` + variants), the `R` / `B` / `A` Injection contracts, and the `XF` lifecycle orchestrator. |
| [`xf‑client`](./packages/xf-client) | Transport-agnostic **outbound-client** contract (Access) — the counterpart of `xf-server`. |
| [`xf‑client‑grpc`](./packages/xf-client-grpc) | gRPC outbound client over `@grpc/grpc-js`. *Sketch (unpublished).* |
| [`xf‑client‑http`](./packages/xf-client-http) | HTTP / REST outbound client over `ky` — the `xf-client` implementation; counterpart of `xf-server-http`. |
| [`xf‑client‑tcp`](./packages/xf-client-tcp) | Raw TCP outbound client over `node:net`. *Sketch (unpublished).* |
| [`xf‑client‑udp`](./packages/xf-client-udp) | UDP outbound client over `node:dgram`. *Sketch (unpublished).* |
| [`xf‑fs`](./packages/xf-fs) | Filesystem Access Generalization over `node:fs` — `FileRepository` (+ `Cached` / `Audited`). |
| [`xf‑kv`](./packages/xf-kv) | Key-value / cache Access contract (transport-agnostic). |
| [`xf‑kv‑memcached`](./packages/xf-kv-memcached) | Memcached adapter for `xf-kv` over `memjs`. |
| [`xf‑kv‑redis`](./packages/xf-kv-redis) | Redis adapter for `xf-kv` over `ioredis`. |
| [`xf‑logger`](./packages/xf-logger) | Logging access point (`R.logger`) — console default + pluggable Business `trees`. |
| [`xf‑logger‑file`](./packages/xf-logger-file) | Rotating file `tree` for `xf-logger` over `xf-fs` (size + daily rotation). |
| [`xf‑react‑view`](./packages/xf-react-view) | React presentation Generalizations — Mixin factories grafting the Interaction `View` onto a `React.Component` base. |
| [`xf‑reactnative‑fs`](./packages/xf-reactnative-fs) | React Native sibling of `xf-fs`, same API over `@dr.pogodin/react-native-fs`. |
| [`xf‑rest`](./packages/xf-rest) | REST client (**outbound** HTTP) over `ky` — `RestRepository` + ready-made retry. |
| [`xf‑server`](./packages/xf-server) | Transport-agnostic **inbound-server** contract — abstract `ServerBusiness` / `EntryService` bases. |
| [`xf‑server‑grpc`](./packages/xf-server-grpc) | gRPC transport implementing `xf-server`. *Sketch (unpublished).* |
| [`xf‑server‑http`](./packages/xf-server-http) | HTTP transport — REST · WebSocket · SSE · GraphQL over Fastify. |
| [`xf‑server‑tcp`](./packages/xf-server-tcp) | Raw TCP transport implementing `xf-server`. *Sketch (unpublished).* |
| [`xf‑server‑udp`](./packages/xf-server-udp) | UDP transport implementing `xf-server`. *Sketch (unpublished).* |
| [`xf‑sql`](./packages/xf-sql) | SQL Access Generalization over Kysely (dialect-agnostic). |
| [`xf‑sql‑postgres`](./packages/xf-sql-postgres) | PostgreSQL dialect adapter for `xf-sql` — kysely `PostgresDialect` + `pg`, with SQLSTATE → typed Exceptions. |

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
