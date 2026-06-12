---
"@xfcfam/xf-sql": patch
---

docs: clarify that `kysely` is a bundled dependency you never install
separately, and that dialect adapters bundle their own driver. Removed
`kysely` and `pg` from the install instructions; noted that only the
generic (bring-your-own-dialect) path needs a driver installed manually.
