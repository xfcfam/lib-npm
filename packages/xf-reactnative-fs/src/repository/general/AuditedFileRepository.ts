import { FileRepository } from './FileRepository.js'
import type { FileEntry, FileStat, Watcher, TempFile, WatchEvent } from '@xfcfam/xf-fs'
import { EncodingUtils } from '../utils/EncodingUtils.js'

/**
 * Canonical operations of a `FileRepository`, used as the discriminator
 * passed to {@link AuditedFileRepository.onError}.
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
  | 'copy'
  | 'move'
  | 'readStream'
  | 'writeStream'
  | 'watch'
  | 'tempFile'

/**
 * Access-Layer Generalization — observes every filesystem operation for
 * audit logs, metrics or tracing. The React Native sibling of
 * `@xfcfam/xf-fs`'s `AuditedFileRepository`: identical protocol and hook
 * surface. Hooks default to no-ops; override only the ones you need. They
 * may be async — the interceptor `await`s them.
 */
export abstract class AuditedFileRepository extends FileRepository {
  // ─── Hooks (overridable; defaults are no-ops) ─────────────

  /** Fired after a successful `read` with the resolved path and byte length. */
  protected async onRead(_path: string, _sizeBytes: number): Promise<void> {}
  /** Fired after a successful `readBytes` with the resolved path and byte length. */
  protected async onReadBytes(_path: string, _sizeBytes: number): Promise<void> {}
  /** Fired after a successful `write` with the resolved path and byte length. */
  protected async onWrite(_path: string, _sizeBytes: number): Promise<void> {}
  /** Fired after a successful `append` with the resolved path and byte length. */
  protected async onAppend(_path: string, _sizeBytes: number): Promise<void> {}
  /** Fired after a successful `delete` with the resolved path. */
  protected async onDelete(_path: string): Promise<void> {}
  /** Fired after `exists` with the resolved path and the boolean result. */
  protected async onExists(_path: string, _exists: boolean): Promise<void> {}
  /** Fired after a successful `stat` with the resolved path and the {@link FileStat}. */
  protected async onStat(_path: string, _stat: FileStat): Promise<void> {}
  /** Fired after a successful `list` with the resolved path and the entries. */
  protected async onList(_path: string, _entries: readonly FileEntry[]): Promise<void> {}
  /** Fired after a successful `walk` with the resolved path and the entries. */
  protected async onWalk(_path: string, _entries: readonly FileEntry[]): Promise<void> {}
  /** Fired after a successful `mkdir` with the resolved path and the recursive flag. */
  protected async onMkdir(_path: string, _recursive: boolean): Promise<void> {}
  /** Fired after a successful `rmdir` with the resolved path and the recursive flag. */
  protected async onRmdir(_path: string, _recursive: boolean): Promise<void> {}
  /** Fired after a successful `copy` with the resolved source and destination paths. */
  protected async onCopy(_src: string, _dest: string): Promise<void> {}
  /** Fired after a successful `move` with the resolved source and destination paths. */
  protected async onMove(_src: string, _dest: string): Promise<void> {}
  /** Fired after `readStream` opens, with the resolved path. */
  protected onReadStream(_path: string): void {}
  /** Fired after `writeStream` opens, with the resolved path. */
  protected onWriteStream(_path: string): void {}
  /** Fired after a successful `watch` with the resolved path and the {@link Watcher}. */
  protected async onWatch(_path: string, _watcher: Watcher): Promise<void> {}
  /** Fired after a successful `tempFile` with the created {@link TempFile} handle. */
  protected async onTempFile(_tempFile: TempFile): Promise<void> {}
  /** Fired when any operation fails, with the operation name, path, and error. */
  protected async onError(_operation: FileOperation, _path: string, _error: unknown): Promise<void> {}

  // ─── Intercepted operations ───────────────────────────────

  /** Read as text, firing {@link onRead} on success or {@link onError} on failure. */
  override async read(path: string): Promise<string> {
    try {
      const content = await super.read(path)
      await this.onRead(this.resolve(path), EncodingUtils.byteLength(content))
      return content
    } catch (err) {
      try {
        await this.onError('read', this.resolve(path), err)
      } catch { /* a throwing hook must not mask the original error */ }
      throw err
    }
  }

  /** Read as bytes, firing {@link onReadBytes} on success or {@link onError} on failure. */
  override async readBytes(path: string): Promise<Uint8Array> {
    try {
      const bytes = await super.readBytes(path)
      await this.onReadBytes(this.resolve(path), bytes.byteLength)
      return bytes
    } catch (err) {
      try {
        await this.onError('readBytes', this.resolve(path), err)
      } catch { /* a throwing hook must not mask the original error */ }
      throw err
    }
  }

  /** Write, firing {@link onWrite} on success or {@link onError} on failure. */
  override async write(path: string, content: string | Uint8Array): Promise<void> {
    try {
      await super.write(path, content)
      await this.onWrite(this.resolve(path), AuditedFileRepository.sizeOf(content))
    } catch (err) {
      try {
        await this.onError('write', this.resolve(path), err)
      } catch { /* a throwing hook must not mask the original error */ }
      throw err
    }
  }

  /** Append, firing {@link onAppend} on success or {@link onError} on failure. */
  override async append(path: string, content: string | Uint8Array): Promise<void> {
    try {
      await super.append(path, content)
      await this.onAppend(this.resolve(path), AuditedFileRepository.sizeOf(content))
    } catch (err) {
      try {
        await this.onError('append', this.resolve(path), err)
      } catch { /* a throwing hook must not mask the original error */ }
      throw err
    }
  }

  /** Delete, firing {@link onDelete} on success or {@link onError} on failure. */
  override async delete(path: string): Promise<void> {
    try {
      await super.delete(path)
      await this.onDelete(this.resolve(path))
    } catch (err) {
      try {
        await this.onError('delete', this.resolve(path), err)
      } catch { /* a throwing hook must not mask the original error */ }
      throw err
    }
  }

  /** Test existence, firing {@link onExists} with the result. */
  override async exists(path: string): Promise<boolean> {
    const result = await super.exists(path)
    await this.onExists(this.resolve(path), result)
    return result
  }

  /** Stat, firing {@link onStat} on success or {@link onError} on failure. */
  override async stat(path: string): Promise<FileStat> {
    try {
      const s = await super.stat(path)
      await this.onStat(s.path, s)
      return s
    } catch (err) {
      try {
        await this.onError('stat', this.resolve(path), err)
      } catch { /* a throwing hook must not mask the original error */ }
      throw err
    }
  }

  /** List a directory, firing {@link onList} on success or {@link onError} on failure. */
  override async list(path: string): Promise<FileEntry[]> {
    try {
      const entries = await super.list(path)
      await this.onList(this.resolve(path), entries)
      return entries
    } catch (err) {
      try {
        await this.onError('list', this.resolve(path), err)
      } catch { /* a throwing hook must not mask the original error */ }
      throw err
    }
  }

  /** Walk a directory tree, firing {@link onWalk} on success or {@link onError} on failure. */
  override async walk(path: string): Promise<FileEntry[]> {
    try {
      const entries = await super.walk(path)
      await this.onWalk(this.resolve(path), entries)
      return entries
    } catch (err) {
      try {
        await this.onError('walk', this.resolve(path), err)
      } catch { /* a throwing hook must not mask the original error */ }
      throw err
    }
  }

  /** Create a directory, firing {@link onMkdir} on success or {@link onError} on failure. */
  override async mkdir(path: string, options: { recursive?: boolean } = {}): Promise<void> {
    try {
      await super.mkdir(path, options)
      await this.onMkdir(this.resolve(path), options.recursive ?? false)
    } catch (err) {
      try {
        await this.onError('mkdir', this.resolve(path), err)
      } catch { /* a throwing hook must not mask the original error */ }
      throw err
    }
  }

  /** Remove a directory, firing {@link onRmdir} on success or {@link onError} on failure. */
  override async rmdir(path: string, options: { recursive?: boolean } = {}): Promise<void> {
    try {
      await super.rmdir(path, options)
      await this.onRmdir(this.resolve(path), options.recursive ?? false)
    } catch (err) {
      try {
        await this.onError('rmdir', this.resolve(path), err)
      } catch { /* a throwing hook must not mask the original error */ }
      throw err
    }
  }

  /** Copy, firing {@link onCopy} on success or {@link onError} on failure. */
  override async copy(src: string, dest: string): Promise<void> {
    try {
      await super.copy(src, dest)
      await this.onCopy(this.resolve(src), this.resolve(dest))
    } catch (err) {
      try {
        await this.onError('copy', this.resolve(src), err)
      } catch { /* a throwing hook must not mask the original error */ }
      throw err
    }
  }

  /** Move, firing {@link onMove} on success or {@link onError} on failure. */
  override async move(src: string, dest: string): Promise<void> {
    try {
      await super.move(src, dest)
      await this.onMove(this.resolve(src), this.resolve(dest))
    } catch (err) {
      try {
        await this.onError('move', this.resolve(src), err)
      } catch { /* a throwing hook must not mask the original error */ }
      throw err
    }
  }

  /** Open a read stream, firing {@link onReadStream}. */
  override readStream(path: string): ReadableStream<Uint8Array> {
    const stream = super.readStream(path)
    this.onReadStream(this.resolve(path))
    return stream
  }

  /** Open a write stream, firing {@link onWriteStream}. */
  override writeStream(path: string): WritableStream<Uint8Array> {
    const stream = super.writeStream(path)
    this.onWriteStream(this.resolve(path))
    return stream
  }

  /** Watch a path, firing {@link onWatch} on success or {@link onError} on failure. */
  override async watch(path: string, callback: (event: WatchEvent) => void): Promise<Watcher> {
    try {
      const watcher = await super.watch(path, callback)
      await this.onWatch(this.resolve(path), watcher)
      return watcher
    } catch (err) {
      try {
        await this.onError('watch', this.resolve(path), err)
      } catch { /* a throwing hook must not mask the original error */ }
      throw err
    }
  }

  /** Create a temp file, firing {@link onTempFile} on success or {@link onError} on failure. */
  override async tempFile(prefix?: string): Promise<TempFile> {
    try {
      const handle = await super.tempFile(prefix)
      await this.onTempFile(handle)
      return handle
    } catch (err) {
      try {
        await this.onError('tempFile', '', err)
      } catch { /* a throwing hook must not mask the original error */ }
      throw err
    }
  }

  private static sizeOf(content: string | Uint8Array): number {
    return typeof content === 'string' ? EncodingUtils.byteLength(content) : content.byteLength
  }
}
