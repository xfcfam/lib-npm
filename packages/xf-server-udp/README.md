# 🧩 `@xfcfam/xf-server-udp`

> UDP transport for the **XF Architecture Model** over
> [`node:dgram`](https://nodejs.org/api/dgram.html) (zero external deps) — the
> [`@xfcfam/xf-server`](https://www.npmjs.com/package/@xfcfam/xf-server) contract.

> [!WARNING]
> **Status: sketch.** Unlike TCP, UDP fits the core well — each datagram is a
> message with an optional reply (a loose request → response). What it lacks is
> *addressing*: one handler per socket.

## 📦 Install

```bash
npm i @xfcfam/xf @xfcfam/xf-server @xfcfam/xf-server-udp
```

## 🚀 Shape

```ts
import { UdpServerBusiness, type Datagram, type DatagramReply } from '@xfcfam/xf-server-udp'

export class PingServer extends UdpServerBusiness {
  constructor() { super({ port: 41234 }) }
}
B.server.message((dg: Datagram): DatagramReply | null =>
  new TextDecoder().decode(dg.data).trim() === 'ping' ? { data: 'pong' } : null) // null = silent
```

## 🧰 Exported Components

### Generalizations

| Component | Description |
|---|---|
| [`UdpServerBusiness`](./src/business/general/UdpServerBusiness.ts) | The UDP orchestrator over `node:dgram`. A handler takes a `Datagram` and returns an optional `DatagramReply`. |

## 🔗 What maps

| Core contract | UDP |
|---|---|
| Lifecycle | yes |
| `dispatch` pipeline | yes — datagram in, optional reply out |
| Address registry | degenerate — single handler, address `null` |

## 📚 Documentation

Full specification → **[xfcfam.org](https://xfcfam.org)**

## ⚖️ License

MIT
