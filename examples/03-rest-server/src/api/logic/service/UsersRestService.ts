import {
  ObjectRestService,
  HttpStatusUtils,
  NotFoundException,
  BadRequestException,
  type HttpRequest,
  type HttpResponse,
} from '@xfcfam/xf-server-http'
import { B } from '../../../business/B.js'

/**
 * Demonstrates:
 *
 *   - ObjectRestService (auto-parse JSON request bodies / auto-
 *     serialise JSON response bodies via `this.object(handler)`)
 *   - CRUD endpoints with object responses
 *   - SERVICE-LEVEL interceptors: `onRequest` adds a request id,
 *     `onResponse` adds a uniform `X-Service` header, `onError`
 *     translates a domain validation failure into a 400.
 *   - Push route registration: routes are pushed to `B.server` from
 *     `init()` using `this.object(handler)`.
 */
export class UsersRestService extends ObjectRestService {
  override async init(): Promise<void> {
    B.server.get('/users',       this.object(this.list))
    B.server.get('/users/:id',   this.object(this.getOne))
    B.server.post('/users',      this.object(this.create))
    B.server.put('/users/:id',   this.object(this.update))
    B.server.del('/users/:id', this.object(this.remove))
  }

  // ── handlers ──────────────────────────────────────────────

  private async list(_req: HttpRequest): Promise<HttpResponse> {
    const users = await B.user.list()
    return { status: HttpStatusUtils.OK, body: users }
  }

  private async getOne(req: HttpRequest): Promise<HttpResponse> {
    const user = await B.user.findById(req.params['id']!)
    if (user === null) throw new NotFoundException(`User ${req.params['id']}`)
    return { status: HttpStatusUtils.OK, body: user }
  }

  private async create(req: HttpRequest): Promise<HttpResponse> {
    const dto = req.body as { name?: unknown; email?: unknown }
    if (typeof dto?.name !== 'string' || typeof dto?.email !== 'string') {
      throw new BadRequestException('name and email are required strings')
    }
    const user = await B.user.create({ name: dto.name, email: dto.email })
    return { status: HttpStatusUtils.CREATED, body: user }
  }

  private async update(req: HttpRequest): Promise<HttpResponse> {
    const dto = req.body as { name?: string; email?: string }
    const user = await B.user.update(req.params['id']!, dto)
    if (user === null) throw new NotFoundException(`User ${req.params['id']}`)
    return { status: HttpStatusUtils.OK, body: user }
  }

  private async remove(req: HttpRequest): Promise<HttpResponse> {
    const ok = await B.user.delete(req.params['id']!)
    if (!ok) throw new NotFoundException(`User ${req.params['id']}`)
    return { status: HttpStatusUtils.NO_CONTENT }
  }

  // ── service-level interceptors ───────────────────────────

  override async onRequest(request: HttpRequest): Promise<HttpRequest> {
    // Tag every request that hits this service with a request id.
    const requestId = `req-${Math.random().toString(36).slice(2, 10)}`
    console.log(`[users] → ${request.method} ${request.path}   (req-id=${requestId})`)
    return { ...request, headers: { ...request.headers, 'x-request-id': requestId } }
  }

  override async onResponse(_request: HttpRequest, response: HttpResponse): Promise<HttpResponse> {
    // Tag every response from this service so clients can identify it.
    return { ...response, headers: { ...response.headers, 'x-service': 'users' } }
  }

  override async onError(_request: HttpRequest, error: unknown): Promise<HttpResponse | undefined> {
    // Recognise a couple of domain-specific failures and translate them
    // before the global handler sees the error.
    if (error instanceof BadRequestException) return undefined  // already typed → delegate
    return undefined
  }
}
