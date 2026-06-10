import { FileRepository, type FileOptions } from './FileRepository.js'

/**
 * Generalization for Access Layer components that need an in-memory
 * cache over the local filesystem.
 *
 * Same protocol as {@link FileRepository} — every public method
 * preserves the parent's signature and semantics. This subclass adds
 * a cross-cutting **caching policy**: results of `read()` and
 * `readBytes()` are memoised in a per-instance map and served from
 * memory until the path is mutated via this Repository.
 *
 * **Coherence model: write-through.** Mutations performed through
 * this Repository (`write`, `append`, `delete`, `rmdir`) invalidate
 * the cache entry for the affected path. Mutations performed by
 * other processes (or by other `FileRepository` instances) are NOT
 * detected — callers in those scenarios should invoke
 * {@link clearCache} (or per-path {@link invalidateCache}) to force a
 * fresh read.
 *
 * **What's not cached:** `stat`, `list`, `walk`, `exists`, streams,
 * and `watch` always hit the filesystem. Caching directory listings
 * across mutations is a separate design decision and out of scope
 * for the v0 implementation.
 *
 * @example
 * ```ts
 * import { CachedFileRepository } from '@xfcfam/xf-fs'
 *
 * export class TemplatesFileRepository extends CachedFileRepository {
 *   constructor() { super({ rootPath: '/etc/app/templates' }) }
 *   loadTemplate(name: string) { return this.read(`${name}.tpl`) }
 * }
 * ```
 */
export abstract class CachedFileRepository extends FileRepository {
  private readonly textCache: Map<string, string>
  private readonly bytesCache: Map<string, Uint8Array>

  constructor(options: FileOptions = {}) {
    super(options)
    this.textCache = new Map()
    this.bytesCache = new Map()
  }

  override async terminate(): Promise<void> {
    this.textCache.clear()
    this.bytesCache.clear()
    await super.terminate()
  }

  override async read(path: string): Promise<string> {
    const abs = this.resolve(path)
    const cached = this.textCache.get(abs)
    if (cached !== undefined) return cached
    const content = await super.read(path)
    this.textCache.set(abs, content)
    return content
  }

  override async readBytes(path: string): Promise<Uint8Array> {
    const abs = this.resolve(path)
    const cached = this.bytesCache.get(abs)
    if (cached !== undefined) return cached
    const content = await super.readBytes(path)
    this.bytesCache.set(abs, content)
    return content
  }

  override async write(path: string, content: string | Uint8Array): Promise<void> {
    await super.write(path, content)
    this.invalidateCache(path)
  }

  override async append(path: string, content: string | Uint8Array): Promise<void> {
    await super.append(path, content)
    this.invalidateCache(path)
  }

  override async delete(path: string): Promise<void> {
    await super.delete(path)
    this.invalidateCache(path)
  }

  override async rmdir(path: string, options: { recursive?: boolean } = {}): Promise<void> {
    await super.rmdir(path, options)
    if (options.recursive === true) {
      // Recursive removal: drop every cache entry under this directory.
      const abs = this.resolve(path)
      const prefix = abs.endsWith('/') ? abs : `${abs}/`
      for (const k of this.textCache.keys())  if (k === abs || k.startsWith(prefix)) this.textCache.delete(k)
      for (const k of this.bytesCache.keys()) if (k === abs || k.startsWith(prefix)) this.bytesCache.delete(k)
    } else {
      this.invalidateCache(path)
    }
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
