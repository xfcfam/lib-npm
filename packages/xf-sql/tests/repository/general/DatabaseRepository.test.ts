import { describe, it, expect } from 'vitest'
import { DatabaseRepository, DatabaseException, UniqueViolationException } from '../../../index'
import { DummyDriver, SqliteAdapter, SqliteIntrospector, SqliteQueryCompiler, type Dialect } from 'kysely'

/**
 * Build a Kysely Dialect that never executes anything — perfect for
 * verifying the Generalization's lifecycle and error-translation
 * wiring without needing a real database connection.
 */
function nullDialect(): Dialect {
  return {
    createAdapter:    () => new SqliteAdapter(),
    createDriver:     () => new DummyDriver(),
    createIntrospector: (db) => new SqliteIntrospector(db),
    createQueryCompiler: () => new SqliteQueryCompiler(),
  }
}

interface Schema {
  users: { id: number; name: string }
}

class SilentDb extends DatabaseRepository<Schema> {
  constructor() { super({ dialect: nullDialect() }) }
  async init()      { await super.init() }
  async terminate() { await super.terminate() }

  // exposes db for testing
  getDb() { return this.db }
}

describe('DatabaseRepository — lifecycle', () => {
  it('throws when `db` is accessed before init()', () => {
    const r = new SilentDb()
    expect(() => r.getDb()).toThrow(/init\(\) was not called/)
  })

  it('exposes a Kysely instance after init()', async () => {
    const r = new SilentDb()
    await r.init()
    const db = r.getDb()
    expect(db).toBeDefined()
    expect(typeof (db as any).selectFrom).toBe('function')
    await r.terminate()
  })

  it('destroys the Kysely instance on terminate()', async () => {
    const r = new SilentDb()
    await r.init()
    await r.terminate()
    expect(() => r.getDb()).toThrow(/init\(\) was not called/)
  })
})

describe('DatabaseRepository.exec — error translation', () => {
  it('runs translateError on the thrown error', async () => {
    class TranslatingDb extends DatabaseRepository<Schema> {
      constructor() { super({ dialect: nullDialect() }) }
      async init()      { await super.init() }
      async terminate() { await super.terminate() }

      protected override translateError(_err: unknown): unknown {
        return new UniqueViolationException('translated by test', { column: 'email' })
      }

      async fail() {
        return this.exec<never>(async () => { throw new Error('original') })
      }
    }

    const r = new TranslatingDb()
    await r.init()
    await expect(r.fail()).rejects.toBeInstanceOf(UniqueViolationException)
    await r.terminate()
  })

  it('passes through successful results unchanged', async () => {
    const r = new SilentDb()
    await r.init()
    const result = await (r as any).exec(async () => 42)
    expect(result).toBe(42)
    await r.terminate()
  })

  it('default translateError is identity (returns the same error)', async () => {
    const r = new SilentDb()
    await r.init()
    const original = new Error('boom')
    await expect((r as any).exec(async () => { throw original })).rejects.toBe(original)
    await r.terminate()
  })
})

describe('Exception hierarchy', () => {
  it('every typed exception is instanceof DatabaseException', () => {
    expect(new UniqueViolationException('x')).toBeInstanceOf(DatabaseException)
  })

  it('UniqueViolationException carries structured details', () => {
    const e = new UniqueViolationException('dup', {
      constraint: 'users_email_key',
      table: 'users',
      column: 'email',
    })
    expect(e.constraint).toBe('users_email_key')
    expect(e.table).toBe('users')
    expect(e.column).toBe('email')
    expect(e.name).toBe('UniqueViolationException')
  })
})
