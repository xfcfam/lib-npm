# Contributing to `xfcfam/lib-npm`

Thanks for considering a contribution! This repository is the
TypeScript reference implementation of the **XF Architecture Model**
(CFAM). Quality, canonicity and small surface area matter more than
feature breadth.

## Quick start

```bash
git clone git@github.com:xfcfam/lib-npm.git
cd lib-npm
pnpm install
pnpm test          # vitest across every package
pnpm typecheck     # tsc --noEmit across every package
pnpm build         # produces dist/ for every package
```

You need Node ≥ 20 and pnpm ≥ 9.

## Repository layout

See the [main README](./README.md) for the bird's-eye view. The
short version: each package in `packages/` is a pnpm workspace
member, published independently to npm. Runnable demos live in
`examples/`.

The internal layout of every published package follows the canonical
XF folder structure (`src/<layer>/general|logic|transfers|utils/` …).
Please respect it when adding new files — see the existing source
for the precise placement rules.

## Code conventions

The library follows two non-negotiable rules that go beyond TypeScript
defaults. Both exist to keep the codebase aligned with the XF model
itself.

### Rule 1 — no behaviour at module scope

Everything that is **not a type / interface** must live inside a
class. This means:

- No `export function foo() { … }` at module level. Make it a static
  method on a `*Utils` class.
- No `export const bar = () => { … }`. Same — static method.
- No `const cache = new Map()` at module level. Move it inside the
  class as `private static readonly cache = new Map()`.

The only thing allowed at module scope is the class itself, plus
`type` and `interface` declarations.

### Rule 2 — per-instance state lives in static WeakMaps

Because of how `ComposableX.compose(...)` works, instance fields
declared in a class constructor are lost when that class is
composed with others. Generalizations whose behaviour depends on
per-instance state hold it in a **`private static readonly` WeakMap**
of the class, keyed by `this`, and initialise the entry in `init()`.

Look at `ObservableBusiness.ts` for the canonical pattern. Don't use
TS `private` instance fields or ECMAScript `#private` fields for
state that must survive composition.

### Style

- ESM everywhere. `"type": "module"` is set at every level.
- Strict TypeScript: `strict`, `exactOptionalPropertyTypes`,
  `noUncheckedIndexedAccess`, `noImplicitOverride`.
- JSDoc on every public symbol, in **English** (the audience is the
  worldwide community).
- Place internal helpers as `private` or `private static` methods.
- No `any` in public surface. Inside private helpers it is sometimes
  unavoidable (e.g. the dynamic prototype copying in `ComposableX`)
  and is fine when contained.

## Package READMEs

Every package's `README.md` follows the shared
[package README template](./.github/PACKAGE_README_TEMPLATE.md): a unified `🧩`
title, a one-line tagline, a positioning callout, and the `📦 Install` /
`🚀 Quick start` / `🧰 Exported Components` / `📚 Documentation` / `⚖️ License`
sections. Under *Exported Components*, list the published components in a table
**per XF type** (`Generalizations` / `Utilities`), each component **linked to its
source file** — which carries the JSDoc for every operation. Emojis go on the
title and the `##` headings only. Copy the skeleton from the template when you add
a package.

## Workflow

1. **Pick or open an issue.** For non-trivial changes, comment on the
   issue so we can align on direction before you start coding.
2. **Branch from `main`.** Name it descriptively
   (`feat/add-retryable-business`, `fix/observer-leak-on-terminate`).
3. **Implement + test.** Every change of behaviour needs a test in
   the relevant `packages/<pkg>/tests/` tree. Mirror the `src/`
   structure inside `tests/`.
4. **Run the full battery locally.**
   ```bash
   pnpm typecheck && pnpm test && pnpm build
   ```
5. **Add a changeset** (see below) describing what changed and at
   what level (patch / minor / major).
6. **Open a PR.** The PR template will walk you through what to fill
   in. CI runs on Node 20 and 22 — it must be green to merge.

### Commit messages

We follow [Conventional Commits](https://www.conventionalcommits.org)
loosely:

```
feat(xf-rest): add RetryRestRepository
fix(xf): observe should not throw before init
docs: clarify ComposableBusiness compose order
test(xf-rest): cover default shouldRetry matrix
chore: bump dev deps
```

The prefix isn't enforced, but it makes the changelog much easier
to scan. The scope in parentheses is the affected package
(`xf`, `xf-rest`, `examples`).

## Releases — Changesets

Every PR that changes public behaviour must include a **changeset**.
Run:

```bash
pnpm changeset
```

Pick the affected packages, select the bump level (patch / minor /
major) and write a one-line summary. The command produces a `.md`
file in `.changeset/` — commit it with the rest of your changes.

Maintainers consume the changesets at release time:

```bash
pnpm version-packages   # = changeset version
pnpm install            # update lockfile
pnpm release            # = changeset publish (after build)
```

Each package versions independently; `workspace:^` references update
automatically when a dependency bumps.

## Reporting bugs

Use the [Bug report issue template](./.github/ISSUE_TEMPLATE/bug_report.md).
Include the affected package, version, the minimal reproduction, and
the expected vs. actual behaviour. A failing test reproducing the
bug is the gold standard.

## Proposing features

Use the [Feature request template](./.github/ISSUE_TEMPLATE/feature_request.md).
Describe the use case and what the API would look like from the
consumer's side. We tend to favour additions that map cleanly onto
the XF model (a new Generalization in a layer's `base/`) over
additions that don't fit the matrix.

## Code of conduct

Be respectful, assume good intent, focus on the work. Disagreement on
technical direction is healthy; personal attacks are not.

## Questions

Open a [Discussion](https://github.com/xfcfam/lib-npm/discussions)
on GitHub or reach out via [xfcfam.org](https://xfcfam.org).
