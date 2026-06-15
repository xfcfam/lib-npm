/**
 * Static utility — pure POSIX path manipulation, **no `node:path`**.
 *
 * The React Native counterpart of `@xfcfam/xf-fs`'s `PathUtils`. React
 * Native ships no `node:path`, so the POSIX algorithm is reimplemented
 * here in portable TypeScript. Behaviour is identical to the node version:
 * forward-slash normalisation, `.`/`..` resolution, deterministic across
 * platforms.
 */

const CHAR_DOT = 46 // '.'
const CHAR_SLASH = 47 // '/'

/** Resolve `.` / `..` segments (node's internal `normalizeString`). */
function normalizeString(path: string, allowAboveRoot: boolean): string {
  let res = ''
  let lastSegmentLength = 0
  let lastSlash = -1
  let dots = 0
  let code = 0
  for (let i = 0; i <= path.length; ++i) {
    if (i < path.length) code = path.charCodeAt(i)
    else if (code === CHAR_SLASH) break
    else code = CHAR_SLASH

    if (code === CHAR_SLASH) {
      if (lastSlash === i - 1 || dots === 1) {
        // noop
      } else if (dots === 2) {
        if (
          res.length < 2 ||
          lastSegmentLength !== 2 ||
          res.charCodeAt(res.length - 1) !== CHAR_DOT ||
          res.charCodeAt(res.length - 2) !== CHAR_DOT
        ) {
          if (res.length > 2) {
            const lastSlashIndex = res.lastIndexOf('/')
            if (lastSlashIndex === -1) {
              res = ''
              lastSegmentLength = 0
            } else {
              res = res.slice(0, lastSlashIndex)
              lastSegmentLength = res.length - 1 - res.lastIndexOf('/')
            }
            lastSlash = i
            dots = 0
            continue
          } else if (res.length !== 0) {
            res = ''
            lastSegmentLength = 0
            lastSlash = i
            dots = 0
            continue
          }
        }
        if (allowAboveRoot) {
          res += res.length > 0 ? '/..' : '..'
          lastSegmentLength = 2
        }
      } else {
        if (res.length > 0) res += '/' + path.slice(lastSlash + 1, i)
        else res = path.slice(lastSlash + 1, i)
        lastSegmentLength = i - lastSlash - 1
      }
      lastSlash = i
      dots = 0
    } else if (code === CHAR_DOT && dots !== -1) {
      ++dots
    } else {
      dots = -1
    }
  }
  return res
}

function posixNormalize(path: string): string {
  if (path.length === 0) return '.'
  const isAbsolute = path.charCodeAt(0) === CHAR_SLASH
  const trailingSeparator = path.charCodeAt(path.length - 1) === CHAR_SLASH
  path = normalizeString(path, !isAbsolute)
  if (path.length === 0) {
    if (isAbsolute) return '/'
    return trailingSeparator ? './' : '.'
  }
  if (trailingSeparator) path += '/'
  return isAbsolute ? '/' + path : path
}

function posixBasename(path: string): string {
  let start = 0
  let end = -1
  let matchedSlash = true
  for (let i = path.length - 1; i >= 0; --i) {
    if (path.charCodeAt(i) === CHAR_SLASH) {
      if (!matchedSlash) {
        start = i + 1
        break
      }
    } else if (end === -1) {
      matchedSlash = false
      end = i + 1
    }
  }
  if (end === -1) return ''
  return path.slice(start, end)
}

function posixExtname(path: string): string {
  let startDot = -1
  let startPart = 0
  let end = -1
  let matchedSlash = true
  let preDotState = 0
  for (let i = path.length - 1; i >= 0; --i) {
    const code = path.charCodeAt(i)
    if (code === CHAR_SLASH) {
      if (!matchedSlash) {
        startPart = i + 1
        break
      }
      continue
    }
    if (end === -1) {
      matchedSlash = false
      end = i + 1
    }
    if (code === CHAR_DOT) {
      if (startDot === -1) startDot = i
      else if (preDotState !== 1) preDotState = 1
    } else if (startDot !== -1) {
      preDotState = -1
    }
  }
  if (
    startDot === -1 ||
    end === -1 ||
    preDotState === 0 ||
    (preDotState === 1 && startDot === end - 1 && startDot === startPart + 1)
  ) {
    return ''
  }
  return path.slice(startDot, end)
}

function posixDirname(path: string): string {
  if (path.length === 0) return '.'
  const hasRoot = path.charCodeAt(0) === CHAR_SLASH
  let end = -1
  let matchedSlash = true
  for (let i = path.length - 1; i >= 1; --i) {
    if (path.charCodeAt(i) === CHAR_SLASH) {
      if (!matchedSlash) {
        end = i
        break
      }
    } else {
      matchedSlash = false
    }
  }
  if (end === -1) return hasRoot ? '/' : '.'
  if (hasRoot && end === 1) return '//'
  return path.slice(0, end)
}

/** Lexical relative path between two **absolute** POSIX paths. */
function posixRelative(from: string, to: string): string {
  if (from === to) return ''
  const fromStart = 1
  const fromEnd = from.length
  const fromLen = fromEnd - fromStart
  const toStart = 1
  const toLen = to.length - toStart
  const length = fromLen < toLen ? fromLen : toLen
  let lastCommonSep = -1
  let i = 0
  for (; i < length; i++) {
    const fromCode = from.charCodeAt(fromStart + i)
    if (fromCode !== to.charCodeAt(toStart + i)) break
    if (fromCode === CHAR_SLASH) lastCommonSep = i
  }
  if (i === length) {
    if (toLen > length) {
      if (to.charCodeAt(toStart + i) === CHAR_SLASH) return to.slice(toStart + i + 1)
      if (i === 0) return to.slice(toStart + i)
    } else if (fromLen > length) {
      if (from.charCodeAt(fromStart + i) === CHAR_SLASH) lastCommonSep = i
      else if (i === 0) lastCommonSep = 0
    }
  }
  let out = ''
  for (i = fromStart + lastCommonSep + 1; i <= fromEnd; ++i) {
    if (i === fromEnd || from.charCodeAt(i) === CHAR_SLASH) {
      out += out.length === 0 ? '..' : '/..'
    }
  }
  return out + to.slice(toStart + lastCommonSep)
}

export class PathUtils {
  private constructor() {}

  /** Concatenate path segments with `/`, collapsing duplicate separators. */
  static join(...segments: string[]): string {
    if (segments.length === 0) return '.'
    let joined: string | undefined
    for (const seg of segments) {
      const s = PathUtils.normalize(seg)
      if (s.length > 0) {
        if (joined === undefined) joined = s
        else joined += '/' + s
      }
    }
    if (joined === undefined) return '.'
    return posixNormalize(joined)
  }

  /** Collapse `..`/`.`, duplicate `/`, and unify separators to `/`. */
  static normalize(p: string): string {
    return posixNormalize(p.replace(/\\/g, '/'))
  }

  /** Last segment (filename including extension). */
  static basename(p: string): string {
    return posixBasename(PathUtils.normalize(p))
  }

  /**
   * Filename extension including the leading dot (`.txt`), or `''` if
   * the basename has no extension or is a dotfile.
   */
  static extname(p: string): string {
    return posixExtname(PathUtils.normalize(p))
  }

  /** Parent directory of `p` (or `'.'` for bare basenames). */
  static dirname(p: string): string {
    return posixDirname(PathUtils.normalize(p))
  }

  /**
   * Relative path from `from` to `to`. Both should be **absolute** —
   * React Native has no current working directory to resolve against.
   */
  static relative(from: string, to: string): string {
    return posixRelative(PathUtils.normalize(from), PathUtils.normalize(to))
  }

  /** Whether `p` is an absolute path. */
  static isAbsolute(p: string): boolean {
    const n = PathUtils.normalize(p)
    return n.length > 0 && n.charCodeAt(0) === CHAR_SLASH
  }

  /** Strip the filename extension (`'foo.txt'` → `'foo'`). */
  static stripExtension(p: string): string {
    const base = PathUtils.basename(p)
    const ext = PathUtils.extname(base)
    if (ext === '') return base
    return base.slice(0, -ext.length)
  }
}
