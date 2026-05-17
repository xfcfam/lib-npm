# XF Architecture Model — TypeScript libraries

Reference implementation of the **XF Architecture Model** (CFAM,
Cross-Framework Architecture Model) for the TypeScript ecosystem.

XF is a technology-agnostic classification system for software
components. Every component in an XF-compliant artefact belongs to
exactly one **layer** (Access · Business · Interaction) and exactly
one **type** (Logical · Generalization · Injection · Utility ·
Transfer) — fifteen possible cells in a 3 × 5 matrix. The full
specification lives at [xfarch.org](https://xfarch.org).

This repository is a [pnpm](https://pnpm.io) workspace. Each package
is published independently to npm; they evolve together in the same
repo so cross-package changes stay atomic.

## Packages

| Package | What it provides | Install |
|---|---|---|
| [`@xfarch/xf`](./packages/xf) | Core library. Abstract Generalizations of the three layers (`Repository<T>`, `Business<T>`, `View<T>` and their `Stateless`/`Observable`/`Schedule`/`Composable`/`Cacheable`/`Retryable`/`Paginated`/`Validated`/`StateMachine`/`EventSourced` variants), the Injection contracts (`R`/`B`/`A`), and the lifecycle orchestrator (`XF`). | `pnpm add @xfarch/xf` |
| [`@xfarch/xf-rest`](./packages/xf-rest) | REST Access Layer Generalization. Encapsulates the `ky` HTTP client behind `RestRepository` + the ready-to-use `RetryRestRepository`. Plus `ParseUtils` / `ReviverUtils` for XML, CSV, custom content types, and date revival. | `pnpm add @xfarch/xf @xfarch/xf-rest` |

## Quick start

The smallest XF artefact has the three layers wired through the
canonical Injections:

```typescript
import { StatelessBusiness, StatelessView } from '@xfarch/xf'
import { RetryRestRepository } from '@xfarch/xf-rest'

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
pnpm --filter @xfarch-examples/01-rest-basic start
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
pnpm --filter @xfarch/xf      test
pnpm --filter @xfarch/xf-rest test
pnpm --filter @xfarch/xf      build
```

## Repository layout

```
lib-typescript/
├── packages/
│   ├── xf/              ← @xfarch/xf       — core library
│   └── xf-rest/         ← @xfarch/xf-rest  — REST Access Generalization
└── examples/
    └── 01-rest-basic/   — runnable XF artefact consuming both packages
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
