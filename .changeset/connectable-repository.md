---
"@xfcfam/xf": minor
"@xfcfam/xf-sql": minor
---

Add `ConnectableRepository`, a latched connection lifecycle for the Access Layer, and adopt it in `xf-sql`'s `DatabaseRepository`.

XF bootstraps downwards — `R.init()` finishes before `B.init()` starts — so a Repository always connects *before* any Business exists to hear about it. Subscribing to a plain connect event from `B.init()` therefore registers a callback for something that already happened: it never runs, nothing throws, and the state it was meant to populate stays empty. The bug is in the ordering, which is invisible at the call site.

`ConnectableRepository` treats connection state as a latch rather than an event: `onConnect(listener)` fires immediately when the component is already connected, and again on every reconnect. Also provides `onDisconnect`, `isConnected()`, and idempotent `markConnected()` / `markDisconnected()` for subclasses. Listener failures are isolated and routed to the overridable `onListenerError` hook.

`DatabaseRepository` now extends it and marks the transitions around its existing `onConnected` / `onDisconnected` subclass hooks, which keep their current meaning and firing order. No breaking change: subclasses that override the hooks are unaffected, and `onConnect` / `isConnected` are additive.
