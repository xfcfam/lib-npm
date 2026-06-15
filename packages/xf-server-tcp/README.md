# 🧩 `@xfcfam/xf-server-tcp`

> Raw TCP transport for the **XF Architecture Model** over
> [`node:net`](https://nodejs.org/api/net.html) (zero external deps) — the
> [`@xfcfam/xf-server`](https://www.npmjs.com/package/@xfcfam/xf-server) contract.

> [!WARNING]
> **Status: sketch — and a deliberate boundary case.** TCP is
> connection-oriented with no addressing, so it does *not* match the core's
> request → response model. It reuses only the universal **lifecycle** and bypasses
> the pipeline.

## 📦 Install

```bash
npm i @xfcfam/xf @xfcfam/xf-server @xfcfam/xf-server-tcp
```

## 🚀 Shape

```ts
import { TcpServerBusiness, type TcpConnection } from '@xfcfam/xf-server-tcp'

export class EchoServer extends TcpServerBusiness {
  constructor() { super({ port: 9000 }) }
}
B.server.connection((conn: TcpConnection) => conn.onData((c) => conn.send(c))) // echo
```

## 🧰 Exported Components

### Generalizations

| Component | Description |
|---|---|
| [`TcpServerBusiness`](./src/business/general/TcpServerBusiness.ts) | The raw-TCP orchestrator over `node:net`. A handler receives a `TcpConnection` (`onData` / `send` / `onClose`); reuses only the lifecycle (see below). |

## 🔗 What maps

| Core contract | TCP |
|---|---|
| Lifecycle (`init` → `listen` → `close`) | yes |
| Address registry | degenerate — single handler, address `null` |
| `dispatch` pipeline | bypassed — no request/response |

> [!TIP]
> The useful outcome of the sketch: it confirms the core is request/response-shaped,
> and that raw sockets belong in a thinner `xf-socket-*` base, not here.

## 📚 Documentation

Full specification → **[xfcfam.org](https://xfcfam.org)**

## ⚖️ License

MIT
