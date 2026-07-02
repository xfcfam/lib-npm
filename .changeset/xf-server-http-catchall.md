---
"@xfcfam/xf-server-http": minor
---

Support gateway / reverse-proxy / BFF use cases on `HttpServerBusiness`.

- **`request.path` / `request.method` now reflect the actual request**,
  not the registered route. Handlers on `:param` and wildcard (`/*`)
  routes now see the real URL path (`/users/42`, `/a/b/c`) instead of the
  pattern, and `request.method` is the real verb (so a GET route's
  auto-HEAD is seen as `HEAD`). Aligns the implementation with the
  documented "Resolved path (after route matching)". Route parameters
  remain available in `request.params`.
- **New `any(path, handler)`** — registers the same handler for every
  HTTP method (a catch-all). Combine with a wildcard path
  (`server.any('/*', handler)`) for a gateway/edge service that
  intercepts all verbs and routes by the real `request.path`.
