# 🧩 `@xfcfam/xf-logger-file`

> A rotating **file tree** for
> [`@xfcfam/xf-logger`](https://www.npmjs.com/package/@xfcfam/xf-logger) — mirrors
> every accepted record to a file, rotating by **size** and **day** with bounded
> retention.

> [!NOTE]
> The rotation *policy* is Business logic; the file *I/O* is delegated to an
> [`@xfcfam/xf-fs`](https://www.npmjs.com/package/@xfcfam/xf-fs) `FileRepository`
> (peer dependency) — it never re-implements `fs`. The console-only core needs neither.

## 📦 Install

```bash
npm i @xfcfam/xf @xfcfam/xf-logger @xfcfam/xf-fs @xfcfam/xf-logger-file
```

## 🚀 Quick start

```ts
import { RotatingFileTreeBusiness } from '@xfcfam/xf-logger-file'

export class AppFileTreeBusiness extends RotatingFileTreeBusiness {
  constructor() { super({ path: 'logs/app.log', maxBytes: 5_000_000, maxFiles: 7 }) }
  protected logger() { return R.logger }    // plants itself here
  protected file()   { return R.file }   // an @xfcfam/xf-fs FileRepository
}
```

## 🧰 Exported Components

### Generalizations

| Component | Description |
|---|---|
| [`RotatingFileTreeBusiness`](./src/business/general/RotatingFileTreeBusiness.ts) | A `LoggerBusiness` tree that mirrors every accepted record to a file, rotating by size + day (options below). Delegates I/O to an `@xfcfam/xf-fs` `FileRepository`. |

## ⚙️ Options

| Option | Default | Behaviour |
|---|---|---|
| `maxBytes` | 10 MiB | rotate when the active file reaches this size |
| `maxFiles` | 5 | size-rotation files retained per day (older pruned) |
| `daily` | `true` | also start a fresh file when the calendar day changes |

> [!TIP]
> Rotation needs **no `rename`** — the active path is recomputed from the day and a
> size index, the real size read via `stat()`. Writes are serialised per tree, so
> size checks stay ordered under a fast concurrent emit loop. Override `now()` to
> inject a clock.

## 📚 Documentation

Full specification → **[xfcfam.org](https://xfcfam.org)**

## ⚖️ License

MIT
