import { describe, it, expect } from 'vitest'
import { HttpStatusUtils } from '../../../index'

describe('HttpStatusUtils — canonical status constants', () => {
  it('exposes the common 2xx codes', () => {
    expect(HttpStatusUtils.OK).toBe(200)
    expect(HttpStatusUtils.CREATED).toBe(201)
    expect(HttpStatusUtils.ACCEPTED).toBe(202)
    expect(HttpStatusUtils.NO_CONTENT).toBe(204)
  })

  it('exposes the 3xx codes it tracks', () => {
    expect(HttpStatusUtils.MOVED_PERMANENTLY).toBe(301)
    expect(HttpStatusUtils.FOUND).toBe(302)
    expect(HttpStatusUtils.NOT_MODIFIED).toBe(304)
  })

  it('exposes the common 4xx codes', () => {
    expect(HttpStatusUtils.BAD_REQUEST).toBe(400)
    expect(HttpStatusUtils.UNAUTHORIZED).toBe(401)
    expect(HttpStatusUtils.FORBIDDEN).toBe(403)
    expect(HttpStatusUtils.NOT_FOUND).toBe(404)
    expect(HttpStatusUtils.METHOD_NOT_ALLOWED).toBe(405)
    expect(HttpStatusUtils.CONFLICT).toBe(409)
    expect(HttpStatusUtils.GONE).toBe(410)
    expect(HttpStatusUtils.UNSUPPORTED_MEDIA_TYPE).toBe(415)
    expect(HttpStatusUtils.UNPROCESSABLE_ENTITY).toBe(422)
    expect(HttpStatusUtils.TOO_MANY_REQUESTS).toBe(429)
  })

  it('exposes the common 5xx codes', () => {
    expect(HttpStatusUtils.INTERNAL_SERVER_ERROR).toBe(500)
    expect(HttpStatusUtils.NOT_IMPLEMENTED).toBe(501)
    expect(HttpStatusUtils.BAD_GATEWAY).toBe(502)
    expect(HttpStatusUtils.SERVICE_UNAVAILABLE).toBe(503)
    expect(HttpStatusUtils.GATEWAY_TIMEOUT).toBe(504)
  })
})
