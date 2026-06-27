# 🧩 `@xfcfam/xf-client-http`

> HTTP outbound client for the **XF Architecture Model** — the
> [`ky`](https://github.com/sindresorhus/ky) implementation of the
> [`@xfcfam/xf-client`](https://www.npmjs.com/package/@xfcfam/xf-client) contract.
> One client, four entry-point shapes: **REST · WebSocket · SSE · GraphQL**.

> [!NOTE]
> This is **outbound** HTTP (your app calling someone). For **inbound** HTTP
> (someone calling your app), see
> [`@xfcfam/xf-server-http`](https://www.npmjs.com/package/@xfcfam/xf-server-http).

## 📦 Install

```bash
npm i @xfcfam/xf @xfcfam/xf-client @xfcfam/xf-client-http
```

## 🚀 Quick start

```ts
import { RetryRestRepository, ReviverUtils, RestException } from '@xfcfam/xf-client-http'

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
| [`RestRepository`](./src/repository/general/RestRepository.ts) | REST over `ky`. `call`/`get`/`post`/… resolve to the complete `HttpResponse` (`status`/`headers`/`body`). Content-type-agnostic encoding/parsing; streaming via `Request.stream`. Raises `RestException` (non-2xx) / `ConnectionException` (transport). |
| [`RetryRestRepository`](./src/repository/general/RetryRestRepository.ts) | `RestRepository` + a ready-made retry policy — retries 5xx · `429` · `ConnectionException`, never other 4xx. |
| [`GraphQLRepository`](./src/repository/general/GraphQLRepository.ts) | GraphQL over HTTP (extends `RestRepository`). `query`/`mutate` post the operation and unwrap `data`, raising `GraphQLException` on `errors`. Counterpart of the server's `GraphQLService`. |
| [`GraphQLWsRepository`](./src/repository/general/GraphQLWsRepository.ts) | GraphQL **subscriptions** over the `graphql-transport-ws` protocol (extends `WebSocketRepository`). `open()` handshakes and returns a `GraphQLWsClient` that multiplexes `subscribe` operations over one socket. |
| [`WebSocketRepository`](./src/repository/general/WebSocketRepository.ts) | Outbound WebSocket (duplex) over the platform global `WebSocket`. `connect()` hands back a `WebSocketConnection` (`send`/`onMessage`/`close`/…). Counterpart of the server's `WebSocketService`. |
| [`SseRepository`](./src/repository/general/SseRepository.ts) | Server-Sent Events consumer (extends `RestRepository`). `events()` streams the `GET` (no buffering) and parses the SSE wire protocol into `ServerSentEvent`s. Counterpart of the server's `SseUtils`. |

### Utilities

| Component | Description |
|---|---|
| [`ParseUtils`](./src/repository/utils/ParseUtils.ts) | Response content-type → parser routing (JSON, `*+json`, `text/*`). |
| [`SerializeUtils`](./src/repository/utils/SerializeUtils.ts) | Request content-type → serializer routing (`form`, `text/*`); `isEncoded` for transport-ready bodies. |
| [`ReviverUtils`](./src/repository/utils/ReviverUtils.ts) | JSON revivers — ISO-8601 strings → `Date`, composable. |

> [!TIP]
> xf-client-http stays lean — no XML/CSV libraries bundled. Register your own parser in
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
