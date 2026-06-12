# Releasing

This monorepo publishes every package in [`packages/`](./packages) **independently**
to npm under the [`@xfcfam`](https://www.npmjs.com/org/xfcfam) scope. Versioning and
publishing are driven by [Changesets](https://github.com/changesets/changesets) and a
GitHub Actions workflow ([`.github/workflows/release.yml`](./.github/workflows/release.yml)).

The model is **"the community proposes, the maintainer releases."** Anyone may open a
pull request that includes a changeset; only the maintainer (@isramatrix) merges it. The
release is **token-free**: GitHub's built-in `GITHUB_TOKEN` opens the version PR, and npm
publishing uses **OIDC trusted publishing** — there is no long-lived npm token and no PAT
anywhere in the pipeline.

---

## Roles

| Role | May do |
|---|---|
| **Contributor** (anyone) | Open PRs, include a changeset describing the bump. |
| **Maintainer** (@isramatrix) | Review + merge PRs to `main`, then merge the auto-generated *Version Packages* PR — which is what publishes. |

`main` is protected by a branch ruleset: no direct pushes for non-admins, PRs required,
CI status checks must pass. The repository **admin** bypasses the ruleset, which is what
lets the maintainer land the version commit. No version reaches npm without the maintainer
merging the *Version Packages* PR.

---

## How it works: the two-hop Changesets flow

Publishing happens in **two merges**, both driven by `release.yml` (which runs on every
push to `main`):

```
 feature PR (+ changeset)          Version Packages PR (auto)
        │                                   │
        ▼  merge                            ▼  admin-merge
      main ──▶ release.yml ──▶ opens ──▶  main ──▶ release.yml ──▶ changeset publish
              (sees changeset)  the PR          (no changeset left)   └─ OIDC → npm
```

1. **Merge a PR that carries a changeset.** `release.yml` runs, sees the pending
   changeset, and (via `changesets/action`) opens or updates a **"Version Packages" PR**
   on the `changeset-release/main` branch — using the built-in `GITHUB_TOKEN`. This PR
   bumps each affected `package.json`, folds the changeset summaries into the
   `CHANGELOG.md` files, and deletes the consumed `.changeset/*.md`. **It publishes
   nothing yet.**
2. **Merge the *Version Packages* PR.** The maintainer reviews the proposed bumps, then
   **admin-merges** it (see the note below). That second push to `main` re-triggers
   `release.yml`; this time there are no pending changesets, so the action runs
   `changeset publish`, which publishes every package whose version is ahead of npm and
   creates a git tag per published package.

A PR with **no** changeset (docs/CI-only) merges normally and publishes nothing — the
first hop simply finds nothing to version.

> **Why admin-merge the Version PR?** It is opened by the Actions bot using
> `GITHUB_TOKEN`. By GitHub design, a bot push/PR made with `GITHUB_TOKEN` does **not**
> trigger further workflow runs, so the *Version Packages* PR never gets its own CI run —
> and `main` requires the `Test on Node 22.x` / `24.x` checks. The maintainer therefore
> merges it with `--admin` (the ruleset grants admin bypass). The content it carries was
> already validated by CI on the originating feature PR, so this is safe.

```bash
# After the Version Packages PR (#N) appears and looks right:
gh pr diff <N> | grep -E '^\+\+\+ |"version"'      # sanity-check the bumps
gh pr merge <N> --squash --admin --delete-branch   # second hop → publish
gh run watch $(gh run list --workflow release -L1 --json databaseId -q '.[0].databaseId')
```

---

## The release loop (contributor view)

### 1 · Make a change + add a changeset

```bash
git checkout -b feat/retry-jitter
# … edit code, add/adjust tests …
pnpm changeset
```

`pnpm changeset` asks which packages changed, the bump type for each
(`patch` / `minor` / `major`, per [semver](https://semver.org)), and a one-line summary
that becomes the CHANGELOG entry — write it for *consumers*. Commit the generated
`.changeset/*.md` with your PR.

> Rule of thumb: if `npm install @xfcfam/<pkg>` would deliver different bytes, it needs a
> changeset. Dev-only / CI-only / docs-only changes that don't alter a published package
> do not.

### 2 · Open the PR; CI must be green

CI ([`ci.yml`](./.github/workflows/ci.yml)) runs install → build → typecheck → tests on
**Node 22.x and 24.x**. Both checks are required by the `main` ruleset.

### 3 · Maintainer merges → the two-hop flow above runs

Merging the feature PR opens the *Version Packages* PR; merging that publishes via OIDC.

---

## Versioning policy

- **Independent versioning.** Each package carries its own version; a patch to
  `@xfcfam/xf-sql-postgres` does not bump `@xfcfam/xf`. (Config: `fixed: []`, `linked: []`.)
- **Internal dependents** are bumped a `patch` when an internal dependency they use is
  released (`updateInternalDependencies: "patch"`).
- **Peer dependents are not force-bumped in range.** `onlyUpdatePeerDependentsWhenOutOfRange:
  true` keeps an in-range internal peer bump (e.g. `xf-sql` patch) from cascading a major
  into its dependents (e.g. `xf-sql-postgres`).
- `access: public` — scoped packages are published publicly.
- Pre-1.0 (`0.x`): treat `minor` as the breaking channel until `1.0.0` is cut.

---

## One-time setup (token-free)

These are **account/repo actions for the maintainer** — CI cannot do them. The repo-side
steps are automated by [`gh-repo-setup.sh`](../../00-personal/scripts/gh-repo-setup.sh);
the npm-side steps are manual.

1. **Create the npm org** `xfcfam` (free for public packages).
2. **Bootstrap each new package once.** Trusted publishing is configured *per existing
   package*, so a brand-new package name cannot be created by an OIDC publish. The first
   publish is manual:

   ```bash
   npm login
   pnpm -r --filter './packages/*' build
   pnpm --filter <new-package> publish --access public
   ```

3. **Configure the Trusted Publisher (OIDC).** On npmjs.com, for *each* package:
   *Settings → Trusted Publisher → GitHub Actions* →
   Organization `xfcfam`, Repository `lib-npm`, Workflow `release.yml`,
   **Environment** `release`. After this, no npm token is ever needed; provenance
   attestations are generated automatically (public repo + public package).
4. **Create the `release` environment** (*Settings → Environments*): restrict
   **Deployment branches** to `main`, **no required reviewers** (keeps publishing
   full-auto, pinned to `main` at the OIDC layer).
5. **Allow Actions to open PRs.** *Settings → Actions → General → Workflow permissions* →
   enable **"Allow GitHub Actions to create and approve pull requests"** (org-level if the
   org blocks it) so the action can open the *Version Packages* PR.
6. **Protect `main`** with a branch ruleset: require a PR (0 approvals — a sole maintainer
   can't approve their own PR), require the `Test on Node 22.x` / `24.x` status checks,
   block force-push and deletion, and add **RepositoryRole admin** as a **bypass actor**
   so the maintainer can admin-merge the bot-created *Version Packages* PR.

There is **no `NPM_TOKEN` and no `RELEASE_TOKEN`.** npm auth is OIDC; the version PR uses
the built-in `GITHUB_TOKEN`; landing it uses the admin bypass.

---

## Manual fallback (rarely needed)

If the workflow is unavailable, the maintainer can release locally with npm publish rights
(requires `npm login`; OIDC only works from CI):

```bash
pnpm install
pnpm changeset version   # apply pending changesets → bumps + CHANGELOGs
git add -A && git commit -m "chore(release): version packages"
pnpm release             # build + changeset publish
git push --follow-tags
```

---

## Quick reference

| I want to… | Do |
|---|---|
| Propose a change | PR + `pnpm changeset` |
| Release | Merge the PR, then admin-merge the auto *Version Packages* PR |
| See what a PR will release | Read its `.changeset/*.md` (packages + bump type) |
| See what will publish | `gh pr diff <version-PR> \| grep '"version"'` |
| Hold a release | Don't merge the *Version Packages* PR yet |
| Release one package only | Only that package needs a changeset |
