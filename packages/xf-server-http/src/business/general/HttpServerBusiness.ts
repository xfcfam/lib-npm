import { NotInitializedException } from '@xfcfam/xf'
import { ServerBusiness, type ServerState } from '@xfcfam/xf-server'
import fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from 'fastify'
import type { HttpRequest } from '../transfers/HttpRequest.js'
import type { HttpResponse } from '../transfers/HttpResponse.js'
import type { HttpMethod } from '../transfers/HttpMethod.js'
import type { HttpAddress, HttpHandler } from '../transfers/Route.js'
import type { MultipartPart } from '../transfers/MultipartPart.js'
import type { WebSocketConnection, WebSocketHandler } from '../transfers/WebSocketConnection.js'
import type { GraphQLConfig } from '../transfers/GraphQLConfig.js'
import { HttpException } from '../transfers/HttpException.js'

/** Internal record of a WebSocket endpoint pushed before `listen()`. */
interface WsRoute {
  readonly path: string
  readonly handler: WebSocketHandler
}

/**
 * Multipart upload configuration. Forwarded verbatim to
 * `@fastify/multipart` (consult its docs for the full list). The most
 * common knobs:
 *
 * - `maxFileSize`: per-file size limit in bytes (Fastify default 1 MiB).
 * - `maxFiles`: maximum number of file parts per request.
 * - `maxFields`: maximum number of non-file fields.
 * - `maxFieldsSize`: total size limit for non-file fields.
 */
export interface MultipartConfig {
  readonly maxFileSize?: number
  readonly maxFiles?: number
  readonly maxFields?: number
  readonly maxFieldsSize?: number
}

/**
 * Configuration accepted by {@link HttpServerBusiness}'s constructor.
 */
export interface ServerOptions {
  /** TCP port to bind. */
  readonly port: number
  /** Host to bind. Default `'0.0.0.0'`. */
  readonly host?: string
  /**
   * Opt-in `multipart/form-data` support. Pass `true` for defaults or
   * a config object to tune limits.
   *
   * When enabled, the server activates multipart handling at `listen()`
   * time and, for any request whose `Content-Type` is
   * `multipart/form-data`, populates `req.body` with a
   * `MultipartPart[]`. All underlying machinery is shipped as part
   * of xf-server-http — the consumer does not install or import any
   * extra package.
   */
  readonly multipart?: boolean | MultipartConfig
}

/**
 * Concrete server state: the abstract route registry plus the Fastify
 * instance and the bind options.
 */
interface HttpServerState extends ServerState<HttpAddress, HttpRequest, HttpResponse> {
  readonly options: ServerOptions
  /** The running Fastify instance; `undefined` before `listen()` and after `close()`. */
  fastify: FastifyInstance | undefined
  /** WebSocket endpoints pushed via `ws()` before `listen()`. */
  readonly wsRoutes: WsRoute[]
  /** GraphQL endpoint pushed via `graphql()`, if any. */
  graphql: GraphQLConfig | undefined
}

/**
 * Business-Layer Generalization for the artefact-level HTTP server
 * orchestrator — the Fastify implementation of the transport-agnostic
 * {@link ServerBusiness} contract from `@xfcfam/xf-server`.
 *
 * It is **technology-aware** (Fastify, HTTP) by design: the Business
 * Layer in XF is the correct home for infrastructure concerns that are
 * not domain rules — the HTTP server is infrastructure, not domain
 * logic. The route registry and the request pipeline come from the
 * core; this class supplies the HTTP address scheme (`{ method, path }`),
 * the Fastify lifecycle (`listen` / `close`), body collection
 * (including multipart) and the error → HTTP-status mapping.
 *
 * **Registration model — push, not pull.** Interaction Services register
 * their routes by calling `B.server.get(path, handler)` (or `post`,
 * `put`, `patch`, `del`, `call`) from within their own `init()`. The
 * server MUST be created and available on `B` before `A.init()` runs;
 * `listen()` is called by the start-point AFTER all services have
 * registered.
 *
 * **Handler contract.** Handlers are `HttpHandler` functions
 * (`(req: HttpRequest) => Promise<HttpResponse> | HttpResponse`). The
 * server calls them with an `HttpRequest` whose `body` is the raw
 * bytes/stream (or a `MultipartPart[]` for multipart requests).
 * Serialisation (object → bytes) and parsing (bytes → object) are the
 * Interaction Layer's responsibility — see `ObjectRestService.object()`.
 *
 * @example
 * ```ts
 * // business/logic/AppServerBusiness.ts
 * import { HttpServerBusiness, type HttpRequest } from '@xfcfam/xf-server-http'
 *
 * export class AppServerBusiness extends HttpServerBusiness {
 *   constructor() {
 *     super({ port: Number.parseInt(process.env['PORT'] ?? '3000', 10) })
 *   }
 *
 *   override async onRequest(req: HttpRequest): Promise<HttpRequest> {
 *     console.log(`[server] → ${req.method} ${req.path}`)
 *     return req
 *   }
 * }
 *
 * // business/B.ts
 * export class B {
 *   private constructor() {}
 *   static readonly server = new AppServerBusiness()
 *   static async init()      { await B.server.init() }
 *   static async terminate() { await B.server.terminate() }
 * }
 *
 * // main.ts (start-point): once the XF element has bootstrapped the
 * // layers R → B → A and the services have pushed their routes, start
 * // the transport explicitly:
 * await B.server.listen()    // start Fastify after all routes are in
 * // ...and on shutdown, before the XF element tears the layers down:
 * await B.server.close()
 * ```
 */
export abstract class HttpServerBusiness extends ServerBusiness<HttpAddress, HttpRequest, HttpResponse, HttpServerState> {
  constructor(options: ServerOptions) {
    super({ options, fastify: undefined, routes: [], wsRoutes: [], graphql: undefined })
  }

  // ─── Route registration (push) ────────────────────────────

  /** Register a GET endpoint. */
  get(path: string, handler: HttpHandler): void {
    this.call('GET', path, handler)
  }

  /** Register a POST endpoint. */
  post(path: string, handler: HttpHandler): void {
    this.call('POST', path, handler)
  }

  /** Register a PUT endpoint. */
  put(path: string, handler: HttpHandler): void {
    this.call('PUT', path, handler)
  }

  /** Register a PATCH endpoint. */
  patch(path: string, handler: HttpHandler): void {
    this.call('PATCH', path, handler)
  }

  /** Register a DELETE endpoint. */
  del(path: string, handler: HttpHandler): void {
    this.call('DELETE', path, handler)
  }

  /**
   * Register an endpoint for an arbitrary HTTP method. Used for
   * `HEAD`, `OPTIONS`, or any verb not covered by the convenience
   * helpers.
   */
  call(method: HttpMethod, path: string, handler: HttpHandler): void {
    this.register({ method, path }, handler)
  }

  /**
   * Register a WebSocket endpoint. The handler receives a
   * {@link WebSocketConnection} once the client upgrade completes. The
   * WebSocket plugin runs on the same Fastify instance and port as the
   * REST routes; like every registration, call this before `listen()`.
   */
  ws(path: string, handler: WebSocketHandler): void {
    this.state.wsRoutes.push({ path, handler })
  }

  /**
   * Register a GraphQL endpoint (schema + resolvers). The GraphQL
   * engine (Mercurius) is mounted on the shared Fastify instance at
   * `config.path` (default `/graphql`). At most one GraphQL endpoint per
   * server; a later call replaces the earlier config.
   */
  graphql(config: GraphQLConfig): void {
    this.state.graphql = config
  }

  // ─── Lifecycle ────────────────────────────────────────────

  /**
   * Start accepting requests. Creates the Fastify instance, registers
   * multipart support if configured, mounts every route that has been
   * pushed so far, and begins listening.
   *
   * Call this from the start-point AFTER the Interaction layer has
   * registered all routes — no new routes should be pushed after this
   * point.
   */
  override async listen(): Promise<void> {
    const instance = fastify({ logger: false })
    this.state.fastify = instance

    if (this.state.options.multipart !== undefined && this.state.options.multipart !== false) {
      await HttpServerBusiness.registerMultipart(instance, this.state.options.multipart)
    }

    // WebSocket plugin must be registered before its routes are defined.
    if (this.state.wsRoutes.length > 0) {
      await HttpServerBusiness.registerWebSocket(instance, this.state.wsRoutes)
    }

    for (const route of this.routes) {
      instance.route({
        method: route.address.method,
        url: route.address.path,
        handler: this.adapter(route.address.method, route.address.path, route.handler),
      })
    }

    if (this.state.graphql !== undefined) {
      await HttpServerBusiness.registerGraphQL(instance, this.state.graphql)
    }

    await instance.listen({
      port: this.state.options.port,
      host: this.state.options.host ?? '0.0.0.0',
    })
    await this.onStarted()
  }

  /**
   * Stop accepting requests and release the Fastify instance. Waits
   * for in-flight requests to complete before resolving.
   */
  override async close(): Promise<void> {
    if (this.state.fastify !== undefined) {
      await this.state.fastify.close()
      this.state.fastify = undefined
    }
    await this.onStopped()
  }

  // ─── Protected accessor ───────────────────────────────────

  /**
   * Get the underlying Fastify instance. Throws if `listen()` hasn't
   * run. Exposed so protocol extensions (WebSocket, GraphQL) can
   * register their plugins on the same instance.
   */
  protected fastifyInstance(): FastifyInstance {
    if (this.state.fastify === undefined) {
      throw new NotInitializedException('HttpServerBusiness: listen() has not been called.')
    }
    return this.state.fastify
  }

  // ─── Internals ─────────────────────────────────────────────

  private adapter(
    method: HttpMethod,
    path: string,
    handler: HttpHandler,
  ): (req: FastifyRequest, reply: FastifyReply) => Promise<void> {
    return async (fastifyReq, fastifyReply) => {
      const req = await HttpServerBusiness.request(fastifyReq, method, path)
      const res = await this.dispatch(req, handler, HttpServerBusiness.errorToResponse)
      await HttpServerBusiness.sendResponse(fastifyReply, res)
    }
  }

  private static async request(fr: FastifyRequest, method: HttpMethod, path: string): Promise<HttpRequest> {
    let body: unknown = fr.body
    // If @fastify/multipart is active and this is a multipart request,
    // collect the parts into our MultipartPart[] shape so handlers
    // see a uniform body regardless of the underlying engine.
    const contentType = String(fr.headers['content-type'] ?? '').toLowerCase()
    if (contentType.startsWith('multipart/') && typeof (fr as { parts?: unknown }).parts === 'function') {
      body = await HttpServerBusiness.collectMultipart(fr as FastifyRequest & { parts: () => AsyncIterable<unknown> })
    }
    return {
      method,
      path,
      params: fr.params as Readonly<Record<string, string>>,
      query: fr.query as Readonly<Record<string, string | readonly string[]>>,
      headers: fr.headers as Readonly<Record<string, string | readonly string[]>>,
      body,
    }
  }

  private static async collectMultipart(
    fr: FastifyRequest & { parts: () => AsyncIterable<unknown> },
  ): Promise<MultipartPart[]> {
    const out: MultipartPart[] = []
    for await (const raw of fr.parts()) {
      const p = raw as {
        type: 'file' | 'field'
        fieldname: string
        filename?: string
        mimetype?: string
        file?: NodeJS.ReadableStream
        value?: unknown
      }
      if (p.type === 'file') {
        const bytes = await HttpServerBusiness.collectNodeStream(p.file!)
        const part: MultipartPart = {
          field: p.fieldname,
          mimeType: p.mimetype ?? 'application/octet-stream',
          body: bytes,
          ...(p.filename !== undefined ? { filename: p.filename } : {}),
          size: bytes.byteLength,
        }
        out.push(part)
      } else {
        const value = String(p.value ?? '')
        out.push({
          field: p.fieldname,
          mimeType: 'text/plain',
          body: new TextEncoder().encode(value),
          size: value.length,
        })
      }
    }
    return out
  }

  private static async collectNodeStream(stream: NodeJS.ReadableStream): Promise<Uint8Array> {
    const chunks: Buffer[] = []
    for await (const chunk of stream) {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : (chunk as Buffer))
    }
    const total = chunks.reduce((acc, c) => acc + c.byteLength, 0)
    const out = new Uint8Array(total)
    let offset = 0
    for (const c of chunks) { out.set(c, offset); offset += c.byteLength }
    return out
  }

  private static async registerMultipart(
    instance: FastifyInstance,
    config: true | MultipartConfig,
  ): Promise<void> {
    // `@fastify/multipart` is a direct dependency of xf-server-http (the
    // package is encapsulated end-to-end). We load it lazily — only
    // when the user opts in via `multipart: true | {...}` — to keep
    // the cold-start of multipart-free services minimal.
    const mod = await import('@fastify/multipart')
    const plugin = (mod as { default?: unknown }).default ?? mod
    const opts = config === true ? {} : {
      limits: {
        ...(config.maxFileSize !== undefined ? { fileSize: config.maxFileSize } : {}),
        ...(config.maxFiles !== undefined ? { files: config.maxFiles } : {}),
        ...(config.maxFields !== undefined ? { fields: config.maxFields } : {}),
        ...(config.maxFieldsSize !== undefined ? { fieldSize: config.maxFieldsSize } : {}),
      },
    }
    await instance.register(plugin as Parameters<FastifyInstance['register']>[0], opts)
  }

  private static async registerWebSocket(
    instance: FastifyInstance,
    routes: readonly WsRoute[],
  ): Promise<void> {
    // `@fastify/websocket` is a direct dependency of xf-server-http,
    // lazy-loaded only when WebSocket endpoints are declared. The
    // dynamic specifier is resolved at runtime; the plugin's Fastify
    // type augmentation is applied through a loose local shape.
    const spec: string = '@fastify/websocket'
    const mod = await import(spec)
    const plugin = (mod as { default?: unknown }).default ?? mod
    const app = instance as unknown as {
      register: (p: unknown) => Promise<void>
      get: (path: string, opts: unknown, handler: (socket: unknown, req: unknown) => void) => void
    }
    await app.register(plugin)
    for (const route of routes) {
      app.get(route.path, { websocket: true }, (socket, req) => {
        void route.handler(HttpServerBusiness.adaptSocket(socket, req, route.path))
      })
    }
  }

  private static adaptSocket(socket: unknown, req: unknown, path: string): WebSocketConnection {
    const s = socket as {
      send: (data: string | Uint8Array) => void
      close: (code?: number, reason?: string) => void
      on: (event: string, cb: (...args: unknown[]) => void) => void
    }
    const r = req as {
      params?: Record<string, string>
      query?: Record<string, string | string[]>
      headers?: Record<string, string | string[]>
    }
    return {
      path,
      params: (r.params ?? {}) as Readonly<Record<string, string>>,
      query: (r.query ?? {}) as Readonly<Record<string, string | readonly string[]>>,
      headers: (r.headers ?? {}) as Readonly<Record<string, string | readonly string[]>>,
      send: (data) => s.send(data),
      close: (code, reason) => s.close(code, reason),
      onMessage: (listener) => s.on('message', (data) => listener(HttpServerBusiness.toFrame(data))),
      onClose: (listener) => s.on('close', (code, reason) => listener(Number(code ?? 0), String(reason ?? ''))),
      onError: (listener) => s.on('error', (err) => listener(err instanceof Error ? err : new Error(String(err)))),
    }
  }

  private static toFrame(data: unknown): string | Uint8Array {
    if (typeof data === 'string') return data
    if (data instanceof Uint8Array) return data
    if (data instanceof ArrayBuffer) return new Uint8Array(data)
    if (Array.isArray(data)) {
      const parts = data as Uint8Array[]
      const total = parts.reduce((n, c) => n + c.byteLength, 0)
      const out = new Uint8Array(total)
      let offset = 0
      for (const c of parts) { out.set(c, offset); offset += c.byteLength }
      return out
    }
    return String(data)
  }

  private static async registerGraphQL(instance: FastifyInstance, config: GraphQLConfig): Promise<void> {
    // `mercurius` is a direct dependency of xf-server-http, lazy-loaded
    // only when a GraphQL endpoint is declared.
    const spec: string = 'mercurius'
    const mod = await import(spec)
    const plugin = (mod as { default?: unknown }).default ?? mod
    const app = instance as unknown as { register: (p: unknown, opts: unknown) => Promise<void> }
    await app.register(plugin, {
      schema: config.schema,
      resolvers: config.resolvers,
      graphiql: config.graphiql ?? false,
      path: config.path ?? '/graphql',
    })
  }

  private static async sendResponse(reply: FastifyReply, res: HttpResponse): Promise<void> {
    reply.status(res.status)
    if (res.headers !== undefined) {
      for (const [k, v] of Object.entries(res.headers)) reply.header(k, v)
    }
    const body = res.body
    if (body === null || body === undefined) {
      await reply.send()
      return
    }
    if (HttpServerBusiness.isReadableStream(body)) {
      // Web ReadableStream → Node Readable for Fastify.
      const { Readable } = await import('node:stream')
      await reply.send(Readable.fromWeb(body as unknown as import('node:stream/web').ReadableStream))
      return
    }
    if (body instanceof Uint8Array) {
      await reply.send(Buffer.from(body.buffer, body.byteOffset, body.byteLength))
      return
    }
    if (typeof body === 'string') {
      await reply.send(body)
      return
    }
    // Anything else: pass through (Fastify will JSON-encode objects).
    await reply.send(body)
  }

  private static errorToResponse(err: unknown): HttpResponse {
    if (err instanceof HttpException) {
      return { status: err.status, body: err.body }
    }
    const message = err instanceof Error ? err.message : String(err)
    return { status: 500, body: { message: 'Internal server error', detail: message } }
  }

  private static isReadableStream(value: unknown): boolean {
    return typeof value === 'object'
      && value !== null
      && typeof (value as { getReader?: unknown }).getReader === 'function'
  }
}
