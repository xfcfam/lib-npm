# `@xfcfam/xf`

## 0.3.0

### Minor Changes

- Broaden the observable/scheduled Business generalizations with a small,
  backward-compatible surface.

  - `ObservableBusiness` / `ObservableScheduleBusiness`: add an optional
    `runOnObserve` flag on `observe(observer, runOnObserve?)` that fires
    the observer immediately with the current state, and a `notify(data?)`
    overload that sets the state before fanning out. Observer callbacks are
    now isolated — a throwing observer no longer prevents the others from
    running. State stays `protected` — components that want to expose it
    add their own accessor over it (the generalization does not publish it
    by default).
  - `ScheduleBusiness`: `interval(ms, runImmediately?)` can run one tick up
    front; add an `onError(error)` hook (default swallows) so a single
    failing tick never aborts the schedule.

  `ObservableScheduleBusiness` is now a clean **composition** of the two
  concerns: it no longer notifies observers on every tick. Scheduling and
  observation are orthogonal — a tick is not a state change — so observers
  are notified only when the component publishes a new state via
  `notify(...)`, exactly like `ObservableBusiness`. (Behavioural change vs
  the previous auto-notify-per-tick; subclasses now call `notify` from
  `run` when there is something new.)

  Existing call sites (`notify()`, `observe(observer)`) are unchanged.

## 0.2.0

### Minor Changes

- Add `Service` and `StatelessService` — the systemic Interaction-Layer
  generalizations, the `Service`-suffixed counterpart of `View` /
  `StatelessView`. Structurally identical to `View`, semantically distinct
  (GUI/presentation vs systemic services). `CommandService` and
  `CronService` now extend `StatelessService` instead of `StatelessView`.

This changelog is maintained by [Changesets](https://github.com/changesets/changesets).
Do not edit manually — `pnpm version-packages` regenerates it from
the `.md` files in `.changeset/`.

## 0.1.0

Initial public release.

- Three abstract layer bases: `Repository<T>`, `Business<T>`, `View<T>`.
- Stateless / Observable / Schedule variants on every layer.
- Specialised Repository Generalizations: `CacheableRepository<T,K,V>`,
  `RetryableRepository<T>`, `PaginatedRepository<T,Item,Cursor>`.
- Specialised Business Generalizations: `ValidatedBusiness<T>`,
  `StateMachineBusiness<T,S,E>`, `EventSourcedBusiness<T,E>`.
- Multi-Generalization composition: `ComposableRepository`,
  `ComposableBusiness`, `ComposableView` (static `compose(...)`).
- Injection placeholders `R`, `B`, `A` (static, non-instantiable).
- Architecture-level orchestrator `XF` (static `init` / `terminate`).
- Type helper `AbstractCtor<T>`.
