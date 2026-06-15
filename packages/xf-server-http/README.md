# 🧩 `@xfcfam/xf-server-http`

> HTTP transport for the **XF Architecture Model** — the
> [Fastify](https://fastify.dev) implementation of the
> [`@xfcfam/xf-server`](https://www.npmjs.com/package/@xfcfam/xf-server) contract.
> One server, one port, four entry-point shapes: **REST · WebSocket · SSE · GraphQL**.

> [!NOTE]
> **Inbound** HTTP (someone calling your app) — the sister of
> [`@xfcfam/xf-rest`](https://www.npmjs.com/package/@xfcfam/xf-rest) (outbound). The
> server lives on `B` (`B.server`, Business); services register on it from their
> own `init()` (the push model).

## 📦 Install

```bash
npm i @xfcfam/xf @xfcfam/xf-server @xfcfam/xf-server-http
```

Fastify, multipart, WebSocket and GraphQL engines are **bundled and lazy-loaded** — you pay only for what you use.

## 🚀 Quick start (object REST)

```ts
import { ObjectRestService, HttpStatusUtils, NotFoundException,
         type HttpRequest, type HttpResponse } from '@xfcfam/xf-server-http'

export class UsersRestService extends ObjectRestService {
  override async init() { B.server.get('/users/:id', this.object(this.getOne)) }

  private async getOne(req: HttpRequest): Promise<HttpResponse> {
    const user = await B.user.findById(req.params['id']!)
    if (!user) throw new NotFoundException(`User ${req.params['id']}`)
    return { status: HttpStatusUtils.OK, body: user }
  }
}
```

## 🧰 Exported Components

### Generalizations

| Component | Description |
|---|---|
| [`HttpServerBusiness`](./src/business/general/HttpServerBusiness.ts) | The Fastify lifecycle + route registry on `B.server`. Raises typed `HttpException` (+ 5 subclasses → HTTP statuses); wire data are `HttpRequest` / `HttpResponse` / `MultipartPart` / `WebSocketConnection` / `GraphQLConfig`. |
| [`RestService`](./src/api/general/RestService.ts) / [`ObjectRestService`](./src/api/general/ObjectRestService.ts) | Raw-body vs auto parse/serialise by `Content-Type` (JSON built-in; XML/CSV pluggable; developer-chosen dates). |
| [`WebSocketService`](./src/api/general/WebSocketService.ts) · [`GraphQLService`](./src/api/general/GraphQLService.ts) | Bidirectional channels · GraphQL (Mercurius), on the same port. |

### Utilities

| Component | Description |
|---|---|
| [`SseUtils`](./src/api/utils/SseUtils.ts) | Build a `text/event-stream` response from an async event source. |
| [`HttpStatusUtils`](./src/api/utils/HttpStatusUtils.ts) | Named HTTP status codes. |
| [`ResponseUtils`](./src/api/utils/ResponseUtils.ts) · [`SchemaValidatorUtils`](./src/api/utils/SchemaValidatorUtils.ts) · [`FileResponseUtils`](./src/api/utils/FileResponseUtils.ts) | Body-shape classifiers, duck-typed validation, file responses. |

> [!IMPORTANT]
> **Push-then-start.** `init()` does **not** listen — services push routes during
> `A.init()`, then the start-point calls `B.server.listen()` once all routes are in
> (Fastify freezes its routing table on listen). SSE is just a `RestService` route.

> [!TIP]
> Full feature tour — multipart uploads, streaming downloads, interceptors, graceful
> shutdown → [`examples/03-rest-server`](https://github.com/xfcfam/lib-npm/tree/main/examples/03-rest-server).

## 📚 Documentation

Full specification → **[xfcfam.org](https://xfcfam.org)**

## ⚖️ License

MIT
