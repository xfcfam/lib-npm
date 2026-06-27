---
"@xfcfam/xf-rest": minor
---

RestRepository now resolves the complete HttpResponse instead of only the body

The verb helpers (`get` / `post` / `put` / `del`) and `call()` now return the
full `HttpResponse` (`status` / `headers` / `body`) — the client-side
counterpart of `@xfcfam/xf-server-http`'s `HttpResponse`. `RestException`
additionally carries the response `headers`, and `Request` gains a `stream`
flag that delivers the body as a raw `ReadableStream<Uint8Array>` (no
buffering or parsing) for streaming downloads and Server-Sent Events.

Pre-1.0 breaking change: callers that consumed the previous return value as the
body must now read `res.body` (`RetryRestRepository` consumers likewise).
