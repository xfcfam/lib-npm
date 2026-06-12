import { RestService, SseUtils, type HttpRequest, type HttpResponse, type ServerSentEvent } from '@xfcfam/xf-server-http'
import { B } from '../../../business/B.js'

/**
 * Server-Sent Events entry point using the `SseUtils` helper. SSE is
 * plain HTTP (a long-lived GET whose body is a `text/event-stream`),
 * so it is just a `RestService` route — no plugin, no extra dependency.
 *
 * Try it: `curl -N http://localhost:3000/clock` — one `tick` event per
 * second for five seconds.
 */
export class ClockSseService extends RestService {
  override async init(): Promise<void> {
    B.server.get('/clock', this.wrap(this.clock))
  }

  private async clock(_req: HttpRequest): Promise<HttpResponse> {
    async function* ticks(): AsyncGenerator<ServerSentEvent> {
      for (let n = 0; n < 5; n++) {
        yield { event: 'tick', id: String(n), data: { n, at: new Date().toISOString() } }
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
    }
    return SseUtils.stream(ticks())
  }
}
