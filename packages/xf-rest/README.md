# 🧩 `@xfcfam/xf-rest`

> REST Access Generalization for the **XF Architecture Model** — the
> [`ky`](https://github.com/sindresorhus/ky) HTTP client behind one
> XF-canonical class, with a ready-to-use retry composition.

> [!NOTE]
> This is **outbound** HTTP (your app calling someone). For **inbound** HTTP
> (someone calling your app), see
> [`@xfcfam/xf-server-http`](https://www.npmjs.com/package/@xfcfam/xf-server-http).

## 📦 Install

```bash
npm i @xfcfam/xf @xfcfam/xf-rest
```

## 🚀 Quick start

```ts
import { RetryRestRepository, ReviverUtils, RestException } from '@xfcfam/xf-rest'

export class UsersRest extends RetryRestRepository {
  constructor() {
    super('https://api.example.com', { reviver: ReviverUtils.isoDateReviver })
  }
  getUser(id: number) {
    return this.withRetry(() => this.get<User>(`/users/${id}`))
  }
}
// type-driven errors:  catch (e) { if (e instanceof RestException && e.status === 404) … }
```

## 🧰 Exported Components

### Generalizations

| Component | Description |
|---|---|
| [`RestRepository`](./src/repository/general/RestRepository.ts) | The REST contract over `ky`. Parses by `Content-Type`, revives dates, and raises typed `RestException` (HTTP non-2xx) / `ConnectionException` (transport); each call is described by a `Request`. |
| [`RetryRestRepository`](./src/repository/general/RetryRestRepository.ts) | `RestRepository` + a ready-made retry policy — retries 5xx · `429` · `ConnectionException`, never other 4xx. |

### Utilities

| Component | Description |
|---|---|
| [`ParseUtils`](./src/repository/utils/ParseUtils.ts) | Response content-type → parser routing (JSON, `*+json`, `text/*`). |
| [`SerializeUtils`](./src/repository/utils/SerializeUtils.ts) | Request content-type → serializer routing (`form`, `text/*`); `isEncoded` for transport-ready bodies. |
| [`ReviverUtils`](./src/repository/utils/ReviverUtils.ts) | JSON revivers — ISO-8601 strings → `Date`, composable. |

> [!TIP]
> xf-rest stays lean — no XML/CSV libraries bundled. Register your own parser in
> `RestOptions.parsers`; the same pipeline parses the body of a `RestException` too.

> [!NOTE]
> The transport is content-type **agnostic**. A plain object defaults to JSON, but a
> `URLSearchParams` / `FormData` / `Blob` / typed array / string / stream is sent as-is,
> and an explicit request `Content-Type` selects a built-in (form / `text/*`) or a custom
> `Serializer` registered in `RestOptions.serializers` — the request-side mirror of `parsers`.
>
> ```ts
> // OAuth token request as application/x-www-form-urlencoded
> await this.call({
>   method: 'POST', path: '/oauth/token',
>   headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
>   body: new URLSearchParams({ grant_type: 'client_credentials' }),
> })
> ```

## 📚 Documentation

Full specification → **[xfcfam.org](https://xfcfam.org)** · [`examples/01-rest-basic`](https://github.com/xfcfam/lib-npm/tree/main/examples/01-rest-basic)

## ⚖️ License

MIT
