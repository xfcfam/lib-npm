import {
  HttpServerBusiness as BaseServerBusiness,
  ResponseUtils,
  type HttpRequest,
  type HttpResponse,
} from '@xfcfam/xf-server-http'

/**
 * Server orchestrator for the example.
 *
 * Lives in the Business Layer because it owns transport lifecycle
 * (Fastify) and the route registry — both infrastructure concerns,
 * not domain logic.
 *
 * Demonstrates:
 *
 *   - SERVER-LEVEL interceptors: `onRequest` (logging), `onResponse`
 *     (selective envelope using `ResponseUtils` to skip streams/files),
 *     `onError` (uniform error delegation), `onStarted` / `onStopped`.
 *   - Multipart enabled with a custom file-size limit.
 *
 * Routes are registered by the Interaction services from their own
 * `init()` calls via `B.server.get(path, handler)` — the push model.
 */
export class ServerBusiness extends BaseServerBusiness {
  constructor() {
    const port = Number.parseInt(process.env['PORT'] ?? '3000', 10)
    super({
      port,
      host: '0.0.0.0',
      multipart: { maxFileSize: 10 * 1024 * 1024, maxFiles: 5 },
    })
  }

  // ── global interceptors ──────────────────────────────────

  override async onRequest(request: HttpRequest): Promise<HttpRequest> {
    console.log(`[server] → ${request.method} ${request.path}`)
    return request
  }

  override async onResponse(_request: HttpRequest, response: HttpResponse): Promise<HttpResponse> {
    // Apply a uniform envelope ONLY on object responses; streams,
    // file downloads, raw bytes and plain text pass through unchanged.
    if (!ResponseUtils.isObject(response.body)) return response
    return {
      ...response,
      body: { code: '0', description: 'OK', data: response.body },
    }
  }

  override async onError(_request: HttpRequest, _error: unknown): Promise<HttpResponse | undefined> {
    // Delegate to the default handler — HttpException subclasses are
    // mapped to their proper status automatically. Override this when
    // a global error envelope is needed.
    return undefined
  }

  override async onStarted(): Promise<void> {
    const port = process.env['PORT'] ?? '3000'
    console.log(`[server] ▸ listening on http://localhost:${port}`)
    console.log('[server] ▸ try:')
    console.log(`         curl http://localhost:${port}/health`)
    console.log(`         curl http://localhost:${port}/users`)
    console.log(`         curl -F "file=@README.md" http://localhost:${port}/files`)
    console.log(`         curl -OJ http://localhost:${port}/files/sample/download`)
    console.log(`         curl -N http://localhost:${port}/clock                      # SSE`)
    console.log(`         curl -X POST http://localhost:${port}/graphql \\`)
    console.log(`              -H 'content-type: application/json' \\`)
    console.log(`              -d '{"query":"{ users { id name } }"}'              # GraphQL`)
    console.log(`         websocat ws://localhost:${port}/chat                       # WebSocket`)
  }

  override async onStopped(): Promise<void> {
    console.log('[server] ▸ stopped')
  }
}
