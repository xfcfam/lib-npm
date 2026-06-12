/**
 * Kind of filesystem change observed by a `Watcher`.
 *
 * Note: the built-in `node:fs` watcher only ever emits `'modified'` and
 * `'renamed'`. `'created'` and `'deleted'` are part of the general contract
 * for custom `Watcher` implementations and are never produced by the
 * filesystem watcher shipped with this package.
 */
export type WatchEventKind = 'created' | 'modified' | 'deleted' | 'renamed'

/**
 * Access-layer Transfer — a single filesystem-change event delivered
 * by a `Watcher` callback.
 *
 * The `path` is absolute; `oldPath` is populated on `renamed` events
 * to carry the previous path of the entry.
 */
export interface WatchEvent {
  /** Absolute path of the affected entry (the new path on rename). */
  path: string
  /** Previous absolute path on rename events; otherwise undefined. */
  oldPath?: string
  /** Kind of change observed. */
  kind: WatchEventKind
}
