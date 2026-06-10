import { describe, it, expect } from 'vitest'
import {
  ConnectionException,
  UniqueViolationException,
  ForeignKeyViolationException,
  CheckViolationException,
  NotNullViolationException,
  DeadlockException,
  DatabaseException,
} from '@xfcfam/xf-sql'
import { PostgresErrorUtils } from '../../../index'

/** Build a pg-style error object. */
function pgError(fields: Record<string, unknown>): Error {
  const err = new Error((fields['message'] as string | undefined) ?? 'pg error')
  Object.assign(err, fields)
  return err
}

describe('PostgresErrorUtils.translate — SQLSTATE mapping', () => {
  it('23505 → UniqueViolationException with structured details', () => {
    const out = PostgresErrorUtils.translate(
      pgError({ code: '23505', constraint: 'users_email_key', table: 'users', column: 'email', message: 'duplicate key' }),
    )
    expect(out).toBeInstanceOf(UniqueViolationException)
    expect((out as UniqueViolationException).constraint).toBe('users_email_key')
    expect((out as UniqueViolationException).table).toBe('users')
    expect((out as UniqueViolationException).column).toBe('email')
  })

  it('23503 → ForeignKeyViolationException', () => {
    const out = PostgresErrorUtils.translate(pgError({ code: '23503', constraint: 'orders_user_id_fkey', table: 'orders' }))
    expect(out).toBeInstanceOf(ForeignKeyViolationException)
    expect((out as ForeignKeyViolationException).constraint).toBe('orders_user_id_fkey')
  })

  it('23514 → CheckViolationException', () => {
    const out = PostgresErrorUtils.translate(pgError({ code: '23514', constraint: 'users_age_positive' }))
    expect(out).toBeInstanceOf(CheckViolationException)
    expect((out as CheckViolationException).constraint).toBe('users_age_positive')
  })

  it('23502 → NotNullViolationException', () => {
    const out = PostgresErrorUtils.translate(pgError({ code: '23502', table: 'users', column: 'email' }))
    expect(out).toBeInstanceOf(NotNullViolationException)
    expect((out as NotNullViolationException).column).toBe('email')
  })

  it('40P01 → DeadlockException', () => {
    const out = PostgresErrorUtils.translate(pgError({ code: '40P01', message: 'deadlock detected' }))
    expect(out).toBeInstanceOf(DeadlockException)
  })
})

describe('PostgresErrorUtils.translate — transport-level errors', () => {
  it('ECONNREFUSED → ConnectionException', () => {
    expect(PostgresErrorUtils.translate(pgError({ code: 'ECONNREFUSED', message: 'connect ECONNREFUSED' })))
      .toBeInstanceOf(ConnectionException)
  })

  it('ENOTFOUND → ConnectionException', () => {
    expect(PostgresErrorUtils.translate(pgError({ code: 'ENOTFOUND' })))
      .toBeInstanceOf(ConnectionException)
  })

  it('ETIMEDOUT → ConnectionException', () => {
    expect(PostgresErrorUtils.translate(pgError({ code: 'ETIMEDOUT' })))
      .toBeInstanceOf(ConnectionException)
  })

  it('ECONNRESET → ConnectionException', () => {
    expect(PostgresErrorUtils.translate(pgError({ code: 'ECONNRESET' })))
      .toBeInstanceOf(ConnectionException)
  })
})

describe('PostgresErrorUtils.translate — pass-through cases', () => {
  it('already-translated DatabaseException is returned unchanged', () => {
    const original = new UniqueViolationException('x')
    expect(PostgresErrorUtils.translate(original)).toBe(original)
  })

  it('non-pg Error without code is returned unchanged', () => {
    const e = new Error('something else')
    expect(PostgresErrorUtils.translate(e)).toBe(e)
  })

  it('unknown SQLSTATE is returned unchanged', () => {
    const e = pgError({ code: '99999' })
    expect(PostgresErrorUtils.translate(e)).toBe(e)
  })

  it('non-error values are returned unchanged', () => {
    expect(PostgresErrorUtils.translate('plain string')).toBe('plain string')
    expect(PostgresErrorUtils.translate(undefined)).toBe(undefined)
    expect(PostgresErrorUtils.translate(null)).toBe(null)
  })
})

describe('PostgresErrorUtils — constants', () => {
  it('exposes SQLSTATE constants as static readonly', () => {
    expect(PostgresErrorUtils.SQLSTATE_UNIQUE_VIOLATION).toBe('23505')
    expect(PostgresErrorUtils.SQLSTATE_FOREIGN_KEY_VIOLATION).toBe('23503')
    expect(PostgresErrorUtils.SQLSTATE_CHECK_VIOLATION).toBe('23514')
    expect(PostgresErrorUtils.SQLSTATE_NOT_NULL_VIOLATION).toBe('23502')
    expect(PostgresErrorUtils.SQLSTATE_DEADLOCK_DETECTED).toBe('40P01')
  })

  it('every typed exception is also a DatabaseException', () => {
    const e = PostgresErrorUtils.translate(pgError({ code: '23505' }))
    expect(e).toBeInstanceOf(DatabaseException)
  })
})
