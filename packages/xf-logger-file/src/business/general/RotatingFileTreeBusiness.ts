import type { FileRepository } from '@xfcfam/xf-fs'
import { LoggerBusiness, type LogRecord } from '@xfcfam/xf-logger'

/** Constructor options for a {@link RotatingFileTreeBusiness}. */
export interface RotatingFileOptions {
  /**
   * Base log path, e.g. `logs/app.log`. The active file interpolates the
   * date (and a size index) into the stem: `logs/app-2026-06-13.log`,
   * `logs/app-2026-06-13.1.log`, …
   */
  readonly path: string
  /** Rotate when the active file reaches this size in bytes. Default 10 MiB. */
  readonly maxBytes?: number
  /** Size-rotation files to retain per day (older ones are pruned). Default 5. */
  readonly maxFiles?: number
  /** Also start a fresh file when the calendar day changes. Default `true`. */
  readonly daily?: boolean
}

/** Operative rotation bookkeeping (no domain state). */
interface FileTreeState {
  /** Current calendar day, `YYYY-MM-DD`. Set in {@link RotatingFileTreeBusiness.init}. */
  day: string
  /** Current size-rotation index within the day (0 = base file). */
  index: number
}

/**
 * Business-Layer Generalization — a **rotating file tree** for
 * `@xfcfam/xf-logger`. Plants into `R.logger` and writes every accepted
 * record to a file, rotating by **size** and (optionally) **calendar
 * day**, retaining the last `maxFiles` size-files per day.
 *
 * The *policy* lives here, in Business: when to rotate, the dynamic
 * filename, the retention window. The *I/O* stays in Access — every
 * `append` / `stat` / `delete` / `exists` is delegated **downward** to an
 * `@xfcfam/xf-fs` `FileRepository` (Business → R descending), which is why
 * this package peer-depends on `@xfcfam/xf-fs` and the console-only core
 * does not.
 *
 * Rotation needs no `rename`: the active path is recomputed from the day
 * and a size index, so a full file is simply succeeded by the next index,
 * and the real size is read via `FileRepository.stat`.
 *
 * Extend it, wire {@link logger} to your `R.logger` and {@link file} to
 * your `@xfcfam/xf-fs` repository, and pass the path/options:
 *
 * @example
 * ```ts
 * export class AppFileTreeBusiness extends RotatingFileTreeBusiness {
 *   constructor() { super({ path: 'logs/app.log', maxBytes: 5_000_000, maxFiles: 7 }) }
 *   protected logger() { return R.logger }
 *   protected file()   { return R.logFile }   // an @xfcfam/xf-fs FileRepository
 *   protected override accepts(r: LogRecord) { return LogLevelUtils.gte(r.level, 'info') }
 * }
 * ```
 */
export abstract class RotatingFileTreeBusiness extends LoggerBusiness<FileTreeState> {
  /** Effective options with defaults applied. */
  protected readonly options: Required<RotatingFileOptions>

  constructor(options: RotatingFileOptions) {
    super({ day: '', index: 0 })
    this.options = {
      path: options.path,
      maxBytes: options.maxBytes ?? 10 * 1024 * 1024,
      maxFiles: options.maxFiles ?? 5,
      daily: options.daily ?? true,
    }
  }

  /**
   * The `@xfcfam/xf-fs` repository this tree writes through. Wire it to
   * your injection: `protected file() { return R.logFile }`.
   */
  protected abstract file(): FileRepository

  /** Seed the current day, then plant the tree into `R.logger`. */
  override async init(): Promise<void> {
    this.state.day = this.today()
    await super.init()
  }

  /** Append the formatted line to the active file. */
  protected write(line: string, _record: LogRecord): Promise<void> {
    return this.file().append(this.currentPath(), `${line}\n`)
  }

  /** Rotate when the day rolled over (if `daily`) or the active file is full. */
  protected override async shouldRotate(_record: LogRecord): Promise<boolean> {
    if (this.options.daily && this.state.day !== this.today()) {
      return true
    }
    const path = this.currentPath()
    if (!(await this.file().exists(path))) return false
    const { size } = await this.file().stat(path)
    return size >= this.options.maxBytes
  }

  /** Advance to the next file: a fresh day, or the next size index. */
  protected override async rotate(): Promise<void> {
    const today = this.today()
    if (this.options.daily && this.state.day !== today) {
      this.state.day = today
      this.state.index = 0
      return
    }
    this.state.index += 1
    await this.prune()
  }

  /** Absolute-ish path of the file currently being appended to. */
  protected currentPath(): string {
    return this.pathFor(this.state.day, this.state.index)
  }

  /**
   * The clock used for daily rotation. Override to inject a fixed clock in
   * tests, or a local-time clock if you prefer local calendar days.
   */
  protected now(): Date {
    return new Date()
  }

  // ─── Internals ─────────────────────────────────────────────

  /** Current calendar day as `YYYY-MM-DD` (UTC by default). */
  private today(): string {
    return this.now().toISOString().slice(0, 10)
  }

  /** Delete the size-file that just fell outside the `maxFiles` window. */
  private async prune(): Promise<void> {
    const dropped = this.state.index - this.options.maxFiles
    if (dropped < 0) return
    const old = this.pathFor(this.state.day, dropped)
    if (await this.file().exists(old)) await this.file().delete(old)
  }

  /** `stem-DAY[.index]ext` — `logs/app.log` → `logs/app-2026-06-13.1.log`. */
  private pathFor(day: string, index: number): string {
    const dot = this.options.path.lastIndexOf('.')
    const slash = this.options.path.lastIndexOf('/')
    const hasExt = dot > slash // a dot in the filename, not just in a dir
    const stem = hasExt ? this.options.path.slice(0, dot) : this.options.path
    const ext = hasExt ? this.options.path.slice(dot) : ''
    const suffix = index > 0 ? `.${index}` : ''
    return `${stem}-${day}${suffix}${ext}`
  }
}
