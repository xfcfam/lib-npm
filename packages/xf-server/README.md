# 🧩 `@xfcfam/xf-server`

> Transport-agnostic **inbound-server contract** for the **XF Architecture
> Model** — the abstract bases every `@xfcfam/xf-server-*` transport implements,
> so they share one lifecycle, one route registry and one request pipeline.

> [!NOTE]
> You normally install a concrete transport (e.g.
> [`@xfcfam/xf-server-http`](https://www.npmjs.com/package/@xfcfam/xf-server-http)),
> not this contract directly — reach for it to write your own transport.

## 📦 Install

```bash
npm i @xfcfam/xf @xfcfam/xf-server
```

## 🌳 The family

| Package | Transport | Status |
|---|---|---|
| [`xf-server-http`](https://www.npmjs.com/package/@xfcfam/xf-server-http) | HTTP — REST · WS · SSE · GraphQL (Fastify) | stable |
| [`xf-server-grpc`](https://www.npmjs.com/package/@xfcfam/xf-server-grpc) | gRPC (`@grpc/grpc-js`) | sketch |
| [`xf-server-tcp`](https://www.npmjs.com/package/@xfcfam/xf-server-tcp) | raw TCP (`node:net`) | sketch |
| [`xf-server-udp`](https://www.npmjs.com/package/@xfcfam/xf-server-udp) | UDP (`node:dgram`) | sketch |

## 🧰 Exported Components

### Generalizations

| Component | Description |
|---|---|
| [`ServerBusiness<TAddr,TReq,TRes>`](./src/business/general/ServerBusiness.ts) | Business orchestrator — owns the route registry (`Route` / `Handler`) and the request pipeline. Concrete transports implement `listen` / `close`. |
| [`EntryService<TReq,TRes>`](./src/api/general/EntryService.ts) | Interaction entry-point base — the per-service pipeline. Errors surface as a typed `ServerException`. |

> [!TIP]
> The contract is shaped around **request → response** addressed by a key (HTTP
> `{method,path}`, gRPC `{service,method}`). Connectionless / streaming sockets sit
> at its edge — see the TCP / UDP sketches.

## 🚀 Writing a transport

Supply the address scheme, the request / response types, and the two abstract
lifecycle methods:

```ts
import { ServerBusiness } from '@xfcfam/xf-server'

export abstract class MyServerBusiness extends ServerBusiness<MyAddr, MyReq, MyRes, MyState> {
  override async listen() {
    // open the socket; for each inbound message:
    //   const res = await this.dispatch(req, route.handler, errToRes)  →  write res back
  }
  override async close() { /* shut down the transport */ }
}
```

## 📚 Documentation

Full specification → **[xfcfam.org](https://xfcfam.org)**

## ⚖️ License

MIT
