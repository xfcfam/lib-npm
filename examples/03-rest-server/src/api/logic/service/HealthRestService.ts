import {
  ObjectRestService,
  HttpStatusUtils,
  type HttpRequest,
  type HttpResponse,
} from '@xfcfam/xf-server-http'
import { B } from '../../../business/B.js'

/**
 * Trivial health-check service. Demonstrates that a `RestService`
 * can be tiny — two lines of route registration and two handlers.
 * The server-level interceptors still apply (logging, envelope wrapping
 * if configured).
 *
 * Routes are pushed to `B.server` from `init()` using
 * `this.object(handler)` for automatic JSON serialisation.
 */
export class HealthRestService extends ObjectRestService {
  override async init(): Promise<void> {
    B.server.get('/health', this.object(this.health))
    B.server.get('/ping',   this.object(this.ping))
  }

  private async health(_req: HttpRequest): Promise<HttpResponse> {
    return {
      status: HttpStatusUtils.OK,
      body: { status: 'ok', uptime: process.uptime(), at: new Date().toISOString() },
    }
  }

  private async ping(_req: HttpRequest): Promise<HttpResponse> {
    // Plain text response — demonstrates that `body: string` is sent
    // verbatim with no JSON encoding.
    return { status: HttpStatusUtils.OK, body: 'pong\n' }
  }
}
