import { describe, it, expect, beforeEach } from 'vitest'
import { DatabaseRepository } from '../../../index'
import {
  PostgresAdapter, PostgresQueryCompiler, PostgresIntrospector,
  type Dialect, type Driver, type DatabaseConnection, type QueryResult,
} from 'kysely'

interface Capture { sqls: string[]; params: unknown[][]; rows: any[]; total: number }

function captureDialect(cap: Capture): Dialect {
  const connection: DatabaseConnection = {
    async executeQuery(cq): Promise<QueryResult<any>> {
      cap.sqls.push(cq.sql); cap.params.push([...cq.parameters])
      if (/count\(\*\)/.test(cq.sql)) return { rows: [{ count: String(cap.total) }] as any }
      return { rows: cap.rows as any }
    },
    // eslint-disable-next-line require-yield
    async *streamQuery(): AsyncIterableIterator<QueryResult<any>> { throw new Error('no streaming') },
  }
  const driver: Driver = {
    async init() {}, async acquireConnection() { return connection },
    async beginTransaction() {}, async commitTransaction() {}, async rollbackTransaction() {},
    async releaseConnection() {}, async destroy() {},
  }
  return {
    createAdapter: () => new PostgresAdapter(),
    createDriver: () => driver,
    createIntrospector: (db) => new PostgresIntrospector(db),
    createQueryCompiler: () => new PostgresQueryCompiler(),
  }
}

class Db extends DatabaseRepository {
  constructor(public cap: Capture) { super({ dialect: captureDialect(cap) }) }
  async init() { await super.init() }
  async terminate() { await super.terminate() }
}

describe('DatabaseRepository — built-in CRUD', () => {
  let cap: Capture
  let db: Db
  beforeEach(async () => { cap = { sqls: [], params: [], rows: [], total: 0 }; db = new Db(cap); await db.init() })

  it('find: equality / IN / IS NULL filters, parameterised', async () => {
    cap.rows = [{ id: 1, name: 'a' }]
    const rows = await db.find('users', { id: 1, role: ['admin', 'user'], deleted: null })
    expect(rows).toEqual([{ id: 1, name: 'a' }])
    const s = cap.sqls[0]!
    expect(s).toContain('select * from "users"')
    expect(s).toContain('"id" = $1')
    expect(s).toContain('"role" in ($2, $3)')
    expect(s).toContain('"deleted" is null')
    expect(cap.params[0]).toEqual([1, 'admin', 'user'])
  })

  it('findById: select by id, first row', async () => {
    cap.rows = [{ id: 7 }]
    expect(await db.findById('users', 7)).toEqual({ id: 7 })
    expect(cap.sqls[0]).toContain('"id" = $1'); expect(cap.params[0]).toEqual([7])
  })

  it('insert: INSERT ... RETURNING *', async () => {
    cap.rows = [{ id: 1, name: 'x' }]
    expect(await db.insert('users', { name: 'x' })).toEqual({ id: 1, name: 'x' })
    expect(cap.sqls[0]).toMatch(/insert into "users".*returning \*/s)
  })

  it('update by id: UPDATE ... WHERE id ... RETURNING *', async () => {
    cap.rows = [{ id: 1, name: 'y' }]
    await db.update('users', 1, { name: 'y' })
    expect(cap.sqls[0]).toMatch(/^update "users" set/)
    expect(cap.sqls[0]).toContain('"id" = $2')
  })

  it('deleteMany: DELETE ... WHERE ... RETURNING *', async () => {
    await db.deleteMany('sessions', { user: 'u1' })
    expect(cap.sqls[0]).toMatch(/delete from "sessions" where "user" = \$1 returning \*/)
  })

  it('count: returns a number', async () => {
    cap.total = 5
    expect(await db.count('users', { active: true })).toBe(5)
    expect(cap.sqls[0]).toContain('count(*)')
  })

  it('exists: true when a row is present, false otherwise', async () => {
    cap.rows = [{ exists: 1 }]
    expect(await db.exists('users', { id: 1 })).toBe(true)
    cap.rows = []
    expect(await db.exists('users', { id: 2 })).toBe(false)
  })

  it('pluck: one column to array', async () => {
    cap.rows = [{ id: 'a' }, { id: 'b' }]
    expect(await db.pluck('users', 'id')).toEqual(['a', 'b'])
  })

  it('keymap: key -> value map', async () => {
    cap.rows = [{ k: 'es', v: 'Spain' }, { k: 'fr', v: 'France' }]
    expect(await db.keymap('countries', 'k', 'v')).toEqual({ es: 'Spain', fr: 'France' })
  })

  it('query: raw SQL binds repeated $1 (pgvector pattern)', async () => {
    cap.rows = [{ id: 'e1' }]
    await db.query('select 1 - (vector <=> $1::vector) as s, 0.85 * (1 - (vector <=> $1::vector)) as c from entry_embedding', ['[0,1]'])
    expect(cap.params[0]).toEqual(['[0,1]', '[0,1]'])
  })

  it('paginate: LIMIT/OFFSET page + unpaged total', async () => {
    cap.rows = [{ id: 1 }, { id: 2 }]; cap.total = 42
    const res = await db.paginate('entry', { orderBy: 'date', direction: 'desc', size: 2, page: 1, filters: { user: 'u1' } })
    expect(res.total).toBe(42)
    expect(res.elements).toEqual([{ id: 1 }, { id: 2 }])
    const pageSql = cap.sqls.find((x) => /limit/.test(x))!
    expect(pageSql).toContain('order by "date" desc')
    expect(pageSql).toMatch(/limit \$\d+ offset \$\d+|limit 2 offset 2/)
  })
})
