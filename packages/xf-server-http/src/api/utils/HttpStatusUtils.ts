/**
 * Static utility — canonical HTTP status code constants. Pure data,
 * no I/O. Use these instead of magic numbers in handlers and hooks:
 * `return { status: HttpStatusUtils.OK, body: ... }`.
 *
 * Only the codes the typical REST service emits are listed. Less
 * common codes (1xx informational, 3xx redirects beyond 301/302,
 * 5xx beyond 500/502/503/504) can be used as numeric literals when
 * needed — the response carries `status: number`, not an enum.
 */
export class HttpStatusUtils {
  private constructor() {}

  // ── 2xx Success ──
  static readonly OK = 200
  static readonly CREATED = 201
  static readonly ACCEPTED = 202
  static readonly NO_CONTENT = 204

  // ── 3xx Redirection ──
  static readonly MOVED_PERMANENTLY = 301
  static readonly FOUND = 302
  static readonly NOT_MODIFIED = 304

  // ── 4xx Client error ──
  static readonly BAD_REQUEST = 400
  static readonly UNAUTHORIZED = 401
  static readonly FORBIDDEN = 403
  static readonly NOT_FOUND = 404
  static readonly METHOD_NOT_ALLOWED = 405
  static readonly CONFLICT = 409
  static readonly GONE = 410
  static readonly UNSUPPORTED_MEDIA_TYPE = 415
  static readonly UNPROCESSABLE_ENTITY = 422
  static readonly TOO_MANY_REQUESTS = 429

  // ── 5xx Server error ──
  static readonly INTERNAL_SERVER_ERROR = 500
  static readonly NOT_IMPLEMENTED = 501
  static readonly BAD_GATEWAY = 502
  static readonly SERVICE_UNAVAILABLE = 503
  static readonly GATEWAY_TIMEOUT = 504
}
