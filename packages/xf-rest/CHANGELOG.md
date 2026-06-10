# `@xfcfam/xf-rest`

This changelog is maintained by [Changesets](https://github.com/changesets/changesets).
Do not edit manually — `pnpm version-packages` regenerates it from
the `.md` files in `.changeset/`.

## 0.1.0

Initial public release.

- `RestRepository` — Access Layer Generalization encapsulating
  [`ky`](https://github.com/sindresorhus/ky). Constructor
  `(baseUrl, options?)`. Methods `get` / `post` / `put` / `del` /
  `call`. Hooks `interceptor` / `onRequest` / `onResponse` / `onError`.
- `RetryRestRepository` — ready-to-use composition of
  `RestRepository` + `RetryableRepository` with a sensible default
  retry policy (5xx + 429 + `ConnectionException`).
- Transfer objects: `Request`, `RestException`, `ConnectionException`.
- Static utility classes:
  - `ParseUtils` — `JsonParser`, `TextParser`, `pickParser` for
    content-type routing with implementer-defined parsers (XML, CSV,
    custom) plugged in via `RestOptions.parsers`.
  - `ReviverUtils` — `isoDateReviver`, `composeRevivers`,
    `walkReviver` for post-parse tree transformations.
- Peer dependency on `@xfcfam/xf`.
