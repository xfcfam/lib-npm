# Releasing

This monorepo publishes every package in [`packages/`](./packages) **independently**
to npm under the [`@xfcfam`](https://www.npmjs.com/org/xfcfam) scope. Versioning and
publishing are driven by [Changesets](https://github.com/changesets/changesets) and a
GitHub Actions workflow ([`.github/workflows/release.yml`](./.github/workflows/release.yml)).

The model is **"the community proposes, the maintainer releases."** Anyone may open a
pull request that includes a changeset; only the maintainer (@isramatrix) can merge it to
`main`. **Merging the PR is the release** — the workflow versions and publishes to npm in
the same run. No version reaches npm without the maintainer merging.

---

## Roles

| Role | May do |
|---|---|
| **Contributor** (anyone) | Open PRs, include a changeset describing the bump. |
| **Maintainer** (@isramatrix) | Review + merge PRs to `main`. The merge triggers the automatic version-bump + publish — so **merging is releasing**. |

`main` is protected: no direct pushes, PRs require maintainer review (enforced by
[CODEOWNERS](./.github/CODEOWNERS)). Therefore no version reaches npm without the
maintainer explicitly merging it.

---

## Branching model

Trunk-based. `main` is always releasable.

```
main ──●───────────────●───────────────────●────────────▶
        \             / \                 /
         ●──●──●─────┘   ●──●────────────┘
         feature PR       feature PR (+ changeset)
         (+ changeset)    → merge auto-versions & publishes to npm
```

- **Feature / fix branches** — `feat/…`, `fix/…`, `docs/…`. One logical change per PR.
- **No release branches, no *Version Packages* PR.** Merging a PR that carries a changeset
  publishes immediately; the workflow commits the version bump back to `main` as
  `chore(release): version packages [skip ci]`.
- **Tags** are created automatically, one per published package and version
  (e.g. `@xfcfam/xf-rest@0.2.0`).

---

## The release loop

### 1 · Contributor: make a change + add a changeset

```bash
git checkout -b feat/retry-jitter
# … edit code, add/adjust tests …
pnpm changeset
```

`pnpm changeset` asks:

1. **Which packages changed** (space to select).
2. **Bump type** for each, following [semver](https://semver.org):
   - `patch` — bug fix, no API change.
   - `minor` — backward-compatible feature.
   - `major` — breaking change.
3. **A one-line summary** — this becomes the CHANGELOG entry. Write it for *consumers*.

This writes a file under `.changeset/` (e.g. `.changeset/tidy-otters-jump.md`). **Commit it
with your PR.** A behavioural PR without a changeset is incomplete; a docs/CI-only PR that
changes no published code does not need one.

> Rule of thumb: if `npm install @xfcfam/<pkg>` would deliver different bytes, it needs a
> changeset.

### 2 · Maintainer: review + merge the PR to `main`

CI ([`ci.yml`](./.github/workflows/ci.yml)) must be green — typecheck + tests + build on
Node 20 and 22. The maintainer reviews and merges. **Merging is the release.**

### 3 · The workflow versions + publishes (automatic)

On the push to `main`, `release.yml` sees the pending changeset and, in one run:

- runs `changeset version` — bumps each affected `package.json`, moves changeset
  summaries into each `CHANGELOG.md`, bumps internal `@xfcfam/*` dependents
  (`updateInternalDependencies: patch`), and deletes the consumed `.changeset/*.md`;
- commits that bump back to `main` as `chore(release): version packages [skip ci]`
  (the `[skip ci]` stops it re-triggering the workflow);
- builds, then runs `changeset publish` — publishes every package whose version is ahead
  of npm under the `@xfcfam` scope, and creates a git tag per published package.

A PR with **no** changeset (docs/CI-only) merges normally and publishes nothing.

---

## Versioning policy

- **Independent versioning.** Each package carries its own version; a patch to
  `@xfcfam/xf-sql-postgres` does not bump `@xfcfam/xf`. (Config: `fixed: []`, `linked: []`.)
- If you ever want the whole suite to move as one version, add the packages to `fixed`
  in [`.changeset/config.json`](./.changeset/config.json).
- `access: public` — scoped packages are published publicly.
- Pre-1.0 (`0.x`): treat `minor` as the breaking channel until you cut `1.0.0`.

---

## One-time setup (before the first release)

These are **account actions for the maintainer** — CI cannot do them:

1. **Create the npm org** `xfcfam` (npmjs.com → *Add organization*, free for public packages).
2. **Bootstrap the packages.** Trusted publishing is configured per *existing* package, so the
   very first publish (which creates each package on npm) is done with a token or `npm login`:

   ```bash
   npm login
   pnpm -r --filter './packages/*' build
   pnpm --filter './packages/*' publish --access public   # creates @xfcfam/* @ 0.1.0
   ```

3. **Switch to trusted publishing (OIDC) — no token after this.** On npmjs.com, for *each*
   package: *Settings → Trusted Publisher → GitHub Actions* → Organization `xfcfam`,
   Repository `lib-npm`, Workflow `release.yml`, **Environment** `release`. Then *Settings →
   Publishing access → **Require two-factor authentication and disallow tokens*** and revoke the
   bootstrap token. (Needs npm ≥ 11.5.1 / Node ≥ 22.14 — the workflow upgrades npm for you.
   Provenance is generated automatically for public repo + public package.)
4. **Create a push token** so the workflow can commit the version bump to protected `main`:
   a fine-grained PAT scoped to this repo with **Contents: Read and write** (or a GitHub App
   token). Add it as secret **`RELEASE_TOKEN`**. (Git only — npm uses OIDC.)
5. **Create the `release` environment** (*Settings → Environments → New environment* → `release`):
   set **Deployment branches → Selected branches → `main`**, and add **no required reviewers**.
   This pins publishing to `main` at the npm/OIDC layer too, without adding an approval gate —
   it stays full-auto.
6. **Protect `main`** so every change goes through a PR, but with **no approval requirement**
   (as the sole maintainer you can't approve your own PR, so an approval gate would block you):
   require a pull request with **0 required approvals**, block force pushes and deletions, and
   leave **"Include administrators" off** so your `RELEASE_TOKEN` (admin) can land the version
   commit. You open + merge your own PRs unblocked; contributors at fork-level access can't merge.

After bootstrap, every release is fully automatic and tokenless on npm. To cut **`1.0.0`**
from `0.1.0`: open a PR with a `major` changeset and merge it — the workflow publishes on merge.

---

## Manual fallback (rarely needed)

If the action is unavailable, the maintainer can release locally with npm publish rights:

```bash
pnpm install
pnpm changeset version   # apply pending changesets → bump + CHANGELOGs
git add -A && git commit -m "chore: version packages"
pnpm release             # build + changeset publish
git push --follow-tags
```

---

## Quick reference

| I want to… | Do |
|---|---|
| Propose a change | PR + `pnpm changeset` |
| Release | Merge the PR — versioning + publish are automatic |
| See what a PR will release | Read its `.changeset/*.md` (packages + bump type) |
| Hold a release | Don't merge yet (or merge a PR with no changeset) |
| Release one package only | Only that package needs a changeset |
