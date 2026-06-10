/**
 * Static utility — pure path manipulation. Operates only on string
 * tokens; no syscalls. Adopts forward-slash normalisation across
 * platforms so XF artefacts can keep paths comparable.
 *
 * Built on top of `node:path/posix` so the behaviour is deterministic
 * regardless of the host OS (Windows backslashes are normalised to
 * forward slashes on input).
 */
import { posix } from 'node:path'

export class PathUtils {
  private constructor() {}

  /** Concatenate path segments with `/`, collapsing duplicate separators. */
  static join(...segments: string[]): string {
    return posix.join(...segments.map(PathUtils.normalize))
  }

  /** Collapse `..`/`.`, duplicate `/`, and unify separators to `/`. */
  static normalize(p: string): string {
    return posix.normalize(p.replace(/\\/g, '/'))
  }

  /** Last segment (filename including extension). */
  static basename(p: string): string {
    return posix.basename(PathUtils.normalize(p))
  }

  /**
   * Filename extension including the leading dot (`.txt`), or `''` if
   * the basename has no extension or is a dotfile.
   */
  static extname(p: string): string {
    return posix.extname(PathUtils.normalize(p))
  }

  /** Parent directory of `p` (or `'.'` for bare basenames). */
  static dirname(p: string): string {
    return posix.dirname(PathUtils.normalize(p))
  }

  /** Compute the relative path from `from` to `to`. */
  static relative(from: string, to: string): string {
    return posix.relative(PathUtils.normalize(from), PathUtils.normalize(to))
  }

  /** Whether `p` is an absolute path. */
  static isAbsolute(p: string): boolean {
    return posix.isAbsolute(PathUtils.normalize(p))
  }

  /** Strip the filename extension (`'foo.txt'` → `'foo'`). */
  static stripExtension(p: string): string {
    const base = PathUtils.basename(p)
    const ext = PathUtils.extname(base)
    if (ext === '') return base
    return base.slice(0, -ext.length)
  }
}
