/**
 * Access-layer Transfer — a temporary file allocated by
 * `FileRepository.tempFile()`. Carries its absolute path plus a
 * `close()` that deletes the file on the disk.
 *
 * Same shape as {@link Watcher}: a resource handle that the caller
 * is responsible for releasing. The owning `FileRepository` also
 * cleans up every tempfile it ever issued on `terminate()`, so even
 * a careless caller won't leak.
 */
export interface TempFile {
  /** Absolute path of the temporary file on disk. */
  readonly path: string
  /** Whether the temp file is still present (false after `close()`). */
  readonly isOpen: boolean
  /** Delete the file from disk and mark this handle closed. */
  close(): Promise<void>
}
