import { Repository } from '@xfcfam/xf'
import * as RNFS from '@dr.pogodin/react-native-fs'
import type { FileStat, FileEntry, TempFile, Watcher, WatchEvent } from '@xfcfam/xf-fs'
import { FileNotFoundException } from '../transfers/FileNotFoundException.js'
import { FileAccessDeniedException } from '../transfers/FileAccessDeniedException.js'
import { DirectoryNotEmptyException } from '../transfers/DirectoryNotEmptyException.js'
import { PathUtils } from '../utils/PathUtils.js'
import { EncodingUtils } from '../utils/EncodingUtils.js'

/**
 * Configuration accepted by a {@link FileRepository}. `rootPath` anchors
 * every relative path; React Native has no current working directory, so
 * it defaults to the app's documents directory
 * (`RNFS.DocumentDirectoryPath`). See {@link DirectoryUtils} for the other
 * platform sandbox roots.
 */
export interface FileOptions {
  readonly rootPath?: string
}

/** Operative state of a {@link FileRepository}. */
interface RNFileState {
  readonly rootPath: string
  readonly openTempFiles: Set<TempFileImpl>
}

/**
 * Access-Layer Generalization — the **React Native sibling of
 * `@xfcfam/xf-fs`'s `FileRepository`**. Same API and method surface, same
 * Transfer types (re-exported from `@xfcfam/xf-fs`), backed by
 * [`@dr.pogodin/react-native-fs`](https://github.com/birdofpreyru/react-native-fs)
 * instead of `node:fs`.
 *
 * Binary content round-trips through Base64 (React Native has no `Buffer`,
 * and the backend exchanges bytes as Base64). Two operations are
 * **boundary cases** that React Native's filesystem cannot honour and so
 * throw: {@link watch} (no native file watcher) and {@link readStream} /
 * {@link writeStream} (no WHATWG streams) — read/write whole files, or
 * call the backend's chunked `read()` directly.
 *
 * Concrete components extend this class for their domain, exactly as with
 * `@xfcfam/xf-fs`:
 *
 * @example
 * ```ts
 * import { FileRepository, DirectoryUtils } from '@xfcfam/xf-reactnative-fs'
 *
 * export class ProfilesFileRepository extends FileRepository {
 *   constructor() { super({ rootPath: DirectoryUtils.document }) }
 *   async load(id: string) { return JSON.parse(await this.read(`${id}.json`)) }
 * }
 * ```
 */
export abstract class FileRepository extends Repository<RNFileState> {
  constructor(options: FileOptions = {}) {
    super({
      rootPath: options.rootPath ?? RNFS.DocumentDirectoryPath,
      openTempFiles: new Set(),
    })
  }

  /** No-op initialisation; override to add setup, calling `super.init()` first. */
  override async init(): Promise<void> {}

  /** Delete every still-open {@link TempFile} handle. */
  override async terminate(): Promise<void> {
    for (const t of [...this.state.openTempFiles]) {
      try {
        await t.close()
      } catch {
        /* swallow on shutdown */
      }
    }
  }

  // ─── Path resolution ──────────────────────────────────────

  /** Resolve a path against `rootPath`; absolute paths pass through. */
  protected resolve(path: string): string {
    const normalised = PathUtils.normalize(path)
    if (PathUtils.isAbsolute(normalised)) return normalised
    return PathUtils.join(this.state.rootPath, normalised)
  }

  // ─── File operations ──────────────────────────────────────

  /** Read a file as UTF-8 text. */
  async read(path: string): Promise<string> {
    const abs = this.resolve(path)
    try {
      return EncodingUtils.stripBom(await RNFS.readFile(abs, 'utf8'))
    } catch (err) {
      throw this.translateError(err, abs)
    }
  }

  /** Read a file as raw bytes (decoded from the backend's Base64). */
  async readBytes(path: string): Promise<Uint8Array> {
    const abs = this.resolve(path)
    try {
      return EncodingUtils.fromBase64(await RNFS.readFile(abs, 'base64'))
    } catch (err) {
      throw this.translateError(err, abs)
    }
  }

  /** Write `content` to `path`, overwriting any existing file. */
  async write(path: string, content: string | Uint8Array): Promise<void> {
    const abs = this.resolve(path)
    try {
      if (typeof content === 'string') await RNFS.writeFile(abs, content, 'utf8')
      else await RNFS.writeFile(abs, EncodingUtils.toBase64(content), 'base64')
    } catch (err) {
      throw this.translateError(err, abs)
    }
  }

  /** Append `content` to the end of `path` (creating it if absent). */
  async append(path: string, content: string | Uint8Array): Promise<void> {
    const abs = this.resolve(path)
    try {
      if (typeof content === 'string') await RNFS.appendFile(abs, content, 'utf8')
      else await RNFS.appendFile(abs, EncodingUtils.toBase64(content), 'base64')
    } catch (err) {
      throw this.translateError(err, abs)
    }
  }

  /** Delete the file at `path`. Throws {@link FileNotFoundException} if absent. */
  async delete(path: string): Promise<void> {
    const abs = this.resolve(path)
    try {
      await RNFS.unlink(abs)
    } catch (err) {
      throw this.translateError(err, abs)
    }
  }

  /** Whether the path exists. */
  async exists(path: string): Promise<boolean> {
    return RNFS.exists(this.resolve(path))
  }

  /** Stat `path`. Throws {@link FileNotFoundException} if absent. */
  async stat(path: string): Promise<FileStat> {
    const abs = this.resolve(path)
    try {
      const s = await RNFS.stat(abs)
      return {
        path: abs,
        size: Number(s.size),
        modifiedAt: new Date(s.mtime),
        createdAt: new Date(s.ctime),
        isFile: s.isFile(),
        isDirectory: s.isDirectory(),
        // React Native's filesystem does not surface symlink status.
        isSymlink: false,
        mode: s.mode,
      }
    } catch (err) {
      throw this.translateError(err, abs)
    }
  }

  // ─── Directory operations ─────────────────────────────────

  /** List immediate entries of a directory (not recursive). */
  async list(path: string): Promise<FileEntry[]> {
    const abs = this.resolve(path)
    try {
      const items = await RNFS.readDir(abs)
      const out: FileEntry[] = items.map((e) => ({
        path: e.path,
        relativePath: e.name,
        name: e.name,
        isFile: e.isFile(),
        isDirectory: e.isDirectory(),
        isSymlink: false,
      }))
      out.sort((a, b) => a.name.localeCompare(b.name))
      return out
    } catch (err) {
      throw this.translateError(err, abs)
    }
  }

  /** Walk a directory recursively (`relativePath` is relative to the root). */
  async walk(path: string): Promise<FileEntry[]> {
    const root = this.resolve(path)
    const out: FileEntry[] = []
    await this.walkInto(root, root, out)
    out.sort((a, b) => a.relativePath.localeCompare(b.relativePath))
    return out
  }

  private async walkInto(current: string, root: string, out: FileEntry[]): Promise<void> {
    let items: Awaited<ReturnType<typeof RNFS.readDir>>
    try {
      items = await RNFS.readDir(current)
    } catch (err) {
      throw this.translateError(err, current)
    }
    for (const e of items) {
      const isDirectory = e.isDirectory()
      out.push({
        path: e.path,
        relativePath: PathUtils.relative(root, e.path),
        name: e.name,
        isFile: e.isFile(),
        isDirectory,
        isSymlink: false,
      })
      if (isDirectory) await this.walkInto(e.path, root, out)
    }
  }

  /**
   * Create a directory. The backend always creates intermediate parents,
   * so `recursive` is accepted for API parity but has no effect.
   */
  async mkdir(path: string, _options: { recursive?: boolean } = {}): Promise<void> {
    const abs = this.resolve(path)
    try {
      await RNFS.mkdir(abs)
    } catch (err) {
      throw this.translateError(err, abs)
    }
  }

  /**
   * Remove a directory. By default it must be empty (a non-empty
   * directory raises {@link DirectoryNotEmptyException}); pass
   * `{ recursive: true }` to delete its contents too.
   */
  async rmdir(path: string, options: { recursive?: boolean } = {}): Promise<void> {
    const abs = this.resolve(path)
    try {
      if (options.recursive !== true) {
        const entries = await RNFS.readDir(abs)
        if (entries.length > 0) throw new DirectoryNotEmptyException(abs)
      }
      await RNFS.unlink(abs)
    } catch (err) {
      if (err instanceof DirectoryNotEmptyException) throw err
      throw this.translateError(err, abs)
    }
  }

  // ─── Copy / move ──────────────────────────────────────────

  /** Copy `src` to `dest`, overwriting `dest` if it already exists. */
  async copy(src: string, dest: string): Promise<void> {
    const absSrc = this.resolve(src)
    const absDest = this.resolve(dest)
    try {
      if (await RNFS.exists(absDest)) await RNFS.unlink(absDest)
      await RNFS.copyFile(absSrc, absDest)
    } catch (err) {
      throw this.translateError(err, absSrc)
    }
  }

  /** Move `src` to `dest`, overwriting `dest` if it exists. */
  async move(src: string, dest: string): Promise<void> {
    const absSrc = this.resolve(src)
    const absDest = this.resolve(dest)
    try {
      if (await RNFS.exists(absDest)) await RNFS.unlink(absDest)
      await RNFS.moveFile(absSrc, absDest)
    } catch (err) {
      throw this.translateError(err, absSrc)
    }
  }

  // ─── Streaming (boundary case) ────────────────────────────

  /**
   * **Boundary case** — WHATWG streams are not available through
   * `@dr.pogodin/react-native-fs`. Read whole files with
   * {@link read} / {@link readBytes}, or call the backend's chunked
   * `read(path, length, position)` directly.
   *
   * @throws {Error} Always.
   */
  readStream(_path: string): ReadableStream<Uint8Array> {
    throw new Error(
      'FileRepository.readStream(): streaming is not supported by @dr.pogodin/react-native-fs. ' +
        'Use read() / readBytes() for whole files, or RNFS.read(path, length, position) for chunks.',
    )
  }

  /**
   * **Boundary case** — see {@link readStream}.
   *
   * @throws {Error} Always.
   */
  writeStream(_path: string): WritableStream<Uint8Array> {
    throw new Error(
      'FileRepository.writeStream(): streaming is not supported by @dr.pogodin/react-native-fs. ' +
        'Use write() / append() instead.',
    )
  }

  // ─── Watching (boundary case) ─────────────────────────────

  /**
   * **Boundary case** — React Native exposes no native filesystem
   * watcher through `@dr.pogodin/react-native-fs`. Poll with {@link stat}
   * if you must detect changes.
   *
   * @throws {Error} Always.
   */
  async watch(_path: string, _callback: (event: WatchEvent) => void): Promise<Watcher> {
    throw new Error(
      'FileRepository.watch(): filesystem watching is not supported on React Native ' +
        '(@dr.pogodin/react-native-fs exposes no native file watcher).',
    )
  }

  // ─── Temp files ───────────────────────────────────────────

  /**
   * Create a unique empty temporary file under the OS temp directory.
   * Closing the returned handle deletes it; `terminate()` closes all
   * outstanding handles.
   */
  async tempFile(prefix = 'xf-fs-'): Promise<TempFile> {
    const abs = PathUtils.join(RNFS.TemporaryDirectoryPath, `${prefix}${FileRepository.randomToken()}`)
    await RNFS.writeFile(abs, '', 'utf8')
    const handle = new TempFileImpl(abs, this.state.openTempFiles)
    this.state.openTempFiles.add(handle)
    return handle
  }

  // ─── Error translation ────────────────────────────────────

  /**
   * Translate a backend error into a typed Exception when recognisable.
   * React Native's error codes are less standardised than `node:fs`'s, so
   * this falls back to message inspection.
   */
  protected translateError(err: unknown, path: string): unknown {
    if (typeof err !== 'object' || err === null) return err
    const e = err as { code?: string; message?: string }
    const code = e.code
    const msg = (e.message ?? '').toLowerCase()
    if (
      code === 'ENOENT' ||
      msg.includes('no such file') ||
      msg.includes('does not exist') ||
      msg.includes('not exist') ||
      msg.includes('could not be found') ||
      msg.includes('not found')
    ) {
      return new FileNotFoundException(path)
    }
    if (code === 'EACCES' || code === 'EPERM' || msg.includes('permission') || msg.includes('denied')) {
      return new FileAccessDeniedException(path)
    }
    return err
  }

  /** Random 16-hex-char token for temp-file names (no `node:crypto`). */
  private static randomToken(): string {
    let token = ''
    for (let i = 0; i < 16; i++) token += Math.floor(Math.random() * 16).toString(16)
    return token
  }
}

// ─── Concrete Transfer implementation ────────────────────────

class TempFileImpl implements TempFile {
  readonly path: string
  private open = true
  private readonly registry: Set<TempFileImpl>

  constructor(path: string, registry: Set<TempFileImpl>) {
    this.path = path
    this.registry = registry
  }

  get isOpen(): boolean {
    return this.open
  }

  async close(): Promise<void> {
    if (!this.open) return
    this.open = false
    this.registry.delete(this)
    try {
      await RNFS.unlink(this.path)
    } catch {
      /* already gone */
    }
  }
}
