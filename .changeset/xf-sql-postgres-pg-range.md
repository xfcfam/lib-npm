---
"@xfcfam/xf-sql-postgres": patch
---

Sync the published `pg` dependency range with the repository (`^8.21.0`).
The Dependabot update that raised the floor landed in the repo without a
release; this republishes so npm and the source agree. No behavioural
change — `pg` 8.21 is backward-compatible within the v8 line.
