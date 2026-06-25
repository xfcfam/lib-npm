---
"@xfcfam/xf-rest": minor
---

Make the request body content-type agnostic. Previously every body was sent
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
