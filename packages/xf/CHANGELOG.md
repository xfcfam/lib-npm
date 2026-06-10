# `@xfcfam/xf`

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
