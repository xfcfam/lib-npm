/**
 * Access-layer Transfer — metadata of a single file or directory.
 * Mirrors `node:fs` `Stats` but reduced to the surface XF artefacts
 * actually consume.
 */
export interface FileStat {
  /** Absolute path the stat was taken from. */
  path: string
  /** Size in bytes (0 for directories). */
  size: number
  /** Last modification time. */
  modifiedAt: Date
  /** Creation time. May equal `modifiedAt` on filesystems without birth time. */
  createdAt: Date
  /** Whether the entry is a regular file. */
  isFile: boolean
  /** Whether the entry is a directory. */
  isDirectory: boolean
  /** Whether the entry is a symbolic link. */
  isSymlink: boolean
  /** POSIX-style permission bits (e.g. `0o644`). */
  mode: number
}
