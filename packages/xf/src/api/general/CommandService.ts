import { StatelessView } from './StatelessView.js'

/**
 * Generalization for Interaction Layer components that act as an
 * individual CLI command — `xftools validate`, `git commit`,
 * `kubectl get`, etc.
 *
 * The Service declares its invocation {@link name}, its
 * {@link description} (shown by `--help`), and implements
 * {@link execute}. Argument parsing is left to the subclass (or to an
 * outer dispatcher) — this Generalization is the unit-of-work
 * contract, not an argv parser.
 *
 * The CLI dispatcher (typically `A.cli` in the consumer artefact) is
 * responsible for reading `process.argv`, matching a command, and
 * calling the right `CommandService.execute(args)`. Dispatcher
 * implementations that touch `process` belong in a dedicated package
 * (e.g. `@xfcfam/xf-cli`); the Service itself imports nothing
 * runtime-specific.
 *
 * @example
 * ```ts
 * import { CommandService } from '@xfcfam/xf'
 * import { B } from '../B.js'
 *
 * export class ValidateService extends CommandService {
 *   readonly name = 'validate'
 *   readonly description = 'Validate an XF artefact at <path>.'
 *
 *   async execute(args: readonly string[]): Promise<number> {
 *     const path = args[0]
 *     if (path === undefined) { console.error('missing <path>'); return 64 }
 *     const report = await B.artefactBusiness.validate(path)
 *     console.log(report.summary)
 *     return report.ok ? 0 : 1
 *   }
 * }
 * ```
 */
export abstract class CommandService extends StatelessView {
  /**
   * The command's invocation name (e.g. `validate`, `init`).
   * The dispatcher matches `argv[2]` (or equivalent) against this name.
   */
  abstract readonly name: string

  /**
   * Short human-readable description, shown in `--help` listings.
   */
  abstract readonly description: string

  /**
   * Execute the command.
   *
   * @param args  Argument tokens AFTER the command name. For
   *              `xftools validate ./path --json`, `args` is
   *              `["./path", "--json"]`.
   * @returns     The process exit code. `0` on success, non-zero on
   *              failure (use Unix conventions: 64 for usage errors,
   *              etc.).
   */
  abstract execute(args: readonly string[]): Promise<number>

  /**
   * No-op. Override to add setup.
   *
   * @returns A resolved promise.
   */
  async init(): Promise<void> {}

  /**
   * No-op. Override to add teardown.
   *
   * @returns A resolved promise.
   */
  async terminate(): Promise<void> {}
}
