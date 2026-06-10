/**
 * Access-layer Exception — `rmdir` was called on a directory that
 * still contains entries.
 *
 * `FileRepository` translates `node:fs`'s `ENOTEMPTY` into this typed
 * Exception. Callers that want recursive deletion call `rmdir(path,
 * { recursive: true })` instead of catching this one.
 */
export class DirectoryNotEmptyException extends Error {
  readonly path: string

  constructor(path: string) {
    super(`Directory not empty: ${path}`)
    this.name = 'DirectoryNotEmptyException'
    this.path = path
  }
}
