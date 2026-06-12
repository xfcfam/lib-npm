# `@xfcfam/xf-server-http`

HTTP transport for the **XF Architecture Model** — the [Fastify](https://fastify.dev)
implementation of the transport-agnostic
[`@xfcfam/xf-server`](../xf-server) contract. One server, one port,
four entry-point shapes: **REST**, **WebSocket**, **SSE**, and **GraphQL**.

The package spans two layers, by design:

- **`HttpServerBusiness`** (Business Layer) owns the transport lifecycle
  (Fastify) and the route registry. Starting a server is infrastructure,
  not a protocol detail — in XF that belongs to the Business Layer. It
  lives on `B` (e.g. `B.server`).
- **`RestService` / `ObjectRestService` / `WebSocketService` /
  `GraphQLService`** (Interaction Layer) are the entry points. Each
  registers itself on `B.server` from its own `init()` (the push model).

Sister of `@xfcfam/xf-rest` (outbound HTTP — your app calling someone):
`xf-server-http` is **inbound HTTP** — someone calling your app.

## Install

```bash
pnpm add @xfcfam/xf @xfcfam/xf-server @xfcfam/xf-server-http
```

Fastify, `@fastify/multipart`, `@fastify/websocket`, `mercurius` and the
rest are bundled as direct dependencies and **lazy-loaded** — you pay for
multipart / WebSocket / GraphQL only if you use them. The consumer never
installs or imports the underlying engines.

## What ships here

| Component | Layer · type | Purpose |
| --- | --- | --- |
| `HttpServerBusiness` | Business · Generalization | Server orchestrator. Owns the Fastify lifecycle + route registry. Routes pushed via `B.server.get/post/…`, `B.server.ws(...)`, `B.server.graphql(...)`. Start-point calls `listen()` / `close()`. |
| `RestService` | Interaction · Generalization | Raw-body endpoints (streams / bytes). `wrap(handler)` for the per-service pipeline. |
| `ObjectRestService` | Interaction · Generalization | Auto parse / serialise by `Content-Type` via `object(handler)`. JSON built-in; XML/CSV/YAML pluggable; developer-chosen date handling (`reviveDates`, `formatDate`). |
| `WebSocketService` | Interaction · Generalization | Bidirectional channels. Registers connection handlers via `B.server.ws(path, …)`. |
| `GraphQLService` | Interaction · Generalization | GraphQL endpoint (Mercurius). Supplies schema + resolvers via `B.server.graphql(...)`. |
| `SseUtils` | Interaction · Utility | Build a `text/event-stream` response from an async event source. |
| `HttpRequest`, `HttpResponse`, `HttpAddress`, `HttpHandler`, `MultipartPart`, `WebSocketConnection`, `GraphQLConfig` | Business · Transfer | The data crossing the wire. |
| `HttpException` + 5 typed subclasses | Business · Transfer | Throw inside a handler; the server maps it to the right HTTP status. |
| `HttpStatusUtils`, `SchemaValidatorUtils`, `FileResponseUtils`, `ResponseUtils` | Interaction · Utility | Status constants, duck-typed validation, file/stream helpers, body-shape classifiers. |

## Quick start (object REST)

```typescript
import {
  ObjectRestService, HttpStatusUtils, NotFoundException, BadRequestException,
  type HttpRequest, type HttpResponse,
} from '@xfcfam/xf-server-http'
import { B } from '../../../business/B.js'

export class UsersRestService extends ObjectRestService {
  override async init(): Promise<void> {
    B.server.get('/users',      this.object(this.list))
    B.server.get('/users/:id',  this.object(this.getOne))
    B.server.post('/users',     this.object(this.create))
    B.server.del('/users/:id',  this.object(this.remove))
  }

  private async getOne(req: HttpRequest): Promise<HttpResponse> {
    const user = await B.user.findById(req.params['id']!)
    if (user === null) throw new NotFoundException(`User ${req.params['id']}`)
    return { status: HttpStatusUtils.OK, body: user }
  }
  // create / list / remove …
}
```

Route helpers on `B.server`: `get`, `post`, `put`, `patch`, `del`, and
`call(method, path, handler)` for any other verb.

## Server orchestration

The server is a **Business** component (`HttpServerBusiness`) declared on
`B`. Concrete subclasses set the port and override the global hooks:

```typescript
import { HttpServerBusiness, ResponseUtils, type HttpRequest, type HttpResponse } from '@xfcfam/xf-server-http'

export class AppServerBusiness extends HttpServerBusiness {
  constructor() { super({ port: Number.parseInt(process.env['PORT'] ?? '3000', 10) }) }

  override async onRequest(req: HttpRequest): Promise<HttpRequest> {
    console.log(`${req.method} ${req.path}`); return req
  }
  override async onResponse(_req: HttpRequest, res: HttpResponse): Promise<HttpResponse> {
    if (!ResponseUtils.isObject(res.body)) return res          // streams/files pass through
    return { ...res, body: { code: '0', description: 'OK', data: res.body } }
  }
}
```

### Lifecycle and initialisation order

`HttpServerBusiness.init()` is a **no-op** — it does not start listening.
Services register their routes during `A.init()` (after `B.init()`); the
start-point opens the socket **explicitly** once every route is in:

```typescript
// main.ts — start-point
await XF.init()           // R → B → A; services push routes on B.server
await B.server.listen()   // start Fastify after all routes are in
// …on shutdown:
await B.server.close()    // drain in-flight requests
await XF.terminate()      // A → B → R
```

Pushing a route after `listen()` raises an error (Fastify freezes its
routing table once listening) — hence the **push-then-start** ordering.

## WebSocket

A bidirectional channel on the same Fastify instance and port. Extend
`WebSocketService` and register a connection handler:

```typescript
import { WebSocketService, type WebSocketConnection } from '@xfcfam/xf-server-http'
import { B } from '../../../business/B.js'

export class ChatService extends WebSocketService {
  override async init(): Promise<void> {
    B.server.ws('/chat', this.accept(this.onConnection))
  }
  private onConnection(conn: WebSocketConnection): void {
    conn.send('welcome')
    conn.onMessage((data) => conn.send(`echo: ${String(data)}`))
    conn.onClose(() => {})
  }
}
```

## Server-Sent Events

SSE is plain HTTP (a long-lived `GET` whose body is a stream), so it is
just a `RestService` route — no plugin. `SseUtils` formats the events:

```typescript
import { RestService, SseUtils, type HttpResponse, type ServerSentEvent } from '@xfcfam/xf-server-http'

export class ClockService extends RestService {
  override async init() { B.server.get('/clock', this.wrap(this.clock)) }
  private async clock(): Promise<HttpResponse> {
    async function* ticks(): AsyncGenerator<ServerSentEvent> {
      for (let n = 0; ; n++) {
        yield { event: 'tick', id: String(n), data: { n, at: new Date().toISOString() } }
        await new Promise((r) => setTimeout(r, 1000))
      }
    }
    return SseUtils.stream(ticks())
  }
}
```

## GraphQL

A GraphQL API (Mercurius) on the shared instance at `/graphql`. Supply
schema + resolvers; the resolvers delegate to Business like REST handlers:

```typescript
import { GraphQLService, type GraphQLConfig } from '@xfcfam/xf-server-http'
import { B } from '../../../business/B.js'

export class ApiGraphQLService extends GraphQLService {
  override async init() { B.server.graphql(this.config()) }
  protected override config(): GraphQLConfig {
    return {
      schema: `type User { id: ID!  name: String! }  type Query { users: [User!]! }`,
      resolvers: { Query: { users: () => B.user.list() } },
      graphiql: true,
    }
  }
}
```

## Date handling (object REST)

`ObjectRestService` lets the developer decide how dates cross the wire,
both directions, with no extra dependency.

- **Serialising** — a `Date` becomes ISO-8601 by default. Pass
  `formatDate` to choose any format; applied to every `Date` in the body
  (nested objects and arrays included):
  ```typescript
  super({ formatDate: (d) => d.toISOString().slice(0, 10) })  // YYYY-MM-DD
  ```
- **Parsing** — set `reviveDates: true` so the JSON parser turns ISO date
  strings back into real `Date` objects. The reviver is also exposed:
  `JSON.parse(text, ObjectRestService.dateReviver)`.

## Multipart uploads (opt-in)

Enable on the server with one option — nothing else to install:

```typescript
super({ port: 3000, multipart: { maxFileSize: 10 * 1024 * 1024, maxFiles: 5 } })
```

Handlers then see `req.body` as `MultipartPart[]`. The parser is
lazy-loaded at `listen()` time (only paid for if you opt in).

## Pipeline order

Per request, top to bottom:

1. **`HttpServerBusiness.onRequest`** — global pre-processing.
2. **`ObjectRestService` parse** — `object(handler)` auto-parses the body.
3. **`RestService.onRequest`** — per-service pre-processing.
4. **The matched route handler**.
5. **`RestService.onResponse`** — per-service post-processing (semantic body).
6. **`HttpServerBusiness.onResponse`** — global post-processing (envelopes).
7. **`ObjectRestService` serialise** — object → bytes, last, honouring `formatDate`.

`onResponse` runs **before** serialisation so envelope policies inspect
the original payload, not an already-encoded `Uint8Array`. `ResponseUtils`
exposes four disjoint body classifiers — `isStream`, `isBinary`,
`isTextual`, `isObject` — for "object responses only" policies.

### Error chain

When step 3–5 throws: `RestService.onError` → `HttpServerBusiness.onError`
→ default (an `HttpException` maps to its `status`/`body`; otherwise
`500`).

## Full example

See [`examples/03-rest-server`](../../examples/03-rest-server) for a
complete artefact: `HttpServerBusiness` on `B`; REST, SSE, WebSocket and
GraphQL services pushing to the one server; multipart uploads; streaming
downloads; service- and server-level interceptors; graceful shutdown.

```bash
pnpm --filter @xfcfam-examples/03-rest-server start
```

## License

MIT.
