/**
 * Access-layer Exception — the operating system denied permission for the
 * requested operation. The React Native counterpart of `@xfcfam/xf-fs`'s
 * exception of the same name (redefined to keep node out of the bundle).
 */
export class FileAccessDeniedException extends Error {
  readonly path: string

  constructor(path: string) {
    super(`Access denied: ${path}`)
    this.name = 'FileAccessDeniedException'
    this.path = path
  }
}
