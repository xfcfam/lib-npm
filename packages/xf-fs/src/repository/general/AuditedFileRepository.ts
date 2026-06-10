import { FileRepository } from './FileRepository.js'
import type { FileEntry } from '../transfers/FileEntry.js'
import type { FileStat } from '../transfers/FileStat.js'
import type { Watcher } from '../transfers/Watcher.js'
import type { TempFile } from '../transfers/TempFile.js'
import type { WatchEvent } from '../transfers/WatchEvent.js'

/**
 * Canonical operations of a `FileRepository`, used as the discriminator
 * passed to the {@link AuditedFileRepository.onError} hook so a single
 * handler can branch on the operation that failed.
 */
export type FileOperation =
  | 'read'
  | 'readBytes'
  | 'write'
  | 'append'
  | 'delete'
  | 'exists'
  | 'stat'
  | 'list'
  | 'walk'
  | 'mkdir'
  | 'rmdir'
  | 'readStream'
  | 'writeStream'
  | 'watch'
  | 'tempFile'

/**
 * Generalization for Access Layer components that need to observe
 * every filesystem operation — for audit logs, metrics, security
 * tracing, or invalidation of higher-level caches.
 *
 * Same protocol as {@link FileRepository}; this subclass adds a
 * cross-cutting **observability policy**. Every public method is
 * intercepted: on success the matching `onX` hook is invoked with
 * the operation's path and result summary; on failure `onError` is
 * invoked with the operation name, path, and the (possibly
 * translated) error before it is re-thrown.
 *
 * Hooks default to no-ops. Subclasses override only the ones they
 * care about. They may be async — the interceptor `await`s them, so
 * a hook can hit a remote logger or block briefly without losing
 * events.
 *
 * @example
 * ```ts
 * import { AuditedFileRepository } from '@xfcfam/xf-fs'
 *
 * export class AuditedConfigRepository extends AuditedFileRepository {
 *   constructor() { super({ rootPath: '/etc/app' }) }
 *
 *   override async onWrite(path: string, sizeBytes: number) {
 *     await this.appendAuditLog(`WRITE ${path} ${sizeBytes}B`)
 *   }
 *   override async onError(op: FileOperation, path: string, err: unknown) {
 *     await this.appendAuditLog(`${op.toUpperCase()} FAIL ${path}: ${String(err)}`)
 *   }
 *
 *   private async appendAuditLog(line: string) {  ... }
 * }
 * ```
 */
export abstract class AuditedFileRepository extends FileRepository {
  // ─── Hooks (overridable; defaults are no-ops) ─────────────

  protected async onRead(_path: string, _sizeBytes: number): Promise<void> {}
  protected async onReadBytes(_path: string, _sizeBytes: number): Promise<void> {}
  protected async onWrite(_path: string, _sizeBytes: number): Promise<void> {}
  protected async onAppend(_path: string, _sizeBytes: number): Promise<void> {}
  protected async onDelete(_path: string): Promise<void> {}
  protected async onExists(_path: string, _exists: boolean): Promise<void> {}
  protected async onStat(_path: string, _stat: FileStat): Promise<void> {}
  protected async onList(_path: string, _entries: readonly FileEntry[]): Promise<void> {}
  protected async onWalk(_path: string, _entries: readonly FileEntry[]): Promise<void> {}
  protected async onMkdir(_path: string, _recursive: boolean): Promise<void> {}
  protected async onRmdir(_path: string, _recursive: boolean): Promise<void> {}
  protected onReadStream(_path: string): void {}
  protected onWriteStream(_path: string): void {}
  protected async onWatch(_path: string, _watcher: Watcher): Promise<void> {}
  protected async onTempFile(_tempFile: TempFile): Promise<void> {}
  protected async onError(_operation: FileOperation, _path: string, _error: unknown): Promise<void> {}

  // ─── Intercepted operations ───────────────────────────────

  override async read(path: string): Promise<string> {
    try {
      const content = await super.read(path)
      await this.onRead(this.resolve(path), Buffer.byteLength(content, 'utf-8'))
      return content
    } catch (err) {
      await this.onError('read', this.resolve(path), err)
      throw err
    }
  }

  override async readBytes(path: string): Promise<Uint8Array> {
    try {
      const bytes = await super.readBytes(path)
      await this.onReadBytes(this.resolve(path), bytes.byteLength)
      return bytes
    } catch (err) {
      await this.onError('readBytes', this.resolve(path), err)
      throw err
    }
  }

  override async write(path: string, content: string | Uint8Array): Promise<void> {
    try {
      await super.write(path, content)
      await this.onWrite(this.resolve(path), AuditedFileRepository.sizeOf(content))
    } catch (err) {
      await this.onError('write', this.resolve(path), err)
      throw err
    }
  }

  override async append(path: string, content: string | Uint8Array): Promise<void> {
    try {
      await super.append(path, content)
      await this.onAppend(this.resolve(path), AuditedFileRepository.sizeOf(content))
    } catch (err) {
      await this.onError('append', this.resolve(path), err)
      throw err
    }
  }

  override async delete(path: string): Promise<void> {
    try {
      await super.delete(path)
      await this.onDelete(this.resolve(path))
    } catch (err) {
      await this.onError('delete', this.resolve(path), err)
      throw err
    }
  }

  override async exists(path: string): Promise<boolean> {
    const result = await super.exists(path)
    await this.onExists(this.resolve(path), result)
    return result
  }

  override async stat(path: string): Promise<FileStat> {
    try {
      const s = await super.stat(path)
      await this.onStat(s.path, s)
      return s
    } catch (err) {
      await this.onError('stat', this.resolve(path), err)
      throw err
    }
  }

  override async list(path: string): Promise<FileEntry[]> {
    try {
      const entries = await super.list(path)
      await this.onList(this.resolve(path), entries)
      return entries
    } catch (err) {
      await this.onError('list', this.resolve(path), err)
      throw err
    }
  }

  override async walk(path: string): Promise<FileEntry[]> {
    try {
      const entries = await super.walk(path)
      await this.onWalk(this.resolve(path), entries)
      return entries
    } catch (err) {
      await this.onError('walk', this.resolve(path), err)
      throw err
    }
  }

  override async mkdir(path: string, options: { recursive?: boolean } = {}): Promise<void> {
    try {
      await super.mkdir(path, options)
      await this.onMkdir(this.resolve(path), options.recursive ?? false)
    } catch (err) {
      await this.onError('mkdir', this.resolve(path), err)
      throw err
    }
  }

  override async rmdir(path: string, options: { recursive?: boolean } = {}): Promise<void> {
    try {
      await super.rmdir(path, options)
      await this.onRmdir(this.resolve(path), options.recursive ?? false)
    } catch (err) {
      await this.onError('rmdir', this.resolve(path), err)
      throw err
    }
  }

  override readStream(path: string): ReadableStream<Uint8Array> {
    const stream = super.readStream(path)
    this.onReadStream(this.resolve(path))
    return stream
  }

  override writeStream(path: string): WritableStream<Uint8Array> {
    const stream = super.writeStream(path)
    this.onWriteStream(this.resolve(path))
    return stream
  }

  override async watch(path: string, callback: (event: WatchEvent) => void): Promise<Watcher> {
    try {
      const watcher = await super.watch(path, callback)
      await this.onWatch(this.resolve(path), watcher)
      return watcher
    } catch (err) {
      await this.onError('watch', this.resolve(path), err)
      throw err
    }
  }

  override async tempFile(prefix?: string): Promise<TempFile> {
    try {
      const handle = await super.tempFile(prefix)
      await this.onTempFile(handle)
      return handle
    } catch (err) {
      await this.onError('tempFile', '', err)
      throw err
    }
  }

  private static sizeOf(content: string | Uint8Array): number {
    return typeof content === 'string' ? Buffer.byteLength(content, 'utf-8') : content.byteLength
  }
}
