import { Repository } from './Repository.js'

/**
 * Shape of a single page returned by a paginated source.
 *
 * @typeParam Item    Element type in the page.
 * @typeParam Cursor  Opaque cursor type used to request the next page.
 */
export interface Page<Item, Cursor> {
  /** Items contained in this page. */
  items: Item[]
  /** Cursor to request the next page. `undefined` signals end of stream. */
  next?: Cursor
}

/**
 * Generalization for Access Layer components that read from a paginated
 * external source — REST list endpoints, paged SQL queries, scroll
 * APIs, Kafka offsets, etc.
 *
 * The concrete component implements a single method, {@link fetchPage},
 * which knows how to fetch one page given an opaque cursor. The base
 * class exposes higher-level helpers:
 *
 * - {@link iterate} — `AsyncIterable<Item>` that walks the stream
 *   transparently;
 * - {@link fetchAll} — convenience that materialises the entire stream
 *   into an array. Use with care on unbounded sources.
 *
 * @typeParam T       Shape of the component's internal state.
 * @typeParam Item    Element type returned by the paginated source.
 * @typeParam Cursor  Cursor type used by the source. Defaults to `string`.
 *
 * @example
 * ```ts
 * import { PaginatedRepository, Page } from '@xfcfam/xf'
 * import { Repo } from '../transfers/Repo.js'
 *
 * export class GitHubRepoRepository extends PaginatedRepository<null, Repo> {
 *   constructor() { super(null) }
 *   async init()      {}
 *   async terminate() {}
 *   protected async fetchPage(cursor?: string): Promise<Page<Repo, string>> {
 *     const url = cursor ?? '/user/repos?per_page=100'
 *     const res = await fetch(url)
 *     return { items: await res.json(), next: parseLinkHeader(res.headers.get('link')) }
 *   }
 * }
 *
 * // Usage:
 * for await (const repo of repos.iterate()) console.log(repo.name)
 * ```
 */
export abstract class PaginatedRepository<T, Item, Cursor = string> extends Repository<T> {
  /**
   * Fetch one page of results.
   *
   * @param cursor  Cursor returned by the previous page, or `undefined` to request the first page.
   * @returns       A page of items plus the cursor for the next page (or `next: undefined` at end of stream).
   */
  protected abstract fetchPage(cursor?: Cursor): Promise<Page<Item, Cursor>>

  /**
   * Async-iterate every item across every page. Stops automatically
   * when a page returns `next: undefined`.
   *
   * @returns An async iterable that yields one item at a time.
   */
  async *iterate(): AsyncIterable<Item> {
    let cursor: Cursor | undefined = undefined
    while (true) {
      const page: Page<Item, Cursor> = await this.fetchPage(cursor)
      for (const item of page.items) yield item
      if (page.next === undefined) return
      cursor = page.next
    }
  }

  /**
   * Materialise every item from every page into an array. Use only on
   * bounded streams known to fit in memory.
   *
   * @returns An array of every item across every page.
   */
  async fetchAll(): Promise<Item[]> {
    const all: Item[] = []
    for await (const item of this.iterate()) all.push(item)
    return all
  }
}
