/**
 * Access-layer Exception — `rmdir` was called on a non-empty directory
 * without `{ recursive: true }`. The React Native counterpart of
 * `@xfcfam/xf-fs`'s exception of the same name.
 */
export class DirectoryNotEmptyException extends Error {
  readonly path: string

  constructor(path: string) {
    super(`Directory not empty: ${path}`)
    this.name = 'DirectoryNotEmptyException'
    this.path = path
  }
}
