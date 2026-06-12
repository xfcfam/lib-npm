import { BadRequestException } from '../../business/transfers/BadRequestException.js'

/**
 * Shape any schema must expose for `SchemaValidatorUtils` to use it. Modeled
 * directly on `zod`'s `.safeParse(value)` API but **not coupled to
 * zod** — any library that emits a result of shape
 * `{ success: boolean, data?, error? }` works (valibot, arktype with
 * adapter, hand-rolled validators, …).
 */
export interface Schema<T> {
  safeParse(value: unknown): SchemaParseResult<T>
}

export interface SchemaParseResult<T> {
  success: boolean
  data?: T
  error?: { issues?: readonly unknown[]; message?: string } | unknown
}

/**
 * Static utility — duck-typed validation helper. Drop-in for zod
 * users but doesn't drag zod into the package. Pure (no I/O).
 *
 * The intended usage is inside an HTTP handler:
 *
 * ```ts
 * const dto = SchemaValidatorUtils.parse(UserCreateSchema, req.body)
 * ```
 *
 * On validation failure, raises {@link BadRequestException} with the
 * schema's issue list in the response body. The server pipeline
 * translates that into a `400 Bad Request`.
 */
export class SchemaValidatorUtils {
  private constructor() {}

  /**
   * Validate `value` against `schema`. Returns the parsed value on
   * success; throws {@link BadRequestException} on failure.
   */
  static parse<T>(schema: Schema<T>, value: unknown): T {
    const result = schema.safeParse(value)
    if (result.success === true) {
      // `data` is guaranteed when `success`; non-null assertion is
      // safe because the schema contract requires it.
      return result.data as T
    }
    const issues = SchemaValidatorUtils.extractIssues(result.error)
    throw new BadRequestException('Validation failed', { errors: issues })
  }

  /**
   * Validate `value` and return `null` on failure instead of
   * throwing. Useful when the handler wants to branch on validity
   * rather than propagate.
   */
  static tryParse<T>(schema: Schema<T>, value: unknown): T | null {
    const result = schema.safeParse(value)
    return result.success === true ? (result.data as T) : null
  }

  private static extractIssues(err: unknown): readonly unknown[] {
    if (err === null || err === undefined) return []
    if (typeof err === 'object' && err !== null && 'issues' in err) {
      const issues = (err as { issues?: unknown }).issues
      if (Array.isArray(issues)) return issues
    }
    return [{ message: String((err as { message?: string }).message ?? err) }]
  }
}
