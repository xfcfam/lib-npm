/**
 * `@xfcfam/xf-reactnative-fs` — React Native filesystem Access Layer
 * Generalization for the XF Architecture Model (CFAM).
 *
 * The **React Native sibling of `@xfcfam/xf-fs`**: the same `FileRepository`
 * API and method surface (read / write / append / delete / stat / list /
 * walk / mkdir / rmdir / copy / move / tempFile, plus `Cached` and
 * `Audited` variants), backed by
 * [`@dr.pogodin/react-native-fs`](https://github.com/birdofpreyru/react-native-fs)
 * instead of `node:fs`. The Transfer types are re-exported (type-only)
 * from `@xfcfam/xf-fs`, so a `FileStat` is the *same* type on both — an
 * artefact can swap one package for the other per platform.
 *
 * Two operations are React Native **boundary cases** that throw:
 * `watch` (no native file watcher) and `readStream` / `writeStream` (no
 * WHATWG streams).
 *
 * **Native setup is the backend's, not ours.** This package is a thin XF
 * wrapper; installing and linking the native module (Android / iOS /
 * Windows, autolinking, `pod install`, permissions) is documented by
 * `@dr.pogodin/react-native-fs` — follow its README. See the package
 * README for the pointer.
 *
 * See https://xfcfam.org for the full XF specification.
 */

// ── Access Generalizations ────────────────────────────────
export { FileRepository } from './src/repository/general/FileRepository.js'
export type { FileOptions } from './src/repository/general/FileRepository.js'
export { CachedFileRepository } from './src/repository/general/CachedFileRepository.js'
export { AuditedFileRepository } from './src/repository/general/AuditedFileRepository.js'
export type { FileOperation } from './src/repository/general/AuditedFileRepository.js'

// ── Transfers — type-only re-export from @xfcfam/xf-fs ─────
// Shared type identity (erased at runtime, so no node:fs reaches the bundle).
export type {
  FileStat,
  FileEntry,
  Watcher,
  TempFile,
  WatchEvent,
  WatchEventKind,
} from '@xfcfam/xf-fs'

// ── Exceptions (React Native-local; same shape as @xfcfam/xf-fs) ──
export { FileNotFoundException } from './src/repository/transfers/FileNotFoundException.js'
export { FileAccessDeniedException } from './src/repository/transfers/FileAccessDeniedException.js'
export { DirectoryNotEmptyException } from './src/repository/transfers/DirectoryNotEmptyException.js'

// ── Utilities ─────────────────────────────────────────────
export { PathUtils } from './src/repository/utils/PathUtils.js'
export { EncodingUtils } from './src/repository/utils/EncodingUtils.js'
export type { Encoding } from './src/repository/utils/EncodingUtils.js'
export { DirectoryUtils } from './src/repository/utils/DirectoryUtils.js'
