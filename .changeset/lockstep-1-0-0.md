---
"@xfcfam/xf": major
---

Adopt lockstep (fixed) versioning across the `@xfcfam/*` family and level the entire set to **1.0.0**.

From this release every published `@xfcfam/*` package shares a single version and bumps together, so any given version number identifies a mutually-compatible set. This stabilises the public API at 1.0 and removes the 0.x peer-range cascade — at `^1`, a minor bump no longer forces a major bump on dependants. The internal `grpc` / `tcp` / `udp` sketches stay unversioned (`0.0.0`, private) until they graduate into the family.
