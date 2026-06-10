# 03-rest-server

End-to-end example of `@xfcfam/xf-server`. Demonstrates **every
documented capability** in a single runnable artefact:

| Capability | Where to look |
| --- | --- |
| `RestService` (raw / streaming bodies) | `FilesRestService.events` (Server-Sent Events) |
| `ObjectRestService` (auto-parse / auto-serialize JSON) | `UsersRestService`, `HealthRestService`, `FilesRestService` |
| Object request bodies | `UsersRestService.create` / `update` |
| Object response bodies | every `users` / `health` / `files` listing endpoint |
| Streaming response | `FilesRestService.events` and `FilesRestService.preview` |
| File response (attachment / inline) | `FilesRestService.download` / `preview` |
| Multipart uploads (`multipart: true`) | `FilesRestService.upload` |
| **Service-level** interceptors | `UsersRestService.onRequest` / `onResponse` |
| **Server-level** interceptors | `AppServerService.onRequest` / `onResponse` / `onError` / `onStarted` / `onStopped` |
| Selective wrapper (skip streams) | `AppServerService.onResponse` via `ResponseUtils.isObject` |
| **`RestServerService.discover(A)`** auto-discovery | `A.server` constructor lambda + `AppServerService.services()` |
| `import.meta.glob` auto-discovery recipe | this README, section below |
| Typed exceptions | `NotFoundException`, `BadRequestException` thrown from handlers |

## Project layout

```
03-rest-server/
├── package.json
├── tsconfig.json
├── main.ts                          ← entry point (outside /src)
└── src/
    ├── XF.ts                        ← architecture orchestrator
    ├── repository/
    │   ├── R.ts                     ← Access Injection
    │   ├── logic/local/
    │   │   ├── UsersRepository.ts   ← in-memory CRUD store
    │   │   └── FilesRepository.ts   ← in-memory blob store
    │   └── structs/
    │       ├── User.ts              ← Transfer
    │       └── StoredFile.ts        ← Transfer
    ├── business/
    │   ├── B.ts                     ← Business Injection
    │   └── logic/
    │       ├── UsersBusiness.ts     ← domain logic for users
    │       └── FilesBusiness.ts     ← domain logic + SSE stream factory
    └── api/
        ├── A.ts                     ← Interaction Injection (declares every Service)
        └── logic/service/
            ├── UsersRestService.ts  ← ObjectRestService + service-level hooks
            ├── FilesRestService.ts  ← multipart, downloads, SSE, streaming
            ├── HealthRestService.ts ← trivial JSON + plain-text response
            └── AppServerService.ts  ← RestServerService + global hooks + discover(A)
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
| `GET`    | `/health`                 | health-check JSON |
| `GET`    | `/ping`                   | plain-text `pong\n` |
| `GET`    | `/users`                  | list users (JSON) |
| `GET`    | `/users/:id`              | get one user |
| `POST`   | `/users`                  | create user — JSON body |
| `PUT`    | `/users/:id`              | update user — JSON body |
| `DELETE` | `/users/:id`              | delete user → 204 |
| `GET`    | `/files`                  | list file metadata |
| `POST`   | `/files`                  | upload via `multipart/form-data` |
| `GET`    | `/files/:id/download`     | attachment (forces save) |
| `GET`    | `/files/:id/preview`     | inline (browser-rendered, streamed) |
| `GET`    | `/files/events`           | Server-Sent Events stream (5 events @ 1s) |

### Try it

```bash
# Health
curl http://localhost:3000/health

# Object response (wrapped by server-level onResponse envelope)
curl http://localhost:3000/users

# Object request body
curl -X POST http://localhost:3000/users \
  -H 'content-type: application/json' \
  -d '{"name":"Grace Hopper","email":"grace@xfcfam.org"}'

# Multipart upload
curl -F "file=@README.md" http://localhost:3000/files

# Download (attachment)
curl -OJ http://localhost:3000/files/sample/download

# Preview (inline, streamed)
curl -i http://localhost:3000/files/sample/preview

# Server-Sent Events stream
curl -N http://localhost:3000/files/events
```

## Envelope policy

The server-level `onResponse` hook in `AppServerService` applies a
uniform envelope **only to object responses**:

```typescript
override async onResponse(_req, res) {
  if (!ResponseUtils.isObject(res.body)) return res     // pass-through streams / files
  return { ...res, body: { code: '0', description: 'OK', data: res.body } }
}
```

The result:

- `GET /users` → `{ code: '0', description: 'OK', data: [...] }`
- `GET /files/sample/download` → raw bytes of the file (no envelope)
- `GET /files/events` → SSE stream (no envelope)
- `GET /ping` → plain `pong\n` (textual, no envelope)

## Auto-discovery in `A`

`A` declares every `RestService` as `static readonly` (the canonical
XF pattern — every Logical of the Injection layer is a static field
of the Injection class). The server orchestrator receives a lazy
callback that calls `RestServerService.discover(A)`:

```typescript
export class A {
  private constructor() {}
  static readonly usersService  = new UsersRestService()
  static readonly filesService  = new FilesRestService()
  static readonly healthService = new HealthRestService()
  static readonly server        = new AppServerService(() => RestServerService.discover(A))
  // ...
}
```

`discover(A)` introspects `A`'s static fields and returns every
`RestService` instance — the server itself is filtered out. Add a
new endpoint? Declare a new `static readonly xxxService = new
XxxRestService()` on `A` and you're done — the server picks it up.

### Alternative: bundler-glob (Vite / esbuild only)

For projects bundled with Vite or esbuild that support
`import.meta.glob`, the discovery can be done at compile time
instead of via reflection on `A`. The bundler resolves the glob at
build time — zero filesystem access at runtime, no XF violations:

```typescript
// A.ts — Vite/esbuild variant
import { RestServerService, type RestService } from '@xfcfam/xf-server'
import { AppServerService } from './logic/service/AppServerService.js'

const modules = import.meta.glob<{ default: new () => RestService }>(
  './logic/service/*RestService.ts',
  { eager: true, import: 'default' },
)
const discovered: RestService[] = Object.values(modules).map((Ctor) => new Ctor())

export class A {
  private constructor() {}
  static readonly server = new AppServerService(() => discovered)
  static async init()      { for (const s of discovered) await s.init(); await A.server.init() }
  static async terminate() { await A.server.terminate(); for (const s of discovered) await s.terminate() }
}
```

Each service file would `export default class XxxRestService extends
RestService { ... }`. The bundler resolves the glob at compile time —
zero filesystem access at runtime, no XF violations.

This example uses the manual `static readonly` + `discover(A)`
pattern instead because it works with plain `tsc` (no bundler
required) and is more explicit. Pick the variant that fits your
build setup.

## License

MIT.
