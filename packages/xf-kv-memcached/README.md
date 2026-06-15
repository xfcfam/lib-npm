# 🧩 `@xfcfam/xf-kv-memcached`

> Memcached adapter for
> [`@xfcfam/xf-kv`](https://www.npmjs.com/package/@xfcfam/xf-kv) — the
> `KeyValueRepository` contract over
> [`memjs`](https://github.com/memcachier/memjs).

> [!NOTE]
> `memjs` is bundled and wired internally — you never import it.

## 📦 Install

```bash
npm i @xfcfam/xf @xfcfam/xf-kv @xfcfam/xf-kv-memcached
```

## 🚀 Quick start

```ts
import { MemcachedKeyValueRepository } from '@xfcfam/xf-kv-memcached'

export class SessionRepository extends MemcachedKeyValueRepository<Session> {
  constructor() {
    super({ servers: process.env.MEMCACHED_SERVERS, namespace: 'sess', defaultTtl: 3600 })
  }
}
```

## 🧰 Exported Components

### Generalizations

| Component | Description |
|---|---|
| [`MemcachedKeyValueRepository<V>`](./src/repository/general/MemcachedKeyValueRepository.ts) | Backs the contract over `memjs` — `get`/`set` (+ TTL) · `delete` · `has` · bulk · atomic `increment`/`decrement` (floor at 0). `ttl()` returns `undefined` and `clear()` raises — see the boundary case below. |

### Utilities

| Component | Description |
|---|---|
| [`MemcachedErrorUtils`](./src/repository/utils/MemcachedErrorUtils.ts) | Maps transport errors to `ConnectionException`. |

> [!WARNING]
> Memcached is intentionally minimal — two **boundary cases**: **`ttl(key)`**
> returns `undefined` (no TTL introspection) and **`clear()`** raises a
> `KeyValueException` (no key enumeration). Reach for
> [`@xfcfam/xf-kv-redis`](https://www.npmjs.com/package/@xfcfam/xf-kv-redis) when
> you need either.

## 📚 Documentation

Full specification → **[xfcfam.org](https://xfcfam.org)**

## ⚖️ License

MIT
