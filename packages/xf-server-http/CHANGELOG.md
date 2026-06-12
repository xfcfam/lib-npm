# @xfcfam/xf-server-http

## 0.1.1

### Patch Changes

- f040a77: Upgrade `@fastify/multipart` to v10. No code or API change — the
  `req.parts()` streaming contract this package relies on is unchanged in
  v10; the bump pulls in the latest multipart engine for consumers who opt
  into `multipart: true`.
