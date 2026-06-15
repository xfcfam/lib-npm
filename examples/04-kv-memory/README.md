# Example 04 — in-memory key-value cache (`@xfcfam/xf-kv`)

A complete XF artefact built on the **key-value / cache** contract, with
**no external server required**. The Access layer ships an in-memory
`MemoryKeyValueRepository` (a `Map` with TTL expiry) that implements the
`@xfcfam/xf-kv` contract; the Business and Interaction layers above are
written exactly as they would be against Redis or Memcached.

```
A.sessions (SessionService)        Interaction — entry point
   └─ B.session (SessionBusiness)   Business    — domain rules
         ├─ R.sessions (SessionRepository)   Access — session cache (TTL 1h)
         └─ R.metrics  (MetricsRepository)   Access — atomic login counter
```

It demonstrates the contract end-to-end: namespaced keys, JSON
serialisation, TTL/expiry, `get`/`set`/`delete`, and the atomic
`increment` counter — all through the canonical `R.<store>.<op>()`
injection access.

## Run

```bash
pnpm start      # tsx main.ts  (builds @xfcfam/xf + @xfcfam/xf-kv first)
```

Expected output:

```
logged in: ada  token=tok_ada_...
validate(ada): ada
after logout(linus): gone
total logins: 2
```

## Going to production

Swap the Access generalization the two repositories extend — from
`MemoryKeyValueRepository` to `RedisKeyValueRepository`
(`@xfcfam/xf-kv-redis`) — and pass a connection. **Nothing in `business/`
or `api/` changes**: that is the point of the layered, technology-agnostic
contract.
