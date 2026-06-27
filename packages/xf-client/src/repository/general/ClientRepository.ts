import { Repository } from '@xfcfam/xf'

/**
 * Access-Layer Generalization for the artefact-level **outbound client**
 * — the transport-agnostic contract shared by every `@xfcfam/xf-client-*`
 * package, and the symmetric counterpart of `@xfcfam/xf-server`'s
 * `ServerBusiness`.
 *
 * Where `ServerBusiness` owns the *inbound* pipeline
 * (`onRequest → handler → onResponse`, `onError` in the catch),
 * `ClientRepository` owns the *outbound* pipeline:
 *
 *   `onRequest → send → onResponse`, with `onError` in the catch.
 *
 * What it deliberately does **not** know is the transport: dispatching
 * one request over the wire ({@link send}) and the request/response
 * shapes (`TReq` / `TRes`) are left abstract. Each protocol package
 * provides them — HTTP via `ky` in `@xfcfam/xf-client-http`, gRPC via
 * `@grpc/grpc-js`, raw sockets via `node:net` / `node:dgram` — and
 * exposes ergonomic helpers (`get`, `post`, `unary`, …) on top of the
 * shared {@link call}.
 *
 * It lives in the **Access Layer** because making outbound calls is
 * communication with an external system, not domain logic. Concrete
 * subclasses are declared on `R` (e.g. `R.users`); Business components
 * call them through the layer injection.
 *
 * Lifecycle (`init` / `terminate`) is inherited from {@link Repository};
 * protocol packages open/close their client there.
 *
 * @typeParam TReq  Protocol-specific request type (e.g. xf-client-http's `Request`).
 * @typeParam TRes  Protocol-specific response type (e.g. xf-client-http's `HttpResponse`).
 */
export abstract class ClientRepository<TReq, TRes> extends Repository<null> {
  constructor() {
    super(null)
  }

  /** Open the transport client. No-op by default; protocol packages override. */
  async init(): Promise<void> {}

  /** Release the transport client. No-op by default; protocol packages override. */
  async terminate(): Promise<void> {}

  /**
   * Dispatch a single request over the transport and return the
   * response. Implemented by the protocol package; never called
   * directly by consumers — {@link call} wraps it in the pipeline.
   */
  protected abstract send(request: TReq): Promise<TRes>

  /**
   * Run one outbound request through the global pipeline:
   * `onRequest → send → onResponse`, with `onError` in the catch.
   * Returns the response, or whatever `onError` resolves to; if
   * `onError` returns `undefined` the original error is rethrown.
   */
  async call(request: TReq): Promise<TRes> {
    const req = await this.onRequest(request)
    try {
      const res = await this.send(req)
      return await this.onResponse(req, res)
    } catch (err) {
      const resolved = await this.onError(req, err)
      if (resolved !== undefined) return resolved
      throw err
    }
  }

  // ─── Overridable global hooks (mirror ServerBusiness) ──────

  /** Before dispatch. Return value replaces the request (auth headers, signing, …). */
  async onRequest(request: TReq): Promise<TReq> {
    return request
  }

  /** After a successful dispatch. Return value replaces the response. */
  async onResponse(_request: TReq, response: TRes): Promise<TRes> {
    return response
  }

  /** When `send` (or a hook) throws. Return a `TRes` to recover, or `undefined` to rethrow. */
  async onError(_request: TReq, _error: unknown): Promise<TRes | undefined> {
    return undefined
  }
}
