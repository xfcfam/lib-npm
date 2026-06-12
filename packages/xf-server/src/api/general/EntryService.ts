import { StatelessService } from '@xfcfam/xf'
import type { Handler } from '../../business/transfers/Handler.js'

/**
 * Interaction-Layer Generalization for an inbound entry-point service —
 * the **transport-agnostic** base every `@xfcfam/xf-server-*` service
 * extends (`RestService`, a future `GrpcService`, …).
 *
 * An entry-point service is the Interaction component that turns an
 * external request into Business calls and shapes the response. It owns
 * no transport; it registers its handlers on the Business-layer server
 * (`B.server`) from its own `init()`.
 *
 * The one piece of shared behaviour is {@link wrap}: it opts a handler
 * into the **per-service pipeline** (`onRequest → handler → onResponse`,
 * with `onError` in the catch), scoped to this service and independent
 * of the global pipeline run by the server. Protocol packages add their
 * own ergonomics on top (HTTP's `object()` for parse/serialise, response
 * builders, …).
 *
 * @typeParam TReq  Protocol-specific request type (e.g. `HttpRequest`).
 * @typeParam TRes  Protocol-specific response type (e.g. `HttpResponse`).
 */
export abstract class EntryService<TReq, TRes> extends StatelessService {
  override async init(): Promise<void> {
    // Subclasses override and push their handlers to B.server inside.
  }

  override async terminate(): Promise<void> {}

  /**
   * Wrap a handler in the per-service pipeline:
   * `onRequest → handler → onResponse`, with `onError` in the catch.
   *
   * The returned handler is bound to `this`, so it is safe to pass
   * directly to a server registration call
   * (`B.server.get(addr, this.wrap(this.myHandler))`). Service-level
   * interceptors apply only to handlers registered through `wrap`.
   */
  protected wrap(handler: Handler<TReq, TRes>): Handler<TReq, TRes> {
    const bound = handler.bind(this) as Handler<TReq, TRes>
    return async (request: TReq): Promise<TRes> => {
      const req = await this.onRequest(request)
      try {
        const res = await bound(req)
        return await this.onResponse(req, res)
      } catch (err) {
        const resolved = await this.onError(req, err)
        if (resolved !== undefined) return resolved
        throw err
      }
    }
  }

  // ─── Pipeline hooks (overridable, scoped to this service) ──

  /** Before the matched handler runs. Return value replaces the request. */
  async onRequest(request: TReq): Promise<TReq> {
    return request
  }

  /** After the handler returns. Return value replaces the response. */
  async onResponse(_request: TReq, response: TRes): Promise<TRes> {
    return response
  }

  /** When the handler (or a hook) throws. Return a `TRes` to translate, or `undefined` to delegate to the server. */
  async onError(_request: TReq, _error: unknown): Promise<TRes | undefined> {
    return undefined
  }
}
