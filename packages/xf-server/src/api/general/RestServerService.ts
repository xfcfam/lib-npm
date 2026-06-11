import { View, NotInitializedException } from '@xfcfam/xf'
import fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from 'fastify'
import type { Readable } from 'node:stream'
import { RestService } from './RestService.js'
import { ObjectRestService } from './ObjectRestService.js'
import type { HttpRequest } from '../transfers/HttpRequest.js'
import type { HttpResponse } from '../transfers/HttpResponse.js'
import type { HttpMethod } from '../transfers/HttpMethod.js'
import type { MultipartPart } from '../transfers/MultipartPart.js'
import { HttpException } from '../transfers/HttpException.js'

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
 * Configuration accepted by {@link RestServerService}'s constructor.
 */
export interface RestServerOptions {
  /** TCP port to bind. */
  readonly port: number
  /** Host to bind. Default `'0.0.0.0'`. */
  readonly host?: string
  /**
   * Opt-in `multipart/form-data` support. Pass `true` for defaults or
   * a config object to tune limits.
   *
   * When enabled, the server activates multipart handling at `init()`
   * time and, for any request whose `Content-Type` is
   * `multipart/form-data`, populates `req.body` with a
   * `MultipartPart[]`. All underlying machinery is shipped as part
   * of xf-server — the consumer does not install or import any
   * extra package.
   */
  readonly multipart?: boolean | MultipartConfig
}

interface ServerState {
  readonly options: RestServerOptions
  /** The running Fastify instance; `undefined` before `init()` and after `terminate()`. */
  fastify: FastifyInstance | undefined
}

/**
 * Generalization for the artefact-level HTTP server orchestrator.
 *
 * Concrete subclasses declare the {@link RestService}s they expose by
 * implementing the abstract `services()` method. On `init()` the
 * server starts Fastify, mounts every registered route, and begins
 * listening. On `terminate()` it closes Fastify gracefully so
 * in-flight requests complete.
 *
 * **Pipeline per request** (executed by the server, top-down):
 *
 *   1. global `onRequest(req)` — cross-cutting policy (logging, auth)
 *   2. for `ObjectRestService`: request body parsing (bytes → object)
 *   3. service `onRequest(req)`  — per-Service policy
 *   4. the matched route handler
 *   5. service `onResponse(req, res)` — per-Service envelope (sees the body in its semantic form)
 *   6. global `onResponse(req, res)` — cross-cutting envelope (sees the body in its semantic form)
 *   7. for `ObjectRestService`: response body serialisation (object → bytes)
 *
 * `onResponse` hooks fire **before** serialisation, so wrapper /
 * envelope policies see the original payload (object, stream, bytes)
 * and can decide what to do with it. Use `ResponseUtils.isObject(body)`
 * / `isStream` / `isBinary` / `isTextual` to branch.
 *
 * On error: service `onError` then global `onError`. Either may
 * return an `HttpResponse` to translate the failure; otherwise the
 * server emits a generic `500` (or the corresponding status when an
 * `HttpException` was thrown).
 *
 * @example
 * ```ts
 * import { RestServerService } from '@xfcfam/xf-server'
 * import { A } from './A.js'
 *
 * export class MyServerService extends RestServerService {
 *   constructor() { super({ port: 3000 }) }
 *
 *   override services() {
 *     return [A.usersService, A.ordersService]
 *   }
 *
 *   override async onRequest(req) {
 *     console.log(`${req.method} ${req.path}`)
 *     return req
 *   }
 * }
 *
 * // In A.ts:
 * export class A {
 *   private constructor() {}
 *   static readonly usersService = new UsersRestService()
 *   static readonly ordersService = new OrdersRestService()
 *   static readonly server = new MyServerService()
 *   static async init() {
 *     await A.usersService.init()
 *     await A.ordersService.init()
 *     await A.server.init()
 *   }
 *   static async terminate() {
 *     await A.server.terminate()
 *     await A.ordersService.terminate()
 *     await A.usersService.terminate()
 *   }
 * }
 * ```
 */
export abstract class RestServerService extends View<ServerState> {
  constructor(options: RestServerOptions) {
    super({ options, fastify: undefined })
  }

  /**
   * Implement to declare the Services whose routes are mounted on
   * this server. Typically returns references from the consumer's
   * `A` injection: `[A.usersService, A.ordersService]`.
   */
  abstract services(): readonly RestService[]

  override async init(): Promise<void> {
    const instance = fastify({ logger: false })
    this.state.fastify = instance

    // Optional multipart support — registered before route mounting
    // so the iterator hook is available to handlers.
    if (this.state.options.multipart !== undefined && this.state.options.multipart !== false) {
      await RestServerService.registerMultipart(instance, this.state.options.multipart)
    }

    for (const service of this.services()) {
      for (const route of service.routes) {
        instance.route({
          method: route.method,
          url: route.path,
          handler: this.adaptHandler(service, route.method, route.path, route.handler),
        })
      }
    }

    await instance.listen({ port: this.state.options.port, host: this.state.options.host ?? '0.0.0.0' })
    await this.onStarted()
  }

  override async terminate(): Promise<void> {
    if (this.state.fastify !== undefined) {
      await this.state.fastify.close()
      this.state.fastify = undefined
    }
    await this.onStopped()
  }

  // ─── Overridable global hooks ──────────────────────────────

  /** Invoked before service `onRequest`. Return value replaces the request. */
  async onRequest<T>(request: HttpRequest<T>): Promise<HttpRequest<T>> { return request }
  /** Invoked after service `onResponse`. Return value replaces the response. */
  async onResponse<T>(_request: HttpRequest, response: HttpResponse<T>): Promise<HttpResponse<T>> { return response }
  /** Invoked when no service `onError` handled the error. Return an `HttpResponse` to translate. */
  async onError(_request: HttpRequest, _error: unknown): Promise<HttpResponse | undefined> { return undefined }
  /** Invoked after the server is listening (after `listen()` resolves). */
  async onStarted(): Promise<void> {}
  /** Invoked after Fastify has been closed. */
  async onStopped(): Promise<void> {}

  // ─── Internals ─────────────────────────────────────────────

  private adaptHandler(
    service: RestService,
    method: HttpMethod,
    path: string,
    handler: (req: HttpRequest) => Promise<HttpResponse> | HttpResponse,
  ): (req: FastifyRequest, reply: FastifyReply) => Promise<void> {
    return async (fastifyReq, fastifyReply) => {
      let req = await RestServerService.adaptRequest(fastifyReq, method, path)
      try {
        req = await this.onRequest(req)
        // ObjectRestService runs body parsing only when the body
        // is still bytes/stream (multipart already produced a parsed
        // MultipartPart[] in adaptRequest).
        if (service instanceof ObjectRestService) {
          req = await service.parseRequestBody(req)
        }
        req = await service.onRequest(req)
        let res = await handler(req)
        // Hooks see the body in its semantic form (objects, streams,
        // bytes — whatever the handler returned). Serialisation runs
        // last so wrappers / envelope policies can transform the
        // payload before it gets JSON-encoded.
        res = await service.onResponse(req, res)
        res = await this.onResponse(req, res)
        if (service instanceof ObjectRestService) {
          res = service.serializeResponseBody(res)
        }
        await RestServerService.sendResponse(fastifyReply, res)
      } catch (err) {
        const serviceResolved = await service.onError(req, err)
        const globalResolved = serviceResolved ?? await this.onError(req, err)
        const final = globalResolved ?? RestServerService.errorToResponse(err)
        await RestServerService.sendResponse(fastifyReply, final)
      }
    }
  }

  private static async adaptRequest(fr: FastifyRequest, method: HttpMethod, path: string): Promise<HttpRequest> {
    let body: unknown = fr.body
    // If @fastify/multipart is active and this is a multipart request,
    // collect the parts into our MultipartPart[] shape so handlers
    // see a uniform body regardless of the underlying engine.
    const contentType = String(fr.headers['content-type'] ?? '').toLowerCase()
    if (contentType.startsWith('multipart/') && typeof (fr as { parts?: unknown }).parts === 'function') {
      body = await RestServerService.collectMultipart(fr as FastifyRequest & { parts: () => AsyncIterable<unknown> })
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
        const bytes = await RestServerService.collectNodeStream(p.file!)
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
    // `@fastify/multipart` is a direct dependency of xf-server (the
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
    if (RestServerService.isReadableStream(body)) {
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
    // Anything else: JSON-encode as a defensive default. Object
    // bodies should have been serialised by ObjectRestService
    // already; this branch is the safety net for plain RestService
    // handlers that return raw objects.
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

  /** Get the underlying Fastify instance. Throws if `init` hasn't run. */
  protected fastify(): FastifyInstance {
    if (this.state.fastify === undefined) {
      throw new NotInitializedException('RestServerService: init() has not been called.')
    }
    return this.state.fastify
  }

  /**
   * Introspect a canonical Injection class (`A`) and return every
   * `static readonly` field whose value is a `RestService`.
   *
   * The intended usage is from inside `services()`, removing the
   * need to keep a hand-maintained list of every service the server
   * exposes:
   *
   * ```ts
   * export class A {
   *   private constructor() {}
   *   static readonly usersService  = new UsersRestService()
   *   static readonly ordersService = new OrdersRestService()
   *   static readonly authService   = new AuthRestService()
   *   static readonly server        = new MyServerService()
   *   // ...
   * }
   *
   * export class MyServerService extends RestServerService {
   *   constructor() { super({ port: 3000 }) }
   *   override services() { return RestServerService.discover(A) }
   * }
   * ```
   *
   * Why this is XF-pure: every Service is already declared on the
   * Injection (that's the canonical pattern); `discover` only
   * eliminates the *duplicated* registration in `services()`. No
   * filesystem access, no dynamic import, no reflection beyond
   * iterating own-static fields of the supplied class. Works with
   * any bundler (tsc, esbuild, vite, …) because the discovery
   * happens at construction time on objects that already exist in
   * memory.
   *
   * The server instance itself is filtered out — `discover` never
   * mounts a `RestServerService` as a regular service.
   */
  static discover(injection: object): RestService[] {
    const out: RestService[] = []
    const seen = new WeakSet<object>()
    const visitedKeys = new Set<string>()
    // Walk the prototype chain so services declared on a parent
    // injection class are also discovered.
    let t: object | null = injection
    while (t !== null && t !== Function.prototype) {
      if (seen.has(t)) break
      seen.add(t)
      for (const key of Object.getOwnPropertyNames(t)) {
        if (visitedKeys.has(key)) continue
        visitedKeys.add(key)
        const desc = Object.getOwnPropertyDescriptor(t, key)
        // Skip getters with side effects: only data descriptors.
        if (desc === undefined || 'get' in desc) continue
        const value = desc.value
        if (value instanceof RestService && !(value instanceof RestServerService)) {
          out.push(value)
        }
      }
      t = Object.getPrototypeOf(t) as object | null
    }
    return out
  }
}

// Silence the unused-import warning on `Readable` — kept for documentation purposes.
type _StreamRef = Readable
