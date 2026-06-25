# `@xfcfam/xf-rest`

## 0.2.0

### Minor Changes

- c58d392: Make the request body content-type agnostic. Previously every body was sent
  through `ky`'s `json` channel (JSON-serialized, `Content-Type: application/json`
  forced), so form-urlencoded, multipart, raw and streamed bodies were impossible
  — a `URLSearchParams` became `{}`.

  `RestRepository` now encodes the body based on its runtime type and the
  request's explicit `Content-Type`:

  - A plain object/array still defaults to JSON (unchanged, backward compatible).
  - A `URLSearchParams`, `FormData`, `Blob`, typed array, string or `ReadableStream`
    is sent verbatim through `ky`'s raw `body` channel; `fetch` infers the
    `Content-Type`.
  - An explicit `Content-Type` selects a serializer: built-in
    `application/x-www-form-urlencoded` (object/`URLSearchParams` → form) and
    `text/*`, or a user serializer registered in the new `RestOptions.serializers`
    map (the request-side mirror of `parsers`).

  Adds the `SerializeUtils` static utility (`FormSerializer`, `TextSerializer`,
  `JsonSerializer`, `isEncoded`, `pickSerializer`) and the `Serializer` type, both
  exported from the package root.

## 0.1.1

### Patch Changes

- f040a77: Upgrade `ky` to v2. The public `RestRepository` API is unchanged; the
  migration is internal: the client option `prefixUrl` was renamed to
  `prefix` (same slash-join semantics), and `HTTPError` body extraction now
  reads the pre-parsed `err.data` (ky v2 auto-consumes the response body, so
  `err.response` body methods no longer work). The configured `reviver` is
  still applied to error bodies.

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
