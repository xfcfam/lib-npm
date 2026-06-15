# `06-logger` — logging from every layer

A complete XF artefact demonstrating `@xfcfam/xf-logger` +
`@xfcfam/xf-logger-file`.

`R.logger` (an `AppLoggerRepository`) is the logging access point. It ships
a **console default** and two overridable *configuration operations* — a
JSON `format()` and an `info`-and-above `accepts()` policy. A **rotating
file tree** (`AppFileTreeBusiness`, planted into `R.logger`) mirrors every
record to `./logs/app-<date>.log`, rotating by size and day over an
`@xfcfam/xf-fs` `FileRepository`.

The point of the example: the **same `R.logger` is called from all three
layers**, with no directionality violation —

- **Interaction** — `GreeterService` → `R.logger` (descending, `A → R`),
- **Business** — `GreeterBusiness` → `R.logger` (descending, `B → R`),
- **Access** — `LogFileRepository.init()` → `R.logger` (same layer, through
  the injection, §5.7).

That last one is the subtle case: logging is the canonical cross-cutting
capability (§5.3), placed in an Access Logical reached through `R`, so even
Access components log by going *through the injection* rather than around it.

## Run

```bash
pnpm --filter @xfcfam-examples/06-logger start
```

Watch the output: every console line is JSON, warns/errors go to stderr,
the service's `debug` line never appears (dropped by the `info` policy),
and `./logs/` fills with rotated `app-<date>[.N].log` files.
