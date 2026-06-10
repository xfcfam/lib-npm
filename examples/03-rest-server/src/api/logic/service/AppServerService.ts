import {
  RestServerService,
  ResponseUtils,
  type HttpRequest,
  type HttpResponse,
  type RestService,
} from '@xfcfam/xf-server'

/**
 * Server orchestrator for the example.
 *
 * Demonstrates:
 *
 *   - RestServerService.discover(A) — zero-boilerplate registration
 *     of every RestService declared as `static readonly` on A. The
 *     `services()` override calls a lazily-resolved callback supplied
 *     by `A` itself, which avoids the circular import that would
 *     occur if this file imported A directly.
 *   - SERVER-LEVEL interceptors: onRequest (logging), onResponse
 *     (selective wrapper using ResponseUtils to skip streams/files),
 *     onError (uniform error envelope), onStarted / onStopped.
 *   - Multipart enabled with a custom file-size limit.
 */
export class AppServerService extends RestServerService {
  /**
   * Lazily-resolved provider of the Service list. Receiving it as a
   * callback (instead of an imported array) breaks the circular
   * import A → AppServerService → A.
   */
  private readonly servicesProvider: () => readonly RestService[]

  constructor(servicesProvider: () => readonly RestService[]) {
    const port = Number.parseInt(process.env.PORT ?? '3000', 10)
    super({
      port,
      host: '0.0.0.0',
      multipart: { maxFileSize: 10 * 1024 * 1024, maxFiles: 5 },
    })
    this.servicesProvider = servicesProvider
  }

  override services(): readonly RestService[] {
    return this.servicesProvider()
  }

  // ── global interceptors ──────────────────────────────────

  override async onRequest<T>(request: HttpRequest<T>): Promise<HttpRequest<T>> {
    console.log(`[server] → ${request.method} ${request.path}`)
    return request
  }

  override async onResponse<T>(_request: HttpRequest, response: HttpResponse<T>): Promise<HttpResponse<T>> {
    // Apply a uniform envelope ONLY on object responses; streams,
    // file downloads, raw bytes and plain text pass through unchanged.
    if (!ResponseUtils.isObject(response.body)) return response
    return {
      ...response,
      body: { code: '0', description: 'OK', data: response.body } as T,
    }
  }

  override async onError(_request: HttpRequest, _error: unknown): Promise<HttpResponse | undefined> {
    // Delegate to the default handler — HttpException subclasses are
    // mapped to their proper status automatically. Override this when
    // a global error envelope is needed.
    return undefined
  }

  override async onStarted(): Promise<void> {
    console.log('[server] ▸ listening on http://localhost:3000')
    console.log('[server] ▸ try:')
    console.log('         curl http://localhost:3000/health')
    console.log('         curl http://localhost:3000/users')
    console.log('         curl -F "file=@README.md" http://localhost:3000/files')
    console.log('         curl -N http://localhost:3000/files/events')
    console.log('         curl -OJ http://localhost:3000/files/sample/download')
  }

  override async onStopped(): Promise<void> {
    console.log('[server] ▸ stopped')
  }
}

// The alternative auto-discovery recipe for Vite/esbuild projects
// (using `import.meta.glob`) is documented in the example README.
