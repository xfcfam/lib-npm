# 🧩 `@xfcfam/xf-logger`

> Logging access point for the **XF Architecture Model (CFAM)** — a console-default
> logger with pluggable Business "trees" for multiplexing & rotation. **Zero dependencies.**

> [!NOTE]
> Logging is the textbook cross-cutting capability — every layer needs it, including
> Access. XF resolves exactly this case (§5.3): the logger lives in **Access**
> (`R.logger`), reached *downward* by Business/Interaction and *same-layer through the
> injection* by Access — **no upward dependency**.

## 📦 Install

```bash
npm i @xfcfam/xf @xfcfam/xf-logger
```

## 🚀 Quick start

```ts
import { LoggerRepository, LogLevelUtils, LogFormatUtils, type LogRecord } from '@xfcfam/xf-logger'

export class AppLoggerRepository extends LoggerRepository {
  protected override accepts(r: LogRecord) { return LogLevelUtils.gte(r.level, 'warn') } // policy
  protected override format(r: LogRecord)  { return LogFormatUtils.json(r) }             // homogenise
}
// R.logger.info('ready', { port: 8080 })   ·   from any layer
```

## 🧰 Exported Components

### Generalizations

| Component | Description |
|---|---|
| [`LoggerRepository`](./src/repository/general/LoggerRepository.ts) | `R.logger`, the access point. Builds a `LogRecord` at one of the six `LogLevel`s, writes the console default, then dispatches to every planted tree (a `LogHandler`). |
| [`LoggerBusiness`](./src/business/general/LoggerBusiness.ts) | Base *tree* — a planted handler carrying a sink's policy; plants itself into `R.logger` on `init`. |
| [`ConsoleTreeBusiness`](./src/business/general/ConsoleTreeBusiness.ts) | Built-in console tree (no deps). |

### Utilities

| Component | Description |
|---|---|
| [`LogFormatUtils`](./src/repository/utils/LogFormatUtils.ts) | Pure rendering of a `LogRecord` (text or NDJSON). |
| [`LogLevelUtils`](./src/repository/utils/LogLevelUtils.ts) | Pure level algebra. |

> [!TIP]
> The *policy* (multiplexing, rotation) lives in Business **trees** that plant
> themselves into `R.logger`; the *I/O* stays in Access. For rotating files, add
> [`@xfcfam/xf-logger-file`](https://www.npmjs.com/package/@xfcfam/xf-logger-file).

## 📚 Documentation

Full specification → **[xfcfam.org](https://xfcfam.org)** · [`examples/06-logger`](https://github.com/xfcfam/lib-npm/tree/main/examples/06-logger)

## ⚖️ License

MIT
