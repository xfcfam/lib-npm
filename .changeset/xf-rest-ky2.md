---
"@xfcfam/xf-rest": patch
---

Upgrade `ky` to v2. The public `RestRepository` API is unchanged; the
migration is internal: the client option `prefixUrl` was renamed to
`prefix` (same slash-join semantics), and `HTTPError` body extraction now
reads the pre-parsed `err.data` (ky v2 auto-consumes the response body, so
`err.response` body methods no longer work). The configured `reviver` is
still applied to error bodies.
