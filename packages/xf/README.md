# `@xfcfam/xf`

Core library of the **XF Architecture Model** (CFAM) for TypeScript.

Ships the abstract Generalizations of the three XF layers (Access,
Business, Interaction), the Injection contracts (`R` / `B` / `A`), and
the optional lifecycle orchestrator (`XF`).

The model itself is technology-agnostic; this package is the
TypeScript reference implementation. Full specification at
[xfcfam.org](https://xfcfam.org).

## Install

```bash
pnpm add @xfcfam/xf
```

ESM-only, requires Node ≥ 20 (or modern browsers). TypeScript ≥ 5.4.

## The model in 60 seconds

Every component in your artefact belongs to exactly one **layer** ×
**type** cell of a 3 × 5 matrix:

| | Logical | Generalization | Injection | Utility | Transfer |
|---|---|---|---|---|---|
| **Access** (`/repository`) | `UserRepository`, … | `Repository<T>` and its variants | `R` | `Utils` | dumb data |
| **Business** (`/business`) | `UserBusiness`, … | `Business<T>` and its variants | `B` | `Utils` | dumb data |
| **Interaction** (`/api`) | `UserService`, `MainView`, … | `View<T>` and its variants | `A` | `Utils` | dumb data |

Dependencies flow strictly downward: Interaction → Business → Access.
No upward calls, no lateral calls. External code reaches Logical
components only through their layer's Injection
(`A.userService.handleGet(...)`, `B.userBusiness.getUser(...)`,
`R.userRepository.fetch(...)`).

## What this package exports

### Access Layer

| | |
|---|---|
| `Repository<T>` | Base Generalization. Every Access Logical extends this (directly or via a variant). |
| `StatelessRepository` | `Repository<null>` with a zero-argument constructor. |
| `ObservableRepository<T>` | Adds `observe` / `remove` / `notify`. Observer ids are generated numbers — no need to retain the function reference. |
| `RetryableRepository<T>` | `withRetry(op, opts?)` with exponential backoff + jitter. Override `shouldRetry` to skip non-transient errors. |
| `PaginatedRepository<T,Item,Cursor>` | `iterate()` / `fetchAll()` over a paginated source. Concrete subclass implements `fetchPage(cursor?)`. |
| `ClockRepository` | `now()` / `nowIso()` / `sleep(ms)` wrapping the system clock. Override in tests for deterministic time. |
| `R` | The Access Injection — static singleton with `private constructor`. |

### Business Layer

| | |
|---|---|
| `Business<T>` | Base Generalization. Every Business Logical extends this. |
| `StatelessBusiness` | `Business<null>` with a zero-argument constructor. |
| `ObservableBusiness<T>` | Adds `observe` / `remove` / `notify`. |
| `ScheduleBusiness<T>` | `interval(ms)` / `delay(ms)` driving an abstract `run()`. Hook `onTickComplete()` fires after each successful tick. |
| `ObservableScheduleBusiness<T>` | Scheduling + observation: observers fire automatically after every successful tick. |
| `CacheableBusiness<K,V>` | State IS the cache. `get` / `refresh` / `refreshAll` / `getCached` / `invalidate`. Hook `onEntryChanged`. |
| `ObservableCacheableBusiness<K,V>` | Caching + observation: whole-map observer (`observe`) and per-key observer (`observeKey`). |
| `ValidatedBusiness<T>` | `commit(next)` runs `validate(next)` first; throws on rejection. |
| `StateMachineBusiness<T,S,E>` | Declarative transition table + `transition(event)` / `canTransition(event)`. Hook `onTransition(from, event, to)`. |
| `ObservableStateMachineBusiness<T,S,E>` | FSM + observation: whole-state observer + transition observer `(from, event, to)`. |
| `EventSourcedBusiness<T,E>` | `record(event)` / `replay(events, initial)` / `snapshot()` over a pure reducer `apply(state, event)`. |
| `ConcurrentBusiness<T>` | `parallel(tasks)` with bounded concurrency via `maxConcurrency`. |
| `LockedBusiness<T>` | `withLock(op)` mutex — serialises critical sections per instance. |
| `B` | The Business Injection. |

### Interaction Layer

| | |
|---|---|
| `View<T>` | Base Generalization. Every Interaction Logical extends this. |
| `StatelessView` | `View<null>` with a zero-argument constructor. |
| `ObservableView<T>` | Adds `observe` / `remove` / `notify`. |
| `ScheduleView<T>` | `interval(ms)` / `delay(ms)` driving an abstract `run()`. |
| `CommandService` | Contract for a CLI command: `name`, `description`, `execute(args)`. Parsing of `process.argv` lives in a dedicated package. |
| `CronService` | Contract for a cron handler: `schedule` (cron expression), `handle()`. Parsing lives in a dedicated package. |
| `A` | The Interaction Injection. |

Plus the architecture-level orchestrator `XF` (optional).

### Companion packages (planned)

Several Repositories require a runtime dependency (Node `fs`, `crypto`,
`child_process`, etc.) and live in dedicated packages so this core
stays import-free:

| Package | Wraps |
|---|---|
| `@xfcfam/xf-fs` | `node:fs/promises` → `FileRepository` |
| `@xfcfam/xf-runtime` | `process` / `navigator` → `RuntimeRepository` |
| `@xfcfam/xf-stream` | `process.stdin` / `stdout` → `StreamRepository` |
| `@xfcfam/xf-archive` | `node:zlib` / tar → `ArchiveRepository` |
| `@xfcfam/xf-crypto` | `node:crypto` / web crypto → `CryptoRepository` |
| `@xfcfam/xf-process` | `node:child_process` → `ProcessRepository` |

## Quick usage — single Generalization

```typescript
import { ObservableBusiness } from '@xfcfam/xf'

interface SessionState { userId?: string }

class SessionBusiness extends ObservableBusiness<SessionState> {
  constructor() { super({}) }
  async init()      { await super.init() }      // ⚠ required
  async terminate() { await super.terminate() } // ⚠ required

  login(userId: string) { this.state = { userId }; this.notify() }
  logout()              { this.state = {};        this.notify() }
}
```

## Lifecycle

Each Logical declares concrete `init()` / `terminate()` for its own
resources. The Injection of its layer wires the calls in order:

```
R.init()  →  B.init()  →  A.init()                 (bottom-up)
A.terminate()  →  B.terminate()  →  R.terminate()  (top-down)
```

The optional `XF.init()` / `XF.terminate()` performs this orchestration
for the three Injection placeholders shipped here. In your project,
your own `R` / `B` / `A` extend or replace these placeholders and
register your concrete Logical components.

## Documentation

- Specification — [xfcfam.org](https://xfcfam.org)
- Source — [github.com/xfcfam/lib-npm](https://github.com/xfcfam/lib-npm)
- Examples — [`examples/`](https://github.com/xfcfam/lib-npm/tree/main/examples) in the monorepo

## License

MIT.
