import { Business } from '@xfcfam/xf'
import type { Handler } from '../transfers/Handler.js'
import type { Route } from '../transfers/Route.js'

/**
 * Minimal state every {@link ServerBusiness} carries: the list of
 * routes pushed before the transport starts. Protocol packages extend
 * this with their own fields (transport handle, options, …).
 *
 * @typeParam TAddr  Protocol-specific address type.
 * @typeParam TReq   Protocol-specific request type.
 * @typeParam TRes   Protocol-specific response type.
 */
export interface ServerState<TAddr, TReq, TRes> {
  /** Routes registered via the push API before `listen()` is called. */
  readonly routes: Array<Route<TAddr, TReq, TRes>>
}

/**
 * Business-Layer Generalization for the artefact-level inbound server
 * orchestrator — the **transport-agnostic contract** shared by every
 * `@xfcfam/xf-server-*` package.
 *
 * `ServerBusiness` owns two things that are common to *any* inbound
 * transport, independent of protocol:
 *
 *  1. **The route registry** — handlers are pushed (`register`) before
 *     the transport starts, and mounted at `listen()` time.
 *  2. **The request pipeline** — `onRequest → handler → onResponse`
 *     with `onError` in the catch, applied uniformly by `dispatch`.
 *
 * What it deliberately does **not** know is the transport: opening the
 * socket (`listen`), shutting it down (`close`), the address scheme
 * (`TAddr`), and the request/response wire shapes (`TReq` / `TRes`) are
 * all left abstract. Each protocol package provides them — HTTP via
 * Fastify in `@xfcfam/xf-server-http`, gRPC via `@grpc/grpc-js`, and so
 * on — and exposes ergonomic registration helpers (`get`, `post`,
 * `service`, …) on top of the protected {@link register}.
 *
 * It lives in the **Business Layer** because running a server is
 * infrastructure (transport lifecycle + registry), not domain logic and
 * not a protocol detail of any single Interaction component. Concrete
 * subclasses are declared on `B` (e.g. `B.server`); Interaction services
 * push their routes to it from their own `init()`.
 *
 * @typeParam TAddr   Protocol-specific address (HTTP `{method,path}`, …).
 * @typeParam TReq    Protocol-specific request type.
 * @typeParam TRes    Protocol-specific response type.
 * @typeParam TState  Concrete state shape; defaults to {@link ServerState}.
 */
export abstract class ServerBusiness<
  TAddr,
  TReq,
  TRes,
  TState extends ServerState<TAddr, TReq, TRes> = ServerState<TAddr, TReq, TRes>,
> extends Business<TState> {
  // ─── Route registration (push) ────────────────────────────

  /**
   * Record a handler under an address. Protocol packages wrap this in
   * transport-shaped helpers (HTTP `get(path, h)` builds the
   * `{ method:'GET', path }` address; gRPC `service(name, impl)` builds
   * a `{ service, method }` address per method). Pushing after
   * `listen()` is undefined behaviour — most transports freeze their
   * routing table once listening, so call it during `init()`.
   */
  protected register(address: TAddr, handler: Handler<TReq, TRes>): void {
    const route: Route<TAddr, TReq, TRes> = { address, handler }
    this.state.routes.push(route)
    void this.onRegister(route)
  }

  /** The routes pushed so far. Read-only view for the transport to mount. */
  protected get routes(): ReadonlyArray<Route<TAddr, TReq, TRes>> {
    return this.state.routes
  }

  // ─── Lifecycle ────────────────────────────────────────────

  /**
   * Business init — a **no-op by contract**. The server does NOT start
   * listening here: routes are registered during the Interaction
   * layer's `init()`, which runs after this. The start-point opens the
   * transport explicitly via {@link listen} once every route is in.
   */
  override async init(): Promise<void> {}

  /**
   * Open the transport and begin accepting inbound messages. Mounts
   * every route pushed so far. Called by the start-point AFTER the
   * Interaction layer has registered all routes.
   */
  abstract listen(): Promise<void>

  /** Stop accepting messages and release the transport, draining in-flight work. */
  abstract close(): Promise<void>

  /** Terminate the component. Delegates to {@link close}. */
  override async terminate(): Promise<void> {
    await this.close()
  }

  // ─── Pipeline (called by the transport per inbound message) ─

  /**
   * Run one inbound message through the global pipeline:
   * `onRequest → handler → onResponse`, with `onError` (then
   * `errorToResponse`) in the catch. The transport implementation calls
   * this from its per-message adapter and writes the returned `TRes`
   * back to the wire.
   *
   * @param request          The decoded inbound request.
   * @param handler          The matched route handler.
   * @param errorToResponse  Protocol mapping of an unhandled error to a
   *                         response (HTTP 500, gRPC `INTERNAL`, …).
   */
  protected async dispatch(
    request: TReq,
    handler: Handler<TReq, TRes>,
    errorToResponse: (error: unknown) => TRes,
  ): Promise<TRes> {
    let req: TReq
    try {
      req = await this.onRequest(request)
    } catch (err) {
      return (await this.onError(request, err)) ?? errorToResponse(err)
    }
    try {
      const res = await handler(req)
      return await this.onResponse(req, res)
    } catch (err) {
      return (await this.onError(req, err)) ?? errorToResponse(err)
    }
  }

  // ─── Overridable global hooks ──────────────────────────────

  /** Before the matched handler runs. Return value replaces the request. */
  async onRequest(request: TReq): Promise<TReq> {
    return request
  }

  /** After the handler returns. Return value replaces the response. */
  async onResponse(_request: TReq, response: TRes): Promise<TRes> {
    return response
  }

  /** When the handler (or a hook) throws. Return a `TRes` to translate, or `undefined` to delegate. */
  async onError(_request: TReq, _error: unknown): Promise<TRes | undefined> {
    return undefined
  }

  /** When a route is pushed via {@link register}. */
  async onRegister(_route: Route<TAddr, TReq, TRes>): Promise<void> {}

  /** After the transport is listening (after `listen()` resolves). */
  async onStarted(): Promise<void> {}

  /** After the transport has been closed. */
  async onStopped(): Promise<void> {}
}
