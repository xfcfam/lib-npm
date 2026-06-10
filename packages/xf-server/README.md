# `@xfcfam/xf-server`

HTTP server Interaction Layer Generalization for the **XF Architecture
Model**. Encapsulates [Fastify](https://fastify.dev) behind canonical
`RestService` / `ObjectRestService` / `RestServerService` bases so
implementers expose REST APIs by extending a single XF class — no
boilerplate around route registration, body parsing, multipart, error
mapping or lifecycle.

Sister of `@xfcfam/xf-rest` (outbound HTTP — your app calling
someone): `xf-server` is **inbound HTTP** — someone calling your app.

## Install

```bash
pnpm add @xfcfam/xf @xfcfam/xf-server
```

That's everything. Fastify, `@fastify/multipart` and the rest of the
internal machinery are bundled as direct dependencies of
`@xfcfam/xf-server` — the consumer never installs or imports them.
The XF doctrine: a package encapsulates its protocol of access end to
end, so the implementer only deals with XF-canonical classes
(`RestService`, `ObjectRestService`, `RestServerService`) and never
the underlying HTTP engine.

## What ships here

| Component | Purpose |
| --- | --- |
| `RestService` | Generalization for raw-body endpoints. Body arrives as `Uint8Array` / `ReadableStream<Uint8Array>`. Use for uploads, downloads, SSE, anything that streams bytes. |
| `ObjectRestService` | Extends `RestService` with automatic request parsing / response serialisation by Content-Type. JSON built-in (zero deps). XML/CSV/YAML are pluggable parsers. |
| `RestServerService` | Artefact-level server orchestrator. Starts Fastify in `init()`, mounts the routes of every registered Service, shuts down in `terminate()`. |
| `HttpRequest`, `HttpResponse`, `Route`, `HttpHandler`, `HttpMethod`, `MultipartPart` | Transfers. |
| `HttpException` + 5 typed subclasses (`BadRequestException`, `UnauthorizedException`, `ForbiddenException`, `NotFoundException`, `InternalServerException`) | Throw inside a handler; the server translates to the right HTTP status automatically. |
| `HttpStatusUtils`, `SchemaValidatorUtils`, `FileResponseUtils`, `ResponseUtils` | Utilities. |

## Quick start (object REST)

```typescript
import { ObjectRestService, HttpStatus, NotFoundException, SchemaValidator } from '@xfcfam/xf-server'
import { z } from 'zod'

const UserCreate = z.object({ name: z.string(), email: z.string().email() })

export class UsersRestService extends ObjectRestService {
  override async init(): Promise<void> {
    this.handle('GET',  '/users/:id', this.getUser)
    this.handle('POST', '/users',     this.createUser)
  }

  private async getUser(req): Promise<HttpResponse> {
    const user = await B.userBusiness.findById(req.params.id)
    if (user === null) throw new NotFoundException(`User ${req.params.id}`)
    return { status: HttpStatus.OK, body: user }
  }

  private async createUser(req): Promise<HttpResponse> {
    const dto = SchemaValidator.parse(UserCreate, req.body)
    const user = await B.userBusiness.create(dto)
    return { status: HttpStatus.CREATED, body: user }
  }
}
```

`SchemaValidator` is **duck-typed on `.safeParse(value)`** — works with
zod, valibot, arktype-with-adapter, anything that exposes that shape.
xf-server does **not** depend on zod at runtime.

## Server orchestration

```typescript
import { RestServerService } from '@xfcfam/xf-server'
import { A } from './A.js'

export class MyServerService extends RestServerService {
  constructor() { super({ port: 3000 }) }

  // Auto-discover every RestService declared on A.
  override services() { return RestServerService.discover(A) }

  // Cross-cutting hooks (apply to every service).
  override async onRequest(req) {
    console.log(`${req.method} ${req.path}`)
    return req
  }

  override async onResponse(_req, res) {
    return { ...res, headers: { ...res.headers, 'x-server': 'xf-server' } }
  }
}

// In A.ts — declare every Service as `static readonly`. That single
// declaration is enough; discover() finds them automatically.
export class A {
  private constructor() {}
  static readonly usersService  = new UsersRestService()
  static readonly ordersService = new OrdersRestService()
  static readonly authService   = new AuthRestService()
  static readonly server        = new MyServerService()

  static async init(): Promise<void> {
    await A.usersService.init()
    await A.ordersService.init()
    await A.authService.init()
    await A.server.init()
  }
  static async terminate(): Promise<void> {
    await A.server.terminate()
    await A.authService.terminate()
    await A.ordersService.terminate()
    await A.usersService.terminate()
  }
}
```

`RestServerService.discover(A)` iterates the `static readonly` fields
of the Injection class and returns the ones that are `RestService`
instances (skipping the server itself). **No filesystem access, no
dynamic imports** — every Service is already declared on `A` as part
of the canonical XF pattern; `discover` just eliminates the duplicate
registration.

### Recipe: filesystem auto-discovery via bundler glob

For projects that prefer file-based discovery and use Vite / esbuild
(both support `import.meta.glob`), the bundler resolves the glob at
build time:

```typescript
const modules = import.meta.glob<{ default: new () => RestService }>(
  './logic/service/*.ts',
  { eager: true },
)
const services = Object.values(modules).map((m) => new m.default())
```

This stays compile-time only — no `fs.readdir` at runtime, no XF
violations.

## Streaming

Both directions are first-class.

**Streaming response** (downloads, large exports, SSE):

```typescript
import { FileResponse } from '@xfcfam/xf-server'

async download(req): Promise<HttpResponse> {
  const stream = await B.docs.openStream(req.params.id)   // ReadableStream<Uint8Array>
  return FileResponse.attachment(stream, 'report.pdf', 'application/pdf')
}

async previewImage(req): Promise<HttpResponse> {
  const stream = await B.photos.openStream(req.params.id)
  return FileResponse.inline(stream, 'photo.jpg', 'image/jpeg')
}

async serverSentEvents(): Promise<HttpResponse> {
  return FileResponse.stream(eventStream, 'text/event-stream')
}
```

**Streaming request body** (uploads consumed incrementally without
buffering): use plain `RestService` (not `ObjectRestService`) and read
`req.body` as a `ReadableStream<Uint8Array>`:

```typescript
import { RestService } from '@xfcfam/xf-server'

export class AvatarsRestService extends RestService {
  override async init(): Promise<void> {
    this.handle('PUT', '/users/:id/avatar', this.upload)
  }

  private async upload(req): Promise<HttpResponse> {
    await B.userBusiness.storeAvatar(req.params.id, req.body)   // body: ReadableStream
    return { status: 204 }
  }
}
```

## Multipart uploads (opt-in)

Enable with one option — nothing else to install, no extra import:

```typescript
export class MyServerService extends RestServerService {
  constructor() {
    super({
      port: 3000,
      multipart: { maxFileSize: 10 * 1024 * 1024, maxFiles: 5 },
    })
  }
  override services() { return RestServerService.discover(A) }
}
```

When the `multipart` option is enabled, the server activates its
internal multipart handling lazily (only paid for if you opt in).
Handlers see `req.body` as `MultipartPart[]`:

```typescript
import { ObjectRestService, MultipartPart, HttpStatus } from '@xfcfam/xf-server'

export class UploadsRestService extends ObjectRestService {
  override async init(): Promise<void> {
    this.handle('POST', '/uploads', this.upload)
  }

  private async upload(req): Promise<HttpResponse> {
    const parts = req.body as MultipartPart[]
    for (const part of parts) {
      if (part.filename !== undefined) {
        await B.fileBusiness.save(part.filename, part.body, part.mimeType)
      }
    }
    return { status: HttpStatus.CREATED, body: { uploaded: parts.length } }
  }
}
```

The multipart parser lives inside xf-server; the consumer does not
install or import any extra package.

## Error handling

Throw a typed `HttpException` inside the handler; the pipeline maps it
to the right status automatically:

```typescript
if (user === null) throw new NotFoundException(`User ${id}`)
if (!isAdmin)      throw new ForbiddenException('Admin required')
```

Or override the global `onError` hook for cross-cutting policy:

```typescript
override async onError(req, error) {
  if (error instanceof MyDomainException) {
    return { status: 422, body: { code: error.code, message: error.message } }
  }
  return undefined   // delegate to the default handler (500)
}
```

## Pipeline order

Per request, top to bottom:

1. **`RestServerService.onRequest`** — global pre-processing (logging, auth).
2. **`ObjectRestService.parseRequestBody`** — auto-parse if applicable.
3. **`RestService.onRequest`** — per-service pre-processing.
4. **The matched route handler**.
5. **`RestService.onResponse`** — per-service post-processing (sees `body` in its semantic form).
6. **`RestServerService.onResponse`** — global post-processing (wrapper envelopes, default headers — sees the same semantic body).
7. **`ObjectRestService.serializeResponseBody`** — auto-serialise if applicable. Object → bytes happens **last**, after the hooks.

The hook ordering is deliberate: `onResponse` runs **before**
serialisation so envelope policies can inspect / wrap the original
payload (an object, a stream, a `Uint8Array`, …) instead of an
already-encoded `Uint8Array` of JSON bytes.

### Recipe: wrapper envelope on object responses only

A common need: wrap every object response in a formal `{ code, description, data }`
envelope, but let file downloads / streams / raw bytes pass through.
Use `ResponseUtils` to branch:

```typescript
import { RestServerService, ResponseUtils } from '@xfcfam/xf-server'

export class MyServerService extends RestServerService {
  constructor() { super({ port: 3000 }) }
  override services() { return RestServerService.discover(A) }

  override async onResponse(_req, res) {
    // File / stream / bytes / plain text — pass through verbatim.
    if (!ResponseUtils.isObject(res.body)) return res

    // Object — wrap in the project's envelope.
    return {
      ...res,
      body: { code: '0', description: 'OK', data: res.body },
    }
  }
}
```

`ResponseUtils` exposes four disjoint classifiers covering every
body shape: `isStream`, `isBinary`, `isTextual`, `isObject`. The
first three are precise type guards; `isObject` is the complement
(everything that's not stream / bytes / string / undefined).

### Recipe: cache headers only on streamed downloads

```typescript
override async onResponse(_req, res) {
  if (ResponseUtils.isStream(res.body)) {
    return {
      ...res,
      headers: { ...res.headers, 'cache-control': 'no-cache' },
    }
  }
  return res
}
```

### Recipe: selective logging by body type

```typescript
override async onResponse(req, res) {
  if (ResponseUtils.isObject(res.body)) {
    console.log(`${req.path} → ${JSON.stringify(res.body).slice(0, 200)}`)
  } else if (ResponseUtils.isBinary(res.body)) {
    console.log(`${req.path} → binary ${res.body.byteLength}B`)
  } else if (ResponseUtils.isStream(res.body)) {
    console.log(`${req.path} → stream`)
  }
  return res
}
```

A stream body has unknown size at hook time, so the log line only
records the modality — the byte count belongs to a flushing-time
observer (e.g. wrapping `body` in a counting `TransformStream`).

### Recipe: post-handler auth gate on JSON responses

Gate sensitive object responses centrally without touching every
handler — streams and binary downloads keep their own auth policy:

```typescript
override async onResponse(req, res) {
  if (!ResponseUtils.isObject(res.body)) return res
  if (req.headers.authorization !== expected) {
    return { status: 401, body: { error: 'unauthorized' } }
  }
  return res
}
```

### Recipe: strip null fields from object responses (DTO sanitisation)

```typescript
override async onResponse(_req, res) {
  if (!ResponseUtils.isObject(res.body)) return res
  return { ...res, body: stripNullFields(res.body) }
}

function stripNullFields(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripNullFields)
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value)) {
      if (v !== null) out[k] = stripNullFields(v)
    }
    return out
  }
  return value
}
```

### Recipe: force `Content-Type` on bare-string responses

If a handler returns `body: 'plain text'` and you want it served as
`text/plain; charset=utf-8` instead of letting Fastify guess:

```typescript
override async onResponse(_req, res) {
  if (!ResponseUtils.isTextual(res.body)) return res
  return {
    ...res,
    headers: {
      ...res.headers,
      'content-type': res.headers?.['content-type'] ?? 'text/plain; charset=utf-8',
    },
  }
}
```

Error chain (when step 3, 4 or 5 throws):

1. **`RestService.onError(req, err)`** — return an `HttpResponse` to translate; return `undefined` to delegate.
2. **`RestServerService.onError(req, err)`** — same contract; global handler.
3. **Default fallback**: if the error is an `HttpException`, use its
   `status` + `body`; otherwise emit `500 Internal Server Error`.

## License

MIT.
