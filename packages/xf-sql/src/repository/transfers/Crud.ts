/** A scalar value bindable as a SQL parameter. */
export type Primitive = string | number | boolean | bigint | Date | null

/**
 * Equality filter map for the built-in CRUD operations.
 *
 * Each entry becomes a `WHERE` predicate ANDed together:
 *   - a scalar → `col = value`
 *   - an array → `col IN (…)`  (empty array → `false`, matches nothing)
 *   - `null`   → `col IS NULL`
 */
export type Filters = Record<string, Primitive | ReadonlyArray<Primitive>>

/** Result of {@link DatabaseRepository.paginate}: the page rows plus the unpaged total. */
export interface Pagination<T> {
  /** Total rows matching the filter (ignoring `size`/`page`). */
  readonly total: number
  /** The rows for the requested page. */
  readonly elements: T[]
}

/** Options accepted by {@link DatabaseRepository.paginate}. */
export interface PageOptions {
  /** Column to order by (required for a stable page window). */
  readonly orderBy: string
  /** Sort direction. Default `'asc'`. */
  readonly direction?: 'asc' | 'desc'
  /** Page size. Default `20`. */
  readonly size?: number
  /** Zero-based page index. Default `0`. */
  readonly page?: number
  /** Equality filters applied to both the page and the total count. */
  readonly filters?: Filters
}
