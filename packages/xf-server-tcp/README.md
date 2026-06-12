# `@xfcfam/xf-server-tcp` — sketch

Raw TCP transport for the **XF Architecture Model**, over Node's
built-in [`node:net`](https://nodejs.org/api/net.html) (zero external
dependencies). Implements the [`@xfcfam/xf-server`](../xf-server)
contract.

> **Status: sketch — and a deliberate boundary case.**

## Why it's a boundary case

TCP is **connection-oriented** (a bidirectional byte stream) and has
**no addressing** (one listener for the whole port). That does *not*
match the core's request → response, address-routed model. So TCP reuses
only the part of the contract that is genuinely universal — the
**lifecycle** — and bypasses the rest:

| Core contract | Used by TCP? |
| --- | --- |
| Lifecycle (`init` → `listen` → `close` / `terminate`, `onStarted` / `onStopped`) | ✅ yes |
| Address registry (`Route<TAddr>`) | ⚠️ degenerate — single handler, address `null` |
| `dispatch` pipeline (`onRequest → handler → onResponse`) | ❌ bypassed — no request/response |

This is the useful outcome of the sketch: it confirms the core is
**request/response-server shaped**, and that raw sockets sit at its
edge. If TCP/UDP ever warrant first-class support, the cleaner home is a
thinner `xf-socket-*` base rather than stretching `xf-server`.

## Shape

```typescript
import { TcpServerBusiness, type TcpConnection } from '@xfcfam/xf-server-tcp'

export class EchoServer extends TcpServerBusiness {
  constructor() { super({ port: 9000 }) }
}

// Register the single connection handler:
B.server.connection((conn: TcpConnection) => {
  conn.onData((chunk) => conn.send(chunk))   // echo
  conn.onClose(() => console.log('bye'))
})
```

## License

MIT.
