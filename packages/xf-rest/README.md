# `@xfcfam/xf-rest`

REST Access Layer Generalization for the **XF Architecture Model**.
Encapsulates the [`ky`](https://github.com/sindresorhus/ky) HTTP
client behind a single XF-canonical class and ships a ready-to-use
composition with retry semantics.

Peer-dependency on [`@xfcfam/xf`](https://www.npmjs.com/package/@xfcfam/xf).

## Install

```bash
pnpm add @xfcfam/xf @xfcfam/xf-rest
```

ESM-only, requires Node ≥ 20 (or modern browsers). TypeScript ≥ 5.4.

## What ships here

| Export | Role |
|---|---|
| `RestRepository` | Access Layer Generalization. Constructor `(baseUrl, options?)`. Methods: `get` / `post` / `put` / `del` / `call`. |
| `RetryRestRepository` | Ready-to-use `RestRepository` with built-in retry semantics (reimplements the canonical `RetryableRepository` policy). Comes with a sensible default `shouldRetry` (retry 5xx + 429 + `ConnectionException`; do **not** retry other 4xx). |
| `RestException` | Transfer object thrown on HTTP non-2xx. Carries `status`, `statusText`, parsed `body`, and the originating `request`. |
| `ConnectionException` | Transfer object thrown on transport-level failures. Carries `cause`, `request`, and `reason: 'timeout' \| 'network'`. |
| `Request` | Transfer object that describes a single call. Input of `call()`, exposed to `interceptor` / `onRequest`. |
| `RestOptions` | Configuration accepted at construction: `defaultHeaders`, `timeout`, `interceptor`, `onRequest` / `onResponse` / `onError`, `parsers`, `reviver`. |
| `ParseUtils` | Static utility class. Public surface: `pickParser(contentType, custom?)`, `JsonParser`, `TextParser`. Built-in routing handles `application/json`, `*+json` variants, and `text/*`. |
| `ReviverUtils` | Static utility class. Public surface: `isoDateReviver`, `composeRevivers(...revivers)`, `walkReviver(value, reviver)`. |

## Quick usage

```typescript
import { RetryRestRepository, ReviverUtils } from '@xfcfam/xf-rest'

interface User { id: number; name: string; email: string; createdAt: Date }

export class UsersRest extends RetryRestRepository {
  constructor() {
    super('https://api.example.com', {
      defaultHeaders: { Accept: 'application/json' },
      timeout: 10_000,
      reviver: ReviverUtils.isoDateReviver,    // ISO 8601 strings → Date
    })
  }
  async init()      { await super.init() }
  async terminate() { await super.terminate() }

  getUser(id: number) {
    return this.withRetry(() => this.get<User>(`/users/${id}`))
  }
}
```

Error handling at the Business Layer is type-driven:

```typescript
try {
  await R.usersRest.getUser(id)
} catch (err) {
  if (err instanceof RestException && err.status === 404) return null
  if (err instanceof ConnectionException) throw new DomainError('upstream unreachable')
  throw err   // anything else: bug, let it surface
}
```

## XML / CSV / custom content types

xf-rest does **not** bundle XML or CSV libraries to stay lean. Install
the parser of your choice and register it in `RestOptions.parsers`:

```typescript
import { XMLParser } from 'fast-xml-parser'
import Papa from 'papaparse'

const xml = new XMLParser()

class MyRest extends RetryRestRepository {
  constructor() {
    super('https://api.example.com', {
      parsers: {
        'application/xml': raw => xml.parse(raw),
        'text/xml':        raw => xml.parse(raw),
        'text/csv':        raw => Papa.parse(raw, { header: true }).data,
      },
    })
  }
}
```

The same parser pipeline is applied to the body of `RestException` —
a 4xx response with `application/xml` is parsed and revived just like
a successful 200.

## Default retry policy of `RetryRestRepository`

| Failure | Retried? |
|---|---|
| `RestException` with status ≥ 500 | yes |
| `RestException` status `429 Too Many Requests` | yes |
| `RestException` other 4xx (400, 401, 403, 404, …) | no |
| `ConnectionException` (timeout or network) | yes |
| Anything else (programming errors, unexpected throws) | no |

Override `shouldRetry` in your subclass to change the policy:

```typescript
class UsersRest extends RetryRestRepository {
  protected override shouldRetry(err: unknown): boolean {
    if (err instanceof RestException && err.status === 408) return true   // also retry 408
    return super.shouldRetry(err)                                          // default for the rest
  }
}
```

## Architectural placement

xf-rest contributes only to the **Access Layer**. The Generalizations
live in `repository/general/`; the Transfer objects (`Request`,
`RestException`, `ConnectionException`) in `repository/transfers/`; the
utility classes (`ParseUtils`, `ReviverUtils`) in `repository/utils/`.
The Business and Interaction layer folders exist as documented
placeholders only — xf-rest does not add behaviour there.

The Access Injection `R` is **not re-defined** by xf-rest: your
project wires its concrete `RestRepository` subclasses into the `R`
from [`@xfcfam/xf`](https://www.npmjs.com/package/@xfcfam/xf).

## Documentation

- Specification — [xfcfam.org](https://xfcfam.org)
- Source — [github.com/xfcfam/lib-npm](https://github.com/xfcfam/lib-npm)
- Examples — [`examples/01-rest-basic`](https://github.com/xfcfam/lib-npm/tree/main/examples/01-rest-basic) in the monorepo

## License

MIT.
