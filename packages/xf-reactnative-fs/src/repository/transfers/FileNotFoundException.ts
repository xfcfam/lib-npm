/**
 * Access-layer Exception — the requested path does not exist on disk.
 *
 * The React Native counterpart of `@xfcfam/xf-fs`'s exception of the same
 * name. Redefined here (not imported) so this package never pulls the
 * node-bound `@xfcfam/xf-fs` runtime into a React Native bundle.
 */
export class FileNotFoundException extends Error {
  readonly path: string

  constructor(path: string) {
    super(`File not found: ${path}`)
    this.name = 'FileNotFoundException'
    this.path = path
  }
}
