# 🧩 `@xfcfam/xf-reactnative-fs`

> The **React Native sibling of [`@xfcfam/xf-fs`](https://www.npmjs.com/package/@xfcfam/xf-fs)** —
> the same `FileRepository` API and Transfer types, backed by
> [`@dr.pogodin/react-native-fs`](https://github.com/birdofpreyru/react-native-fs)
> instead of `node:fs`. An artefact can swap one for the other per platform.

> [!IMPORTANT]
> **Native setup lives with the backend.** This package ships no native code —
> it's a thin XF wrapper. Follow the
> **[@dr.pogodin/react-native-fs README](https://github.com/birdofpreyru/react-native-fs)**
> for the Android / iOS / Windows install & linking (autolinking, `pod install`,
> Gradle, permissions), then add this package on top.

## 📦 Install

```bash
npm i @xfcfam/xf @xfcfam/xf-fs @xfcfam/xf-reactnative-fs @dr.pogodin/react-native-fs
```

## 🚀 Quick start

```ts
import { FileRepository, DirectoryUtils } from '@xfcfam/xf-reactnative-fs'

export class ProfilesFileRepository extends FileRepository {
  constructor() { super({ rootPath: DirectoryUtils.document }) } // RN has no cwd
  async load(id: string) { return JSON.parse(await this.read(`${id}.json`)) }
}
```

## 🧰 Exported Components

### Generalizations

| Component | Description |
|---|---|
| [`FileRepository`](./src/repository/general/FileRepository.ts) | The same surface as `@xfcfam/xf-fs`, over `@dr.pogodin/react-native-fs`. Transfer types (`FileStat`, `FileEntry`, …) are re-exported **type-only** from xf-fs. `watch` / `readStream` / `writeStream` are boundary cases that throw. |
| [`CachedFileRepository`](./src/repository/general/CachedFileRepository.ts) | Write-through in-memory cache over `read` / `readBytes`. |
| [`AuditedFileRepository`](./src/repository/general/AuditedFileRepository.ts) | Per-operation observability hooks. |

### Utilities

| Component | Description |
|---|---|
| [`DirectoryUtils`](./src/repository/utils/DirectoryUtils.ts) | Platform sandbox roots to anchor `rootPath`. |
| [`PathUtils`](./src/repository/utils/PathUtils.ts) | Pure POSIX path manipulation (no `node:path`). |
| [`EncodingUtils`](./src/repository/utils/EncodingUtils.ts) | UTF-8 + Base64 codecs (no `Buffer`). |

> [!WARNING]
> Two React Native **boundary cases** throw: **`watch`** (no native file watcher)
> and **`readStream` / `writeStream`** (no WHATWG streams). Binary content
> round-trips via Base64; `stat().isSymlink` is always `false`; `mkdir` is
> always recursive.

## 📚 Documentation

Full specification → **[xfcfam.org](https://xfcfam.org)**

## ⚖️ License

MIT
