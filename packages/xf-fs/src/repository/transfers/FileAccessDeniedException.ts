/**
 * Access-layer Exception — the operating system denied permission
 * to perform the requested operation on the path.
 *
 * Thrown by `FileRepository` when `node:fs` raises `EACCES` or
 * `EPERM`. The Repository translates the platform error into this
 * typed Exception so consumers can branch on permission failure
 * without inspecting `errno` codes.
 */
export class FileAccessDeniedException extends Error {
  readonly path: string

  constructor(path: string) {
    super(`Access denied: ${path}`)
    this.name = 'FileAccessDeniedException'
    this.path = path
  }
}
