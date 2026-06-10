/**
 * Canonical HTTP methods supported by the server. The union is closed:
 * exotic verbs (`CONNECT`, `TRACE`, `PROPFIND`, …) are intentionally
 * out of scope for v0 and can be added in extension packages.
 */
export type HttpMethod =
  | 'GET'
  | 'POST'
  | 'PUT'
  | 'PATCH'
  | 'DELETE'
  | 'HEAD'
  | 'OPTIONS'
