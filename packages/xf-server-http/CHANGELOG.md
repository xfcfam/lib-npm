# @xfcfam/xf-server-http

## 1.2.0

## 1.1.0

## 1.0.0

### Patch Changes

- Updated dependencies [80407e6]
  - @xfcfam/xf@1.0.0
  - @xfcfam/xf-server@1.0.0

## 0.2.0

### Minor Changes

- bf5600b: Support gateway / reverse-proxy / BFF use cases on `HttpServerBusiness`.

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

## 0.1.2

### Patch Changes

- Updated dependencies
  - @xfcfam/xf@0.3.0
  - @xfcfam/xf-server@1.0.0

## 0.1.1

### Patch Changes

- f040a77: Upgrade `@fastify/multipart` to v10. No code or API change — the
  `req.parts()` streaming contract this package relies on is unchanged in
  v10; the bump pulls in the latest multipart engine for consumers who opt
  into `multipart: true`.
