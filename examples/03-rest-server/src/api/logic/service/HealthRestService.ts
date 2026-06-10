import {
  ObjectRestService,
  HttpStatusUtils,
  type HttpRequest,
  type HttpResponse,
} from '@xfcfam/xf-server'

/**
 * Trivial health-check service. Demonstrates that a `RestService`
 * can be tiny — three lines of route registration + a handler. The
 * server-level interceptors still apply to it (logging, CORS,
 * envelope wrapping if configured).
 */
export class HealthRestService extends ObjectRestService {
  override async init(): Promise<void> {
    this.handle('GET', '/health', this.health)
    this.handle('GET', '/ping',   this.ping)
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
