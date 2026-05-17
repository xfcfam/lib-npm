<!--
Thank you for contributing! Fill in this template; remove sections
that don't apply.
-->

## Summary

<!-- One paragraph: what does this PR change and why? -->

## Type of change

<!-- Tick all that apply -->

- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds capability)
- [ ] Breaking change (changes existing public API)
- [ ] Refactor (no behavioural change)
- [ ] Documentation only
- [ ] Tests only
- [ ] Build / tooling / CI

## Affected packages

<!-- Tick all that apply -->

- [ ] `@xfarch/xf`
- [ ] `@xfarch/xf-rest`
- [ ] `examples/*`
- [ ] Repository tooling (root configs, CI, docs)

## Checklist

- [ ] My code follows the [contribution guide](../CONTRIBUTING.md),
      including the two non-negotiable rules (no behaviour at module
      scope; per-instance state in static WeakMaps).
- [ ] I have added or updated tests for every change of behaviour.
- [ ] `pnpm typecheck && pnpm test && pnpm build` is green locally.
- [ ] JSDoc on new or modified public symbols is in English.
- [ ] If the PR changes public behaviour, I have added a changeset
      (`pnpm changeset`) describing the change and the bump level.
- [ ] I have updated the relevant README sections if the public API
      surface changed.

## Notes for reviewers

<!--
Anything reviewers should pay extra attention to: tricky edge cases,
trade-offs you considered, follow-ups you are deliberately leaving
out of this PR.
-->
