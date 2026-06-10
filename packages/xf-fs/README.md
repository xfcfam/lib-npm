# `@xfcfam/xf-fs`

Filesystem Access Layer Generalization for the **XF Architecture
Model** — encapsulates `node:fs` behind a coherent, XF-compliant API.

`xf-fs` is the canonical wrapper that lets an XF artefact talk to
the local filesystem without ever importing `node:fs` directly. It
follows the same shape as `@xfcfam/xf-rest` (HTTP protocol) and
`@xfcfam/xf-sql` (SQL protocol): one Generalization per protocol of
access, with cross-cutting variants for caching and audit.

## What it provides

| Component | Purpose |
| --- | --- |
| `FileRepository` | Generalization. Wraps `node:fs`: read/write/append/delete/exists/stat, list/walk, mkdir/rmdir, streaming, watch, temp files. Concrete components extend it for their domain. |
| `CachedFileRepository` | Same protocol; adds an in-memory cache for `read`/`readBytes` with write-through invalidation. |
| `AuditedFileRepository` | Same protocol; adds overridable `onRead` / `onWrite` / `onDelete` / `onError` / … hooks for audit logs, metrics, tracing. |
| `FileEntry`, `FileStat`, `WatchEvent`, `Watcher`, `TempFile` | Transfer objects modelling directory entries, metadata, change events, watch handles, and temp-file handles. |
| `FileNotFoundException`, `FileAccessDeniedException`, `DirectoryNotEmptyException` | Typed Exceptions for the three modelled failure modes. Other failures propagate as native `Error`. |
| `PathUtils`, `EncodingUtils` | Pure helpers — path manipulation (`join` / `normalize` / `relative` / …) and BOM-aware UTF-8 encoding. |

## Install

```bash
pnpm add @xfcfam/xf-fs @xfcfam/xf
```

`@xfcfam/xf` is a peer dependency.

## Quick start

```ts
import { FileRepository } from '@xfcfam/xf-fs'

interface User { id: string; name: string }

export class UsersFileRepository extends FileRepository {
  constructor() { super({ rootPath: '/var/data/users' }) }

  async findById(id: string): Promise<User> {
    const text = await this.read(`${id}.json`)
    return JSON.parse(text) as User
  }

  async save(user: User): Promise<void> {
    await this.write(`${user.id}.json`, JSON.stringify(user))
  }
}
```

Inject it into the artefact's Access Layer injection `R`:

```ts
import { UsersFileRepository } from './repository/logic/UsersFileRepository.js'

export class R {
  private constructor() {}
  static readonly usersFileRepository = new UsersFileRepository()
  static async init()      { await R.usersFileRepository.init() }
  static async terminate() { await R.usersFileRepository.terminate() }
}
```

## Generalizations by protocol, not by feature

xf-fs deliberately exposes **one** `FileRepository` covering the
entire local-filesystem protocol (read, write, list, watch, stream,
temp). Variants subclass `FileRepository` only when they add a
**cross-cutting policy** over the same protocol:

- `CachedFileRepository` adds *caching* (still the same protocol).
- `AuditedFileRepository` adds *observability* (still the same
  protocol).

Other protocols of access (S3, FTP, in-memory virtual FS) would land
in their own packages (`@xfcfam/xf-fs-s3`, `@xfcfam/xf-fs-memory`, …)
exposing their own `FileRepository` subclass — the consumer picks
the implementation that matches its environment, the API stays
uniform.

## Resource lifecycle

`Watcher` and `TempFile` are Transfers that wrap an OS handle. The
caller owns them and should call `.close()` when done. As a safety
net, `FileRepository.terminate()` closes every still-active watcher
and deletes every still-open temp file — so even a careless caller
won't leak handles on shutdown.

## Error model

Three filesystem errors are translated into typed XF Exceptions
because they have **clear domain meaning**:

- `FileNotFoundException` ← `ENOENT`
- `FileAccessDeniedException` ← `EACCES` / `EPERM`
- `DirectoryNotEmptyException` ← `ENOTEMPTY`

Anything else propagates as the native `Error` raised by `node:fs`.
This is consistent with the XF doctrine: native runtime exceptions
are well-formed transfer vehicles (like `String`, `Date`, `Promise`),
and a custom Exception is justified only when it represents a
concept of the artefact's domain.

## License

MIT.
