# 🧩 `@xfcfam/xf-kv-redis`

> Redis adapter for [`@xfcfam/xf-kv`](https://www.npmjs.com/package/@xfcfam/xf-kv) —
> the `KeyValueRepository` contract over
> [`ioredis`](https://github.com/redis/ioredis).

> [!NOTE]
> `ioredis` is bundled and wired internally — you never import it. Name your
> concrete class by **domain** (`SessionRepository`), not by technology.

## 📦 Install

```bash
npm i @xfcfam/xf @xfcfam/xf-kv @xfcfam/xf-kv-redis
```

## 🚀 Quick start

```ts
import { RedisKeyValueRepository } from '@xfcfam/xf-kv-redis'

export class SessionRepository extends RedisKeyValueRepository<Session> {
  constructor() { super({ url: process.env.REDIS_URL, namespace: 'sess', defaultTtl: 3600 }) }
}
```

## 🧰 Exported Components

### Generalizations

| Component | Description |
|---|---|
| [`RedisKeyValueRepository<V>`](./src/repository/general/RedisKeyValueRepository.ts) | Backs the contract with native Redis commands — `GET` · `SET … EX` · `DEL` · `EXISTS` · `INCRBY` · `MGET` · pipelined `SET` · `TTL` · `SCAN`+`DEL`. |

### Utilities

| Component | Description |
|---|---|
| [`RedisErrorUtils`](./src/repository/utils/RedisErrorUtils.ts) | Maps transport codes (`ECONNREFUSED`, …) to `ConnectionException`. |

> [!TIP]
> Full TTL introspection and namespace-scoped `clear()` are supported (unlike the
> Memcached adapter). Pass `url`, or a full `ioredis` options object via `redis`.

## 📚 Documentation

Full specification → **[xfcfam.org](https://xfcfam.org)**

## ⚖️ License

MIT
