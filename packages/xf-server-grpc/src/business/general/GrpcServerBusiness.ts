import { ServerBusiness, type ServerState } from '@xfcfam/xf-server'
import type { GrpcAddress, GrpcHandler, GrpcRequest, GrpcResponse } from '../transfers/GrpcMessage.js'
import { GrpcException } from '../transfers/GrpcException.js'

/** Configuration accepted by {@link GrpcServerBusiness}'s constructor. */
export interface GrpcServerOptions {
  /** TCP port to bind. */
  readonly port: number
  /** Host to bind. Default `'0.0.0.0'`. */
  readonly host?: string
}

interface GrpcServerState extends ServerState<GrpcAddress, GrpcRequest, GrpcResponse> {
  readonly options: GrpcServerOptions
  /** The running `@grpc/grpc-js` Server; `undefined` before `listen()`. */
  server: unknown
}

/**
 * Business-Layer Generalization for a **gRPC** inbound server — the
 * `@grpc/grpc-js` implementation of the transport-agnostic
 * {@link ServerBusiness} contract.
 *
 * **Status: sketch.** The lifecycle, the route registry and the request
 * pipeline are wired against the core contract and compile; the
 * protobuf service-definition binding (which requires a generated
 * `.proto` `ServiceDefinition`) is marked with a `TODO` in `listen()`.
 * It exists to validate that the core abstraction fits a second
 * request/response transport beyond HTTP — and it does: a gRPC unary
 * RPC maps cleanly onto `dispatch` (`onRequest → handler → onResponse`),
 * with the address being `{ service, method }` instead of
 * `{ method, path }`.
 *
 * Services register their RPCs from `init()` with
 * `B.server.unary(service, method, handler)`; the start-point calls
 * `listen()` / `close()`.
 */
export abstract class GrpcServerBusiness extends ServerBusiness<GrpcAddress, GrpcRequest, GrpcResponse, GrpcServerState> {
  constructor(options: GrpcServerOptions) {
    super({ options, routes: [], server: undefined })
  }

  // ─── Route registration (push) ────────────────────────────

  /** Register a unary RPC handler under `service`/`method`. */
  unary(service: string, method: string, handler: GrpcHandler): void {
    this.register({ service, method }, handler)
  }

  // ─── Lifecycle ────────────────────────────────────────────

  override async listen(): Promise<void> {
    // `@grpc/grpc-js` is a direct dependency, lazy-loaded at start.
    const spec: string = '@grpc/grpc-js'
    const grpc = await import(spec)
    const server = new grpc.Server()
    this.state.server = server

    // TODO(sketch): bind each registered route to its protobuf
    // ServiceDefinition. Production usage loads a `.proto` via
    // `@grpc/proto-loader` and calls `server.addService(def, impl)`,
    // where each `impl[method]` is `this.adapt(route.handler)`. The
    // registry (`this.routes`) and the per-RPC pipeline (`adapt`) are
    // already in place; only the codec/definition wiring is pending.

    await new Promise<void>((resolve, reject) => {
      const creds = grpc.ServerCredentials.createInsecure()
      const addr = `${this.state.options.host ?? '0.0.0.0'}:${this.state.options.port}`
      server.bindAsync(addr, creds, (err: Error | null) => (err ? reject(err) : resolve()))
    })
    await this.onStarted()
  }

  override async close(): Promise<void> {
    const server = this.state.server as { tryShutdown?: (cb: (err?: Error) => void) => void } | undefined
    if (server?.tryShutdown !== undefined) {
      await new Promise<void>((resolve) => server.tryShutdown!(() => resolve()))
      this.state.server = undefined
    }
    await this.onStopped()
  }

  // ─── Internals ─────────────────────────────────────────────

  /**
   * Adapt a registered handler into a `@grpc/grpc-js` unary callback,
   * routing the RPC through the core {@link dispatch} pipeline. Wired by
   * the (pending) service-definition binding in {@link listen}.
   */
  protected adapt(
    service: string,
    method: string,
    handler: GrpcHandler,
  ): (call: { request: unknown; metadata?: unknown }, callback: (err: unknown, value?: unknown) => void) => void {
    return (call, callback) => {
      const request: GrpcRequest = {
        service,
        method,
        message: call.request,
        metadata: (call.metadata ?? {}) as GrpcRequest['metadata'],
      }
      void this.dispatch(request, handler, GrpcServerBusiness.errorToResponse).then(
        (res) => callback(null, res.message),
        (err: unknown) => callback(err),
      )
    }
  }

  private static errorToResponse(err: unknown): GrpcResponse {
    if (err instanceof GrpcException) {
      return { message: err.body, status: err.code }
    }
    const message = err instanceof Error ? err.message : String(err)
    // 13 = INTERNAL
    return { message: { message: 'Internal error', detail: message }, status: 13 }
  }
}
