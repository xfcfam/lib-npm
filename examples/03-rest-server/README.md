# 03-rest-server

End-to-end example of [`@xfcfam/xf-server-http`](../../packages/xf-server-http).
A single runnable XF artefact that serves **four entry-point shapes on
one server and one port**: REST, Server-Sent Events, WebSocket and
GraphQL.

| Capability | Where to look |
| --- | --- |
| `ObjectRestService` (auto-parse / auto-serialise JSON) | `UsersRestService`, `HealthRestService`, `FilesRestService` |
| `RestService` (raw / streaming bodies) | `FilesRestService.download` / `preview` / `events` |
| Object request / response bodies | `UsersRestService.create` / `update`, every listing endpoint |
| File response (attachment / inline, streamed) | `FilesRestService.download` / `preview` |
| Multipart uploads (`multipart: { … }`) | `FilesRestService.upload` |
| **SSE** via `SseUtils` (typed events) | `ClockSseService` → `GET /clock` |
| **SSE** via `FileResponseUtils.stream` (raw) | `FilesRestService.events` → `GET /files/events` |
| **WebSocket** (`B.server.ws`) | `ChatWebSocketService` → `WS /chat` |
| **GraphQL** (`B.server.graphql`, Mercurius) | `ApiGraphQLService` → `POST /graphql` |
| **Service-level** interceptors | `UsersRestService.onRequest` / `onResponse` |
| **Server-level** interceptors | `ServerBusiness.onRequest` / `onResponse` / `onError` / `onStarted` / `onStopped` |
| Selective envelope (skip streams/files) | `ServerBusiness.onResponse` via `ResponseUtils.isObject` |
| Typed exceptions | `NotFoundException`, `BadRequestException` thrown from handlers |

## Architecture

The HTTP server is a **Business** component — `HttpServerBusiness` owns
the Fastify lifecycle and the route registry, so the concrete
`ServerBusiness` lives on `B` (`B.server`). Each Interaction service
**pushes** its own routes to `B.server` from its `init()`:

- REST    → `B.server.get/post/put/del(path, this.object(handler))`
- SSE     → a plain `GET` returning `SseUtils.stream(...)`
- WS      → `B.server.ws(path, this.accept(handler))`
- GraphQL → `B.server.graphql(this.config())`

The start-point (`main.ts`) calls `B.server.listen()` **after**
`XF.init()` — i.e. after every service has registered — and
`B.server.close()` before `XF.terminate()`.

```
03-rest-server/
├── package.json
├── tsconfig.json
├── main.ts                              ← start-point: XF.init → B.server.listen
└── src/
    ├── XF.ts                            ← architecture orchestrator (R → B → A)
    ├── repository/
    │   ├── R.ts                         ← Access Injection
    │   ├── logic/local/
    │   │   ├── UsersRepository.ts       ← in-memory CRUD store
    │   │   └── FilesRepository.ts       ← in-memory blob store
    │   └── transfers/
    │       ├── User.ts                  ← Transfer
    │       └── StoredFile.ts            ← Transfer
    ├── business/
    │   ├── B.ts                         ← Business Injection (B.server / B.user / B.file)
    │   └── logic/
    │       ├── ServerBusiness.ts        ← extends HttpServerBusiness — global hooks, multipart
    │       ├── UserBusiness.ts          ← domain logic for users
    │       └── FileBusiness.ts          ← domain logic + SSE stream factory
    └── api/
        ├── A.ts                         ← Interaction Injection (declares every Service)
        └── logic/service/
            ├── UsersRestService.ts      ← ObjectRestService + service-level hooks
            ├── FilesRestService.ts      ← multipart, downloads, raw SSE, streaming
            ├── HealthRestService.ts     ← trivial JSON + plain-text response
            ├── ClockSseService.ts       ← SSE via SseUtils
            ├── ChatWebSocketService.ts  ← WebSocket echo channel
            └── ApiGraphQLService.ts     ← GraphQL endpoint (Mercurius)
```

## Run

```bash
pnpm install
pnpm --filter @xfcfam-examples/03-rest-server start
```

Listens on `http://localhost:3000` (override with `PORT=8080`).

## Endpoints

| Method | Path | What it does |
| --- | --- | --- |
| `GET`    | `/health`             | health-check JSON |
| `GET`    | `/ping`               | plain-text `pong\n` |
| `GET`    | `/users`              | list users (JSON) |
| `GET`    | `/users/:id`          | get one user |
| `POST`   | `/users`              | create user — JSON body |
| `PUT`    | `/users/:id`          | update user — JSON body |
| `DELETE` | `/users/:id`          | delete user → 204 |
| `GET`    | `/files`              | list file metadata |
| `POST`   | `/files`              | upload via `multipart/form-data` |
| `GET`    | `/files/:id/download` | attachment (forces save) |
| `GET`    | `/files/:id/preview`  | inline (browser-rendered, streamed) |
| `GET`    | `/files/events`       | raw SSE stream (5 events @ 1s) |
| `GET`    | `/clock`              | **SSE** via `SseUtils` (typed `tick` events) |
| `WS`     | `/chat`               | **WebSocket** echo channel |
| `POST`   | `/graphql`            | **GraphQL** API (GraphiQL IDE on `GET`) |

### Try it

```bash
# Health
curl http://localhost:3000/health

# Object response (wrapped by the server-level onResponse envelope)
curl http://localhost:3000/users

# Object request body
curl -X POST http://localhost:3000/users \
  -H 'content-type: application/json' \
  -d '{"name":"Grace Hopper","email":"grace@xfcfam.org"}'

# Multipart upload
curl -F "file=@README.md" http://localhost:3000/files

# Download (attachment) / preview (inline, streamed)
curl -OJ http://localhost:3000/files/sample/download
curl -i  http://localhost:3000/files/sample/preview

# SSE (SseUtils)
curl -N http://localhost:3000/clock

# GraphQL
curl -X POST http://localhost:3000/graphql \
  -H 'content-type: application/json' \
  -d '{"query":"{ users { id name } }"}'

# WebSocket — needs a WS client, e.g. websocat
websocat ws://localhost:3000/chat
```

## Envelope policy

The server-level `onResponse` hook in `ServerBusiness` applies a uniform
envelope **only to object responses**; streams, files, bytes and plain
text pass through untouched:

```typescript
override async onResponse(_req, res) {
  if (!ResponseUtils.isObject(res.body)) return res     // pass-through streams / files
  return { ...res, body: { code: '0', description: 'OK', data: res.body } }
}
```

So `GET /users` → `{ code: '0', description: 'OK', data: [...] }`, while
`GET /files/sample/download` (bytes), `GET /clock` (SSE) and `GET /ping`
(text) are sent verbatim.

## Registration model — push, not discover

`A` declares every service as `static readonly` (the canonical XF
pattern), and each service registers **itself** on `B.server` from its
own `init()`:

```typescript
// api/logic/service/UsersRestService.ts
override async init(): Promise<void> {
  B.server.get('/users',      this.object(this.list))
  B.server.post('/users',     this.object(this.create))
  B.server.del('/users/:id',  this.object(this.remove))
}

// api/logic/service/ChatWebSocketService.ts
override async init(): Promise<void> {
  B.server.ws('/chat', this.accept(this.onConnection))
}

// api/logic/service/ApiGraphQLService.ts
override async init(): Promise<void> {
  B.server.graphql(this.config())
}
```

There is no reflection and no central route table to maintain: adding an
endpoint is adding a `B.server.*` call in the relevant service's
`init()`. The server (`B.server`) owns the registry; the services
contribute to it.

## License

MIT.
