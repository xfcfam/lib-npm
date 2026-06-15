# 🧩 `@xfcfam/xf-fs`

> Filesystem Access Generalization for the **XF Architecture Model** — `node:fs`
> behind one coherent, XF-compliant `FileRepository`.

> [!NOTE]
> For React Native, [`@xfcfam/xf-reactnative-fs`](https://www.npmjs.com/package/@xfcfam/xf-reactnative-fs)
> exposes the **same API** (and re-uses these Transfer types) over the device
> filesystem instead of `node:fs`.

## 📦 Install

```bash
npm i @xfcfam/xf @xfcfam/xf-fs
```

## 🚀 Quick start

```ts
import { FileRepository } from '@xfcfam/xf-fs'

export class UsersFileRepository extends FileRepository {
  constructor() { super({ rootPath: '/var/data/users' }) }
  async findById(id: string) { return JSON.parse(await this.read(`${id}.json`)) }
  async save(u: User) { await this.write(`${u.id}.json`, JSON.stringify(u)) }
}
```

## 🧰 Exported Components

### Generalizations

| Component | Description |
|---|---|
| [`FileRepository`](./src/repository/general/FileRepository.ts) | The whole local-filesystem protocol over `node:fs`. Returns `FileStat` / `FileEntry`, hands back `Watcher` / `TempFile` handles, and raises typed `FileNotFoundException` / `FileAccessDeniedException` / `DirectoryNotEmptyException`. |
| [`CachedFileRepository`](./src/repository/general/CachedFileRepository.ts) | Adds a write-through in-memory cache over `read` / `readBytes`. |
| [`AuditedFileRepository`](./src/repository/general/AuditedFileRepository.ts) | Adds an observability policy — every operation fires a hook. |

### Utilities

| Component | Description |
|---|---|
| [`PathUtils`](./src/repository/utils/PathUtils.ts) | Pure POSIX path manipulation. |
| [`EncodingUtils`](./src/repository/utils/EncodingUtils.ts) | BOM-aware UTF-8 encoding helpers. |

> [!TIP]
> Three filesystem errors become typed exceptions —
> `FileNotFoundException` ← `ENOENT`, `FileAccessDeniedException` ← `EACCES`/`EPERM`,
> `DirectoryNotEmptyException` ← `ENOTEMPTY`. Anything else propagates as native `Error`.

## 📚 Documentation

Full specification → **[xfcfam.org](https://xfcfam.org)**

## ⚖️ License

MIT
