# 🧩 `@xfcfam/xf-kv`

> Key-value / cache Access Generalization for the **XF Architecture Model** — a
> transport-agnostic `KeyValueRepository` contract (namespacing, codec, TTL,
> atomic counters, bulk ops). **Store-agnostic.**

> [!NOTE]
> Pair it with a store adapter —
> [`@xfcfam/xf-kv-redis`](https://www.npmjs.com/package/@xfcfam/xf-kv-redis) or
> [`@xfcfam/xf-kv-memcached`](https://www.npmjs.com/package/@xfcfam/xf-kv-memcached) —
> or implement the `*Raw` primitives over any backend yourself.

## 📦 Install

```bash
npm i @xfcfam/xf @xfcfam/xf-kv
# + a store adapter, e.g. Redis:
npm i @xfcfam/xf-kv-redis
```

## 🚀 Quick start

```ts
import { RedisKeyValueRepository } from '@xfcfam/xf-kv-redis'

export class SessionRepository extends RedisKeyValueRepository<Session> {
  constructor() { super({ url: process.env.REDIS_URL, namespace: 'sess', defaultTtl: 3600 }) }
}
// R.sessions.set(token, session) · R.sessions.get(token) · R.metrics.increment('logins')
```

## 🧰 Exported Components

### Generalizations

| Component | Description |
|---|---|
| [`KeyValueRepository<V>`](./src/repository/general/KeyValueRepository.ts) | The transport-agnostic store contract. Layers key namespacing, a developer-chosen `Codec<V>` (JSON default) and typed error-translation over the adapter's `*Raw` primitives. Surfaces the typed `KeyValueException` / `ConnectionException` / `SerializationException`; bulk writes take an `Entry<V>`. |

### Utilities

| Component | Description |
|---|---|
| [`CodecUtils`](./src/repository/utils/CodecUtils.ts) | Built-in value codecs; JSON is the default. |
| [`KeyUtils`](./src/repository/utils/KeyUtils.ts) | Pure key-namespacing helpers. |

> [!TIP]
> Namespacing, serialisation and typed error-translation are layered here once, so
> every adapter gets them for free. Complements the core's in-process
> `CacheableBusiness` — this is the **external**, distributed cache.

## 📚 Documentation

Full specification → **[xfcfam.org](https://xfcfam.org)** · [`examples/04-kv-memory`](https://github.com/xfcfam/lib-npm/tree/main/examples/04-kv-memory)

## ⚖️ License

MIT
