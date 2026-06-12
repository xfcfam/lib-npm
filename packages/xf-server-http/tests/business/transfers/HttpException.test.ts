import { describe, it, expect } from 'vitest'
import { ServerException } from '@xfcfam/xf-server'
import {
  HttpException,
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
  InternalServerException,
} from '../../../index'

describe('HttpException (base)', () => {
  it('carries the status, message and a default body of { message }', () => {
    const err = new HttpException(418, "I'm a teapot")
    expect(err.status).toBe(418)
    expect(err.message).toBe("I'm a teapot")
    expect(err.body).toEqual({ message: "I'm a teapot" })
    expect(err.name).toBe('HttpException')
  })

  it('uses an explicit body when provided', () => {
    const err = new HttpException(400, 'bad', { detail: 'field x missing' })
    expect(err.body).toEqual({ detail: 'field x missing' })
  })

  it('is a ServerException and an Error', () => {
    const err = new HttpException(500, 'x')
    expect(err).toBeInstanceOf(ServerException)
    expect(err).toBeInstanceOf(Error)
  })
})

describe('HttpException subclasses preset the right status and name', () => {
  const cases: Array<[new (m: string, b?: unknown) => HttpException, number, string]> = [
    [BadRequestException, 400, 'BadRequestException'],
    [UnauthorizedException, 401, 'UnauthorizedException'],
    [ForbiddenException, 403, 'ForbiddenException'],
    [NotFoundException, 404, 'NotFoundException'],
    [InternalServerException, 500, 'InternalServerException'],
  ]

  for (const [Ctor, status, name] of cases) {
    it(`${name} → status ${status}`, () => {
      const err = new Ctor('msg')
      expect(err.status).toBe(status)
      expect(err.name).toBe(name)
      expect(err.message).toBe('msg')
      expect(err.body).toEqual({ message: 'msg' })
    })

    it(`${name} sits in the HttpException → ServerException → Error chain`, () => {
      const err = new Ctor('msg')
      expect(err).toBeInstanceOf(HttpException)
      expect(err).toBeInstanceOf(ServerException)
      expect(err).toBeInstanceOf(Error)
    })

    it(`${name} forwards a custom body`, () => {
      const err = new Ctor('msg', { extra: true })
      expect(err.body).toEqual({ extra: true })
    })
  }

  it('lets the pipeline branch on status via instanceof HttpException', () => {
    const err: unknown = new NotFoundException('nope')
    if (err instanceof HttpException) {
      expect(err.status).toBe(404)
    } else {
      throw new Error('should have been an HttpException')
    }
  })
})
