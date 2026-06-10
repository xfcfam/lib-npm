/**
 * `@xfcfam/xf-fs` — local-filesystem Access Layer Generalization for
 * the XF Architecture Model (CFAM).
 *
 * Exposes:
 *
 * - **{@link FileRepository}** — the canonical Generalization. Wraps
 *   `node:fs` and exposes a single coherent API over the local
 *   filesystem protocol: text & byte I/O, directory traversal,
 *   streaming reads/writes, change watching, and temp-file allocation.
 *   Concrete components extend it for their domain.
 *
 * - **{@link CachedFileRepository}** — same protocol; adds an
 *   in-memory cache over `read`/`readBytes` with write-through
 *   invalidation.
 *
 * - **{@link AuditedFileRepository}** — same protocol; adds
 *   overridable `onRead` / `onWrite` / `onError` / … hooks for audit
 *   logging, metrics, and tracing.
 *
 * - **Transfers**: {@link FileEntry}, {@link FileStat},
 *   {@link WatchEvent}, {@link Watcher}, {@link TempFile}.
 *
 * - **Exceptions**: {@link FileNotFoundException},
 *   {@link FileAccessDeniedException},
 *   {@link DirectoryNotEmptyException}.
 *
 * - **Utilities**: {@link PathUtils}, {@link EncodingUtils}.
 *
 * See https://xfcfam.org for the full XF specification.
 */

// ── Access ────────────────────────────────────────────────
export { FileRepository } from './src/repository/general/FileRepository.js'
export type { FileOptions } from './src/repository/general/FileRepository.js'
export { CachedFileRepository } from './src/repository/general/CachedFileRepository.js'
export { AuditedFileRepository } from './src/repository/general/AuditedFileRepository.js'
export type { FileOperation } from './src/repository/general/AuditedFileRepository.js'

// Transfers
export type { FileEntry } from './src/repository/transfers/FileEntry.js'
export type { FileStat } from './src/repository/transfers/FileStat.js'
export type { WatchEvent, WatchEventKind } from './src/repository/transfers/WatchEvent.js'
export type { Watcher } from './src/repository/transfers/Watcher.js'
export type { TempFile } from './src/repository/transfers/TempFile.js'

// Exceptions
export { FileNotFoundException } from './src/repository/transfers/FileNotFoundException.js'
export { FileAccessDeniedException } from './src/repository/transfers/FileAccessDeniedException.js'
export { DirectoryNotEmptyException } from './src/repository/transfers/DirectoryNotEmptyException.js'

// Utilities
export { PathUtils } from './src/repository/utils/PathUtils.js'
export { EncodingUtils } from './src/repository/utils/EncodingUtils.js'
export type { Encoding } from './src/repository/utils/EncodingUtils.js'
