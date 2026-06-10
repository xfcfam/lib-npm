import { Repository } from '@xfcfam/xf'
import { promises as fsp, createReadStream, createWriteStream, watch as fsWatch } from 'node:fs'
import { Readable, Writable } from 'node:stream'
import { tmpdir } from 'node:os'
import { posix } from 'node:path'
import { randomBytes } from 'node:crypto'
import type { FileEntry } from '../transfers/FileEntry.js'
import type { FileStat } from '../transfers/FileStat.js'
import type { Watcher } from '../transfers/Watcher.js'
import type { TempFile } from '../transfers/TempFile.js'
import type { WatchEvent } from '../transfers/WatchEvent.js'
import { FileNotFoundException } from '../transfers/FileNotFoundException.js'
import { FileAccessDeniedException } from '../transfers/FileAccessDeniedException.js'
import { DirectoryNotEmptyException } from '../transfers/DirectoryNotEmptyException.js'
import { PathUtils } from '../utils/PathUtils.js'

/**
 * Configuration accepted by {@link FileRepository}'s constructor.
 *
 * `rootPath` becomes the implicit root for every relative path passed
 * to a Repository method; absolute paths are accepted as-is. This
 * mirrors the way `RestRepository.baseUrl` anchors REST requests.
 */
export interface FileOptions {
  /**
   * If set, every relative path passed to a method is resolved against
   * this directory. Absolute paths bypass it. Defaults to the current
   * working directory.
   */
  readonly rootPath?: string
}

interface FileRepoState {
  readonly rootPath: string
  readonly openWatchers: Set<WatcherImpl>
  readonly openTempFiles: Set<TempFileImpl>
}

/**
 * Generalization for Access Layer components that operate on the
 * local filesystem.
 *
 * The protocol is "local filesystem" — every method on this class is
 * a syscall (or a tight wrapper over one) translated into the XF
 * Transfer projection: file content as `string` / `Uint8Array`,
 * metadata as {@link FileStat}, directory entries as
 * {@link FileEntry}, change events as {@link WatchEvent}, and active
 * handles as {@link Watcher} / {@link TempFile}.
 *
 * Concrete components extend this class to expose business-meaningful
 * methods that compose the base operations (e.g. `loadProfile()`
 * calls `this.read('/users/profile.json')` then `JSON.parse`).
 *
 * Errors raised by `node:fs` are translated into typed Exception
 * components ({@link FileNotFoundException},
 * {@link FileAccessDeniedException},
 * {@link DirectoryNotEmptyException}) so the Business Layer never
 * inspects `errno` strings. Other failures propagate as native
 * `Error` (consistent with the XF doctrine that runtime exceptions
 * are well-formed transfer vehicles).
 *
 * `terminate()` releases every still-active {@link Watcher} and
 * deletes every still-open {@link TempFile}: even careless callers
 * won't leak OS handles.
 *
 * @example
 * ```ts
 * import { FileRepository } from '@xfcfam/xf-fs'
 * import type { User } from '../transfers/User.js'
 *
 * export class UsersFileRepository extends FileRepository {
 *   constructor() { super({ rootPath: '/var/data/users' }) }
 *
 *   async findById(id: string): Promise<User> {
 *     const text = await this.read(`${id}.json`)
 *     return JSON.parse(text) as User
 *   }
 *
 *   async save(user: User): Promise<void> {
 *     await this.write(`${user.id}.json`, JSON.stringify(user))
 *   }
 * }
 * ```
 */
export abstract class FileRepository extends Repository<FileRepoState> {
  constructor(options: FileOptions = {}) {
    super({
      rootPath: options.rootPath ?? process.cwd(),
      openWatchers: new Set(),
      openTempFiles: new Set(),
    })
  }

  override async init(): Promise<void> {}

  override async terminate(): Promise<void> {
    // Close every still-active watcher.
    for (const w of [...this.state.openWatchers]) {
      try { await w.close() } catch { /* swallow on shutdown */ }
    }
    // Delete every still-open temp file.
    for (const t of [...this.state.openTempFiles]) {
      try { await t.close() } catch { /* swallow on shutdown */ }
    }
  }

  // ─── Path resolution ──────────────────────────────────────

  /**
   * Resolve a path against `rootPath`. Absolute paths are returned
   * unchanged (with separators normalised); relative paths are joined
   * to the root.
   */
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
      return await fsp.readFile(abs, 'utf-8')
    } catch (err) {
      throw this.translateError(err, abs)
    }
  }

  /** Read a file as raw bytes. */
  async readBytes(path: string): Promise<Uint8Array> {
    const abs = this.resolve(path)
    try {
      const buf = await fsp.readFile(abs)
      return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength)
    } catch (err) {
      throw this.translateError(err, abs)
    }
  }

  /**
   * Write `content` to `path`, overwriting any existing file.
   * Parent directories must already exist; use `mkdir` first if not.
   */
  async write(path: string, content: string | Uint8Array): Promise<void> {
    const abs = this.resolve(path)
    try {
      await fsp.writeFile(abs, content)
    } catch (err) {
      throw this.translateError(err, abs)
    }
  }

  /** Append `content` to the end of `path` (creating it if absent). */
  async append(path: string, content: string | Uint8Array): Promise<void> {
    const abs = this.resolve(path)
    try {
      await fsp.appendFile(abs, content)
    } catch (err) {
      throw this.translateError(err, abs)
    }
  }

  /** Delete the file at `path`. Throws {@link FileNotFoundException} if absent. */
  async delete(path: string): Promise<void> {
    const abs = this.resolve(path)
    try {
      await fsp.unlink(abs)
    } catch (err) {
      throw this.translateError(err, abs)
    }
  }

  /** Whether the path exists (file, directory, link, anything). */
  async exists(path: string): Promise<boolean> {
    const abs = this.resolve(path)
    try {
      await fsp.access(abs)
      return true
    } catch {
      return false
    }
  }

  /** Stat `path`. Throws {@link FileNotFoundException} if absent. */
  async stat(path: string): Promise<FileStat> {
    const abs = this.resolve(path)
    try {
      const s = await fsp.lstat(abs)
      return {
        path: abs,
        size: s.size,
        modifiedAt: s.mtime,
        createdAt: s.birthtime ?? s.mtime,
        isFile: s.isFile(),
        isDirectory: s.isDirectory(),
        isSymlink: s.isSymbolicLink(),
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
      const entries = await fsp.readdir(abs, { withFileTypes: true })
      const out: FileEntry[] = []
      for (const e of entries) {
        const full = PathUtils.join(abs, e.name)
        out.push({
          path: full,
          relativePath: e.name,
          name: e.name,
          isFile: e.isFile(),
          isDirectory: e.isDirectory(),
          isSymlink: e.isSymbolicLink(),
        })
      }
      out.sort((a, b) => a.name.localeCompare(b.name))
      return out
    } catch (err) {
      throw this.translateError(err, abs)
    }
  }

  /**
   * Walk a directory recursively. Returns every regular file and
   * directory under `path`. `relativePath` is computed relative to
   * the walk root.
   */
  async walk(path: string): Promise<FileEntry[]> {
    const root = this.resolve(path)
    const out: FileEntry[] = []
    await this.walkInto(root, root, out)
    out.sort((a, b) => a.relativePath.localeCompare(b.relativePath))
    return out
  }

  private async walkInto(current: string, root: string, out: FileEntry[]): Promise<void> {
    let entries
    try {
      entries = await fsp.readdir(current, { withFileTypes: true })
    } catch (err) {
      throw this.translateError(err, current)
    }
    for (const e of entries) {
      const full = PathUtils.join(current, e.name)
      const rel = posix.relative(root, full)
      out.push({
        path: full,
        relativePath: rel,
        name: e.name,
        isFile: e.isFile(),
        isDirectory: e.isDirectory(),
        isSymlink: e.isSymbolicLink(),
      })
      if (e.isDirectory()) await this.walkInto(full, root, out)
    }
  }

  /** Create a directory. `recursive` creates intermediate parents. */
  async mkdir(path: string, options: { recursive?: boolean } = {}): Promise<void> {
    const abs = this.resolve(path)
    try {
      await fsp.mkdir(abs, { recursive: options.recursive ?? false })
    } catch (err) {
      throw this.translateError(err, abs)
    }
  }

  /**
   * Remove a directory. By default the directory must be empty;
   * pass `{ recursive: true }` to delete contents too.
   */
  async rmdir(path: string, options: { recursive?: boolean } = {}): Promise<void> {
    const abs = this.resolve(path)
    try {
      if (options.recursive === true) {
        await fsp.rm(abs, { recursive: true, force: true })
      } else {
        await fsp.rmdir(abs)
      }
    } catch (err) {
      throw this.translateError(err, abs)
    }
  }

  // ─── Streaming ────────────────────────────────────────────

  /**
   * Open a streaming reader for `path` as a Web `ReadableStream`.
   * Useful for large files (> a few MB) where buffering the whole
   * content in memory is wasteful.
   */
  readStream(path: string): ReadableStream<Uint8Array> {
    const abs = this.resolve(path)
    const node = createReadStream(abs)
    return Readable.toWeb(node) as ReadableStream<Uint8Array>
  }

  /**
   * Open a streaming writer for `path` as a Web `WritableStream`.
   * Overwrites any existing content.
   */
  writeStream(path: string): WritableStream<Uint8Array> {
    const abs = this.resolve(path)
    const node = createWriteStream(abs)
    return Writable.toWeb(node) as WritableStream<Uint8Array>
  }

  // ─── Watching ─────────────────────────────────────────────

  /**
   * Watch a file or directory for changes. `callback` is invoked
   * synchronously by the OS for each event. Recursive watches are
   * supported only on macOS and Windows; on Linux, recursive emulation
   * is not built in (callers can stack multiple watchers).
   */
  async watch(path: string, callback: (event: WatchEvent) => void): Promise<Watcher> {
    const abs = this.resolve(path)
    if (!(await this.exists(abs))) throw new FileNotFoundException(abs)
    const watcher = new WatcherImpl(abs, callback, this.state.openWatchers)
    this.state.openWatchers.add(watcher)
    return watcher
  }

  // ─── Temp files ───────────────────────────────────────────

  /**
   * Create a unique temporary file under the OS temp directory. The
   * file exists empty on disk; callers write/read it via `read()` /
   * `write()` passing `tempFile.path`. Closing the returned handle
   * deletes the file. `terminate()` closes all outstanding handles.
   */
  async tempFile(prefix = 'xf-fs-'): Promise<TempFile> {
    const name = `${prefix}${randomBytes(8).toString('hex')}`
    const abs = posix.join(tmpdir().replace(/\\/g, '/'), name)
    await fsp.writeFile(abs, '')
    const handle = new TempFileImpl(abs, this.state.openTempFiles)
    this.state.openTempFiles.add(handle)
    return handle
  }

  // ─── Error translation ────────────────────────────────────

  /**
   * Translate a `node:fs` error into a typed Exception component when
   * the error code is one of the modelled cases; otherwise return the
   * error unchanged for plain propagation.
   */
  protected translateError(err: unknown, path: string): unknown {
    if (typeof err !== 'object' || err === null) return err
    const code = (err as { code?: string }).code
    if (code === 'ENOENT') return new FileNotFoundException(path)
    if (code === 'EACCES' || code === 'EPERM') return new FileAccessDeniedException(path)
    if (code === 'ENOTEMPTY') return new DirectoryNotEmptyException(path)
    return err
  }
}

// ─── Concrete Transfer implementations ───────────────────────

class WatcherImpl implements Watcher {
  readonly path: string
  private handle: ReturnType<typeof fsWatch> | undefined
  private active = true
  private readonly registry: Set<WatcherImpl>

  constructor(path: string, callback: (event: WatchEvent) => void, registry: Set<WatcherImpl>) {
    this.path = path
    this.registry = registry
    this.handle = fsWatch(path, { recursive: process.platform !== 'linux' }, (eventType, filename) => {
      const childPath = filename === null ? path : posix.join(path.replace(/\\/g, '/'), filename.toString())
      const kind = eventType === 'rename' ? 'renamed' : 'modified'
      callback({ path: childPath, kind })
    })
  }

  get isActive(): boolean { return this.active }

  async close(): Promise<void> {
    if (!this.active) return
    this.active = false
    this.registry.delete(this)
    this.handle?.close()
    this.handle = undefined
  }
}

class TempFileImpl implements TempFile {
  readonly path: string
  private open = true
  private readonly registry: Set<TempFileImpl>

  constructor(path: string, registry: Set<TempFileImpl>) {
    this.path = path
    this.registry = registry
  }

  get isOpen(): boolean { return this.open }

  async close(): Promise<void> {
    if (!this.open) return
    this.open = false
    this.registry.delete(this)
    try { await fsp.unlink(this.path) } catch { /* already gone */ }
  }
}
