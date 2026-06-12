# `@xfcfam/xf-server-udp` — sketch

UDP transport for the **XF Architecture Model**, over Node's built-in
[`node:dgram`](https://nodejs.org/api/dgram.html) (zero external
dependencies). Implements the [`@xfcfam/xf-server`](../xf-server)
contract.

> **Status: sketch.**

## How it maps to the contract

Unlike TCP, UDP fits the core pipeline reasonably well. Each datagram is
an independent message, and a handler may return an **optional reply** —
a loose request → response. So a datagram flows through the core
`dispatch` (`onRequest → handler → onResponse`, `onError` in the catch),
and the reply is sent back to the origin. What UDP lacks is *addressing*:
one handler per socket (address slot `null`).

| Core contract | Used by UDP? |
| --- | --- |
| Lifecycle | ✅ yes |
| `dispatch` pipeline | ✅ yes — datagram in, optional reply out |
| Address registry | ⚠️ degenerate — single handler, address `null` |

## Shape

```typescript
import { UdpServerBusiness, type Datagram, type DatagramReply } from '@xfcfam/xf-server-udp'

export class PingServer extends UdpServerBusiness {
  constructor() { super({ port: 41234 }) }
}

// Register the single datagram handler:
B.server.message((dg: Datagram): DatagramReply | null => {
  const text = new TextDecoder().decode(dg.data).trim()
  return text === 'ping' ? { data: 'pong' } : null   // null = stay silent
})
```

## License

MIT.
