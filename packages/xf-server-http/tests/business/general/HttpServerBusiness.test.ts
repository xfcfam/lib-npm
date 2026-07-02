import { describe, it, expect, afterEach } from 'vitest'
import { HttpServerBusiness, type HttpRequest, type HttpResponse } from '../../../index'

class TestServer extends HttpServerBusiness {
  constructor(port: number) { super({ port }) }
}

let server: TestServer | undefined
let nextPort = 38810

afterEach(async () => {
  if (server !== undefined) { await server.close(); server = undefined }
})

describe('HttpServerBusiness · routing', () => {
  it('any() registers a handler for every HTTP method (catch-all)', async () => {
    const port = nextPort++
    server = new TestServer(port)
    server.any('/*', (req: HttpRequest): HttpResponse => ({ status: 200, body: { path: req.path, method: req.method } }))
    await server.listen()

    for (const method of ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const) {
      const res = await fetch(`http://127.0.0.1:${port}/anything/deep`, { method })
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.method).toBe(method)
    }
  })

  it('request.path is the actual resolved path, not the route pattern', async () => {
    const port = nextPort++
    server = new TestServer(port)
    server.get('/users/:id', (req: HttpRequest): HttpResponse => ({ status: 200, body: { path: req.path, params: req.params } }))
    server.get('/deep/*', (req: HttpRequest): HttpResponse => ({ status: 200, body: { path: req.path } }))
    await server.listen()

    // wildcard route → real path, not "/deep/*"
    const wild = await (await fetch(`http://127.0.0.1:${port}/deep/a/b/c?x=1`)).json()
    expect(wild.path).toBe('/deep/a/b/c')

    // param route → real path, not "/users/:id"; params still populated
    const param = await (await fetch(`http://127.0.0.1:${port}/users/42?q=1`)).json()
    expect(param.path).toBe('/users/42')
    expect(param.params.id).toBe('42')
  })
})
