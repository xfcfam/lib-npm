import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GraphQLRepository, GraphQLException } from '../../../index'

const { state } = vi.hoisted(() => ({ state: { path: '' as string, opts: undefined as any, response: undefined as any } }))
vi.mock('ky', () => {
  const HTTPError = class extends Error { response: Response; data: unknown; constructor(r: Response, d?: unknown) { super('http'); this.response = r; this.data = d } }
  const TimeoutError = class extends Error {}
  return { default: { create: () => async (path: string, opts?: any) => { state.path = path; state.opts = opts; return state.response } }, HTTPError, TimeoutError }
})

class Api extends GraphQLRepository { constructor() { super('https://api.example.com') } }

describe('GraphQLRepository', () => {
  let api: Api
  beforeEach(async () => { state.response = undefined; api = new Api(); await api.init() })

  it('POSTs the operation to /graphql as JSON and returns data', async () => {
    state.response = new Response(JSON.stringify({ data: { user: { name: 'Ada' } } }), { status: 200, headers: { 'content-type': 'application/json' } })
    const data = await api.query<{ user: { name: string } }>(`query($id:ID!){user(id:$id){name}}`, { id: '1' })
    expect(data).toEqual({ user: { name: 'Ada' } })
    expect(state.path).toBe('graphql')
    expect(state.opts.method).toBe('POST')
    expect(state.opts.json).toEqual({ query: `query($id:ID!){user(id:$id){name}}`, variables: { id: '1' } })
  })

  it('throws GraphQLException when the response carries errors', async () => {
    state.response = new Response(JSON.stringify({ errors: [{ message: 'Not found' }] }), { status: 200, headers: { 'content-type': 'application/json' } })
    const err = await api.query('query{ x }').catch((e: unknown) => e)
    expect(err).toBeInstanceOf(GraphQLException)
    expect((err as GraphQLException).errors[0]!.message).toBe('Not found')
  })
})
