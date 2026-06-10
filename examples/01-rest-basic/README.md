# 01 · REST basic

A minimal end-to-end XF artefact that consumes `@xfcfam/xf` and
`@xfcfam/xf-rest`. It talks to the public test API
[`jsonplaceholder.typicode.com`](https://jsonplaceholder.typicode.com)
to fetch users — no auth, no setup, just `pnpm start`.

## Run it

From the monorepo root:

```bash
pnpm install
pnpm --filter @xfcfam-examples/01-rest-basic start
```

You should see the example fetch a user, print a domain-level summary,
then fetch all users and print a count.

## What this demonstrates

The full XF stack with the canonical three layers and three Injections:

```
src/
├── repository/                       (Access Layer)
│   ├── logic/remote/UsersRest.ts     ← extends RetryRestRepository
│   ├── structs/User.ts               ← Transfer object
│   └── R.ts                          ← Injection
├── business/                         (Business Layer)
│   ├── logic/UserBusiness.ts         ← extends Business<null>
│   └── B.ts                          ← Injection
├── api/                              (Interaction Layer)
│   ├── logic/service/UserService.ts  ← extends StatelessView
│   └── A.ts                          ← Injection
└── main.ts                           ← Bootstrap: R.init → B.init → A.init
```

### What each layer does

**Access Layer (`/repository`).** `UsersRest` extends
`RetryRestRepository` from `@xfcfam/xf-rest`. It knows about the REST
endpoint URLs and translates raw responses into the `User` Transfer
object. The default `shouldRetry` (5xx + 429 + ConnectionException)
applies automatically — no override needed.

**Business Layer (`/business`).** `UserBusiness` orchestrates the
Access Layer through the canonical pattern `R.usersRest.fetchUser(id)`.
It applies one trivial domain rule (a user "looks active" if their
email contains a dot) to show where rules live — never inside the
Repository.

**Interaction Layer (`/api`).** `UserService` is the entry point. It
extends `StatelessView` (the canonical generalization for services
without their own state) and calls into the Business Layer through
`B.userBusiness`.

**Injections (`R`, `B`, `A`).** Each layer's Injection is a static-only
class with a private constructor. It registers the layer's Logical
components and exposes the `init()` / `terminate()` lifecycle. They
follow the same convention as `R`/`B`/`A` from `@xfcfam/xf` itself.

**`main.ts`.** Initialises the three layers bottom-up, runs a couple
of demo operations, and shuts down top-down.

### Why not use `XF.init()` from `@xfcfam/xf`?

The exported `XF` class invokes the static `R.init()` / `B.init()` /
`A.init()` of the **library's** placeholders, which are no-ops. This
example defines its own `R`, `B`, `A` in its `/src` tree — those are
what we actually want to initialise. `main.ts` calls them directly.

If you prefer the `XF.init()` entrypoint, name your project's
injections the same way as the library's (`R`, `B`, `A` exported from
`@xfcfam/xf`) and use module augmentation. See the JSDoc of
`R`/`B`/`A` in `@xfcfam/xf` for the augmentation pattern.
