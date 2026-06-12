import { StatelessService } from './StatelessService.js'

/**
 * Generalization for Interaction Layer components that act as a cron
 * handler — work invoked from outside (the OS cron daemon, a cloud
 * scheduler, a job runner) on a fixed schedule.
 *
 * The Service declares its cron {@link schedule} (a standard cron
 * expression) and an optional human-readable {@link description}, then
 * implements {@link handle}. Parsing the expression and dispatching at
 * the right moment is the responsibility of the outer scheduler — this
 * Generalization is the entry-point contract, not a cron parser.
 *
 * Schedulers that actually interpret the expression typically live in
 * a dedicated package (e.g. `@xfcfam/xf-cron`); the Service itself
 * imports nothing runtime-specific.
 *
 * @example
 * ```ts
 * import { CronService } from '@xfcfam/xf'
 * import { B } from '../B.js'
 *
 * export class NightlyReportService extends CronService {
 *   readonly schedule = '0 2 * * *'              // 02:00 every day
 *   readonly description = 'Generate the nightly KPI report.'
 *
 *   async handle(): Promise<void> {
 *     await B.reportBusiness.generateNightly()
 *   }
 * }
 * ```
 */
export abstract class CronService extends StatelessService {
  /**
   * Cron expression describing when this handler should fire.
   * Standard 5- or 6-field format (`min hour dom month dow [year]`).
   * The outer scheduler is responsible for parsing and matching.
   */
  abstract readonly schedule: string

  /**
   * Optional human-readable description, shown in scheduler listings.
   */
  readonly description?: string

  /**
   * Execute the scheduled work. Invoked once per scheduled tick.
   *
   * @returns A promise that resolves when the work is complete.
   * @throws  Anything the work raises; the outer scheduler decides
   *          whether to log, retry, or alert.
   */
  abstract handle(): Promise<void>

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
