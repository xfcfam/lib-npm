import { FileRepository, type FileOptions } from './FileRepository.js'

/**
 * Access-Layer Generalization — in-memory cache over the React Native
 * filesystem. The React Native sibling of `@xfcfam/xf-fs`'s
 * `CachedFileRepository`: identical protocol and **write-through**
 * coherence model (mutations made through this Repository invalidate the
 * affected entry; external mutations are not detected — call
 * {@link clearCache} then).
 *
 * `read` / `readBytes` are memoised; `stat`, `list`, `walk`, `exists` and
 * the boundary-case methods always hit the backend.
 */
export abstract class CachedFileRepository extends FileRepository {
  private readonly textCache: Map<string, string>
  private readonly bytesCache: Map<string, Uint8Array>

  constructor(options: FileOptions = {}) {
    super(options)
    this.textCache = new Map()
    this.bytesCache = new Map()
  }

  /** Clear both caches, then run the base teardown. */
  override async terminate(): Promise<void> {
    this.textCache.clear()
    this.bytesCache.clear()
    await super.terminate()
  }

  /** Read as text, serving a cached copy when available and memoising otherwise. */
  override async read(path: string): Promise<string> {
    const abs = this.resolve(path)
    const cached = this.textCache.get(abs)
    if (cached !== undefined) return cached
    const content = await super.read(path)
    this.textCache.set(abs, content)
    return content
  }

  /** Read as bytes, serving a cached copy when available and memoising otherwise. */
  override async readBytes(path: string): Promise<Uint8Array> {
    const abs = this.resolve(path)
    const cached = this.bytesCache.get(abs)
    if (cached !== undefined) return cached
    const content = await super.readBytes(path)
    this.bytesCache.set(abs, content)
    return content
  }

  /** Write, then invalidate the cache entry for the affected path. */
  override async write(path: string, content: string | Uint8Array): Promise<void> {
    await super.write(path, content)
    this.invalidateCache(path)
  }

  /** Append, then invalidate the cache entry for the affected path. */
  override async append(path: string, content: string | Uint8Array): Promise<void> {
    await super.append(path, content)
    this.invalidateCache(path)
  }

  /** Delete, then invalidate the cache entry for the affected path. */
  override async delete(path: string): Promise<void> {
    await super.delete(path)
    this.invalidateCache(path)
  }

  /** Remove a directory, then invalidate the affected cache entries. */
  override async rmdir(path: string, options: { recursive?: boolean } = {}): Promise<void> {
    await super.rmdir(path, options)
    if (options.recursive === true) {
      const abs = this.resolve(path)
      const prefix = abs.endsWith('/') ? abs : `${abs}/`
      for (const k of this.textCache.keys()) if (k === abs || k.startsWith(prefix)) this.textCache.delete(k)
      for (const k of this.bytesCache.keys()) if (k === abs || k.startsWith(prefix)) this.bytesCache.delete(k)
    } else {
      this.invalidateCache(path)
    }
  }

  /** Copy, then invalidate the cache entry for the destination path. */
  override async copy(src: string, dest: string): Promise<void> {
    await super.copy(src, dest)
    this.invalidateCache(dest)
  }

  /** Move, then invalidate the cache entries for source and destination. */
  override async move(src: string, dest: string): Promise<void> {
    await super.move(src, dest)
    this.invalidateCache(src)
    this.invalidateCache(dest)
  }

  /** Drop the cache entry for a single path. */
  protected invalidateCache(path: string): void {
    const abs = this.resolve(path)
    this.textCache.delete(abs)
    this.bytesCache.delete(abs)
  }

  /** Drop every cache entry. Use after external mutations. */
  protected clearCache(): void {
    this.textCache.clear()
    this.bytesCache.clear()
  }
}
