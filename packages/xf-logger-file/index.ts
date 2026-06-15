/**
 * `@xfcfam/xf-logger-file` — a rotating **file tree** for
 * `@xfcfam/xf-logger`.
 *
 * Plant {@link RotatingFileTreeBusiness} into `R.logger` to mirror logs to
 * a file with **size + daily rotation** and bounded retention. The rotation
 * *policy* is Business logic; the file *I/O* is delegated to an
 * `@xfcfam/xf-fs` `FileRepository`, so this package peer-depends on both
 * `@xfcfam/xf-logger` and `@xfcfam/xf-fs` (the console-only core needs
 * neither).
 *
 * See https://xfcfam.org for the full XF specification.
 */

// ── Business Generalization (file tree) ───────────────────
export { RotatingFileTreeBusiness } from './src/business/general/RotatingFileTreeBusiness.js'
export type { RotatingFileOptions } from './src/business/general/RotatingFileTreeBusiness.js'
