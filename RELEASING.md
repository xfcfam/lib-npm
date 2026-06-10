# Releasing

This monorepo publishes every package in [`packages/`](./packages) **independently**
to npm under the [`@xfcfam`](https://www.npmjs.com/org/xfcfam) scope. Versioning and
publishing are driven by [Changesets](https://github.com/changesets/changesets) and a
GitHub Actions workflow ([`.github/workflows/release.yml`](./.github/workflows/release.yml)).

The model is **"the community proposes, the maintainer releases."** Anyone may open a
pull request that includes a changeset; only the maintainer (@isramatrix) merges to
`main` and merges the automated *Version Packages* PR that actually cuts a release.

---

## Roles

| Role | May do |
|---|---|
| **Contributor** (anyone) | Open PRs, include a changeset describing the bump. |
| **Maintainer** (@isramatrix) | Review + merge PRs to `main`; review + merge the *Version Packages* PR (this is the act of releasing). |

`main` is protected: no direct pushes, PRs require maintainer review (enforced by
[CODEOWNERS](./.github/CODEOWNERS)). Therefore no version reaches npm without the
maintainer explicitly merging it.

---

## Branching model

Trunk-based. `main` is always releasable.

```
main ─────●──────────────●───────────────●─────────────▶
           \            / \             /
            ●──●──●────┘   ●──●────────┘
            feature PR      "Version Packages" PR (bot)
            (+ changeset)   (maintainer merges → publish)
```

- **Feature / fix branches** — `feat/…`, `fix/…`, `docs/…`. One logical change per PR.
- **No release branches.** Releases are cut from `main` by merging the bot's PR.
- **Tags** are created automatically by the release action, one per published package
  and version (e.g. `@xfcfam/xf-rest@0.2.0`).

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
Node 20 and 22. The maintainer reviews and merges. **Merging here does NOT publish.**

### 3 · The bot opens / updates the *Version Packages* PR

On every push to `main`, `release.yml` runs `changesets/action`. While unreleased
changesets exist, it opens (or refreshes) a PR titled **`chore: version packages`** that:

- bumps each affected `package.json` version,
- moves changeset summaries into each package's `CHANGELOG.md`,
- bumps internal `@xfcfam/*` dependents (`updateInternalDependencies: patch`),
- deletes the consumed `.changeset/*.md` files.

This PR accumulates every pending changeset. **Leave it open** until you want to release.

### 4 · Maintainer: merge the *Version Packages* PR → publish

When you merge it, `main` has no pending changesets, so `release.yml` instead runs
`pnpm release` (= `pnpm build && changeset publish`), which:

- publishes every package whose version is ahead of npm, to the `@xfcfam` scope,
- creates a GitHub Release + git tag per published package.

**Merging this PR is the release.** Only the maintainer does it.

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
2. **Create an npm automation token** (npm → *Access Tokens* → *Generate* → **Automation**).
   Automation tokens bypass 2FA, which is required for CI publishing.
3. **Add it as a GitHub secret**: repo → *Settings → Secrets and variables → Actions →
   New repository secret* → name **`NPM_TOKEN`**, value = the token.
4. **Protect `main`**: *Settings → Branches → Add rule* → require PR + require review +
   require status checks (`CI`) to pass.
5. (Optional) enable **npm provenance**: add `NPM_CONFIG_PROVENANCE: true` to the publish
   step's `env` for signed, traceable releases (works because the job already requests
   `id-token: write`).

To cut **`1.0.0`** from the current `0.1.0`: open a PR adding a `major` changeset for the
packages you want to release, merge it, then merge the resulting *Version Packages* PR.

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
| See what will be released | Read the open *Version Packages* PR |
| Release now | Merge the *Version Packages* PR |
| Hold a release | Leave that PR open; keep merging features into it |
| Release one package only | Only that package needs a changeset |
