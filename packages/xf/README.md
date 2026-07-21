# 🧩 `@xfcfam/xf`

> Core library of the **XF Architecture Model (CFAM)** for TypeScript — the
> abstract Generalizations of the three layers, the `R` / `B` / `A` Injection
> contracts, and the optional `XF` lifecycle orchestrator.

> [!NOTE]
> XF is technology-agnostic; this package is its TypeScript reference
> implementation. Every component lives in exactly one **layer × type** cell of
> a 3 × 5 matrix, and dependencies flow strictly **downward**
> (Interaction → Business → Access).

## 📦 Install

```bash
npm i @xfcfam/xf
```

ESM-only · Node ≥ 20 (or modern browsers) · TypeScript ≥ 5.4.

## 🚀 Quick start

```ts
import { ObservableBusiness } from '@xfcfam/xf'

class SessionBusiness extends ObservableBusiness<{ userId?: string }> {
  constructor() { super({}) }
  async init() {}
  async terminate() {}
  login(userId: string) { this.state = { userId }; this.notify() }
}
// reached only through the injection:  B.session.login('ada')
```

## 🧰 Exported Components

### Generalizations

| Layer | Component | Description |
|---|---|---|
| Access | [`Repository<T>`](./src/repository/general/Repository.ts) · [`StatelessRepository`](./src/repository/general/StatelessRepository.ts) | Base Access generalization; `Stateless` is the zero-state form. |
| Access | [`ObservableRepository<T>`](./src/repository/general/ObservableRepository.ts) | Observer registry (numeric ids). |
| Access | [`ConnectableRepository<T>`](./src/repository/general/ConnectableRepository.ts) | Latched connection lifecycle; `onConnect` fires even if you subscribe late. |
| Access | [`RetryableRepository<T>`](./src/repository/general/RetryableRepository.ts) | Exponential backoff + jitter. |
| Access | [`PaginatedRepository<T,Item,Cursor>`](./src/repository/general/PaginatedRepository.ts) | Iterate a paginated source. |
| Access | [`ClockRepository`](./src/repository/general/ClockRepository.ts) | Wraps the system clock; override in tests. |
| Business | [`Business<T>`](./src/business/general/Business.ts) · [`StatelessBusiness`](./src/business/general/StatelessBusiness.ts) | Base Business generalization. |
| Business | [`ObservableBusiness<T>`](./src/business/general/ObservableBusiness.ts) | Observer registry. |
| Business | [`ScheduleBusiness<T>`](./src/business/general/ScheduleBusiness.ts) · [`ObservableScheduleBusiness<T>`](./src/business/general/ObservableScheduleBusiness.ts) | Scheduled execution (+ observation). |
| Business | [`CacheableBusiness<K,V>`](./src/business/general/CacheableBusiness.ts) · [`ObservableCacheableBusiness<K,V>`](./src/business/general/ObservableCacheableBusiness.ts) | State-as-cache (+ per-key observation). |
| Business | [`ValidatedBusiness<T>`](./src/business/general/ValidatedBusiness.ts) | Validate-then-commit. |
| Business | [`StateMachineBusiness<T,S,E>`](./src/business/general/StateMachineBusiness.ts) · [`ObservableStateMachineBusiness`](./src/business/general/ObservableStateMachineBusiness.ts) | Declarative FSM (+ observation). |
| Business | [`EventSourcedBusiness<T,E>`](./src/business/general/EventSourcedBusiness.ts) | Event sourcing over a pure reducer. |
| Business | [`ConcurrentBusiness<T>`](./src/business/general/ConcurrentBusiness.ts) | Bounded-concurrency fan-out. |
| Business | [`LockedBusiness<T>`](./src/business/general/LockedBusiness.ts) | Per-instance mutex. |
| Business | [`BatchedBusiness<T>`](./src/business/general/BatchedBusiness.ts) | Accumulate + flush by size / time. |
| Interaction | [`View<T>`](./src/api/general/View.ts) · [`StatelessView`](./src/api/general/StatelessView.ts) · [`ObservableView<T>`](./src/api/general/ObservableView.ts) · [`ScheduleView<T>`](./src/api/general/ScheduleView.ts) | Base Interaction generalizations. |
| Interaction | [`CommandService`](./src/api/general/CommandService.ts) · [`CronService`](./src/api/general/CronService.ts) | CLI command + cron handler contracts. |

The **Injections** `R` / `B` / `A` (non-instantiable static service-access points) and
the optional **`XF`** orchestrator (`R.init → B.init → A.init`, reverse on terminate)
round out the package. There are no Utilities or concrete Logicals — those you write.

> [!TIP]
> Repositories that need a runtime (filesystem, HTTP, SQL…) live in dedicated
> packages so this core stays import-free — e.g. `@xfcfam/xf-fs`,
> `@xfcfam/xf-rest`, `@xfcfam/xf-sql`, `@xfcfam/xf-kv`, `@xfcfam/xf-logger`.

## 📚 Documentation

Full specification → **[xfcfam.org](https://xfcfam.org)** · [examples](https://github.com/xfcfam/lib-npm/tree/main/examples)

## ⚖️ License

MIT
