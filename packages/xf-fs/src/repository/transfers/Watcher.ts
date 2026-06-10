/**
 * Access-layer Transfer — an active filesystem watcher returned by
 * `FileRepository.watch()`. Carries the live handle plus a `close()`
 * to release the OS resource.
 *
 * The XF model treats a stateful resource handle as a Transfer (just
 * like a database cursor or an HTTP response stream): the Logical
 * (Repository) hands it back to the caller, who owns its lifecycle.
 */
export interface Watcher {
  /** Absolute path being watched (root of the watch — may be a file or directory). */
  readonly path: string
  /** Whether the watcher is still active. */
  readonly isActive: boolean
  /** Stop receiving events and release the underlying OS handle. */
  close(): Promise<void>
}
