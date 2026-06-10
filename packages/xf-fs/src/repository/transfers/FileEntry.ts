/**
 * Access-layer Transfer — a single entry yielded by directory
 * traversal (`list` / `walk`). Captures path information and the
 * cheap stat fields available from the directory iteration; richer
 * metadata is fetched separately via {@link FileStat}.
 */
export interface FileEntry {
  /** Absolute path of the entry on disk. */
  path: string
  /** Path relative to the walk's root, with `/` separators. */
  relativePath: string
  /** Final segment of `path` (the filename or directory name). */
  name: string
  /** Whether the entry is a regular file. */
  isFile: boolean
  /** Whether the entry is a directory. */
  isDirectory: boolean
  /** Whether the entry is a symbolic link. */
  isSymlink: boolean
}
