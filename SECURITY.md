# Security Policy

## Supported versions

This repository is a pnpm monorepo that publishes the following npm
packages under the `@xfarch` scope:

- `@xfarch/xf` (core)
- `@xfarch/xf-rest`
- `@xfarch/xf-sql`
- `@xfarch/xf-sql-postgres`

Only the **latest major** of each package receives security fixes.
Older majors may receive a fix at the maintainers' discretion when the
underlying issue is severe.

| Package                  | Supported version |
| ------------------------ | ----------------- |
| `@xfarch/xf`             | latest major      |
| `@xfarch/xf-rest`        | latest major      |
| `@xfarch/xf-sql`         | latest major      |
| `@xfarch/xf-sql-postgres`| latest major      |

## Reporting a vulnerability

**Please do not file a public GitHub issue, discussion, or PR for
security reports.** Public reports give attackers a head start on every
downstream consumer.

Use one of:

1. **GitHub private vulnerability reporting** (preferred) — repository
   **Security** tab → **"Report a vulnerability"**.
2. **Email** — `security@xfarch.org` (PGP key on request).

Please include:

- Which package and version are affected.
- A minimal reproduction, ideally as a failing test case.
- The impact you've observed or believe to be possible.
- Any suggested mitigation.

We aim to:

- **Acknowledge** your report within **72 hours**.
- Provide an **initial assessment** within **7 days**.
- Coordinate a **disclosure date** before publishing the fix.
- **Credit you** in the GitHub Security Advisory and changelog unless
  you ask to remain anonymous.

## Scope

In scope:

- Anything published from `packages/*` to npm under `@xfarch/*`.
- Build, release, and publish workflows under `.github/workflows/`
  (where a compromise could yield malicious package versions).
- The `changesets` configuration and any release scripts.

Out of scope:

- Bugs that are not security-relevant — file those as normal issues.
- Issues that only affect unreleased branches or local development
  setups.
- Vulnerabilities in transitive dependencies for which an upstream fix
  is already available — please open a normal issue and we'll bump.

## Hardening checklist (maintainer-side)

For transparency, the project applies the following baseline:

- All releases are produced by GitHub Actions; no manual `npm publish`.
- The `NPM_TOKEN` secret is restricted to the **release** workflow.
- Dependabot is enabled (`.github/dependabot.yml`).
- `main` is protected: squash-only merges, linear history, required
  status checks.
- CODEOWNERS auto-requests review on every PR.
