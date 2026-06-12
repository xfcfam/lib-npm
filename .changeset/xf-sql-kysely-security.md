---
"@xfcfam/xf-sql": patch
---

Security: bump `kysely` to `^0.28.17` to pull in fixes for the SQL-injection
advisories GHSA-wmrf-hv6w-mr66, GHSA-8cpq-38p9-67gx and GHSA-pv5w-4p9q-p3v2.
The previous `^0.27.0` range pinned a vulnerable 0.27.x minor.
