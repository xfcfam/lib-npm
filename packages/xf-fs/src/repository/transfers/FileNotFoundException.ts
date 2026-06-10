/**
 * Access-layer Exception — the requested path does not exist on disk.
 *
 * Thrown by `FileRepository` operations that require the path to
 * exist (`read`, `stat`, `delete`, `list`, …). The Repository
 * translates the `node:fs` `ENOENT` error into this typed Exception
 * before propagating it upward.
 */
export class FileNotFoundException extends Error {
  readonly path: string

  constructor(path: string) {
    super(`File not found: ${path}`)
    this.name = 'FileNotFoundException'
    this.path = path
  }
}
