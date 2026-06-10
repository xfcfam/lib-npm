# Changesets

This directory is managed by [Changesets](https://github.com/changesets/changesets).
Every pull request that changes the behaviour of a published package
must include a changeset.

## Adding a changeset

```bash
pnpm changeset
```

The CLI asks which packages changed and the bump level for each one
(`patch` / `minor` / `major`), then prompts for a one-line summary.
A markdown file lands in this directory — commit it with your code.

## Releasing (maintainers only)

```bash
pnpm version-packages   # consumes the changesets, bumps versions, updates CHANGELOGs
pnpm install            # refreshes the lockfile
pnpm release            # builds and publishes the bumped packages to npm
```

Examples in `examples/*` are excluded from versioning (see
`config.json`). The two libraries (`@xfcfam/xf` and `@xfcfam/xf-rest`)
version independently; cross-package `workspace:^` references update
automatically when a dependency bumps.

## Documentation

- Changesets — https://github.com/changesets/changesets
- Bump levels — https://semver.org
