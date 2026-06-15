# 🧩 `@xfcfam/xf-server-grpc`

> gRPC transport for the **XF Architecture Model** — the
> [`@xfcfam/xf-server`](https://www.npmjs.com/package/@xfcfam/xf-server) contract
> over [`@grpc/grpc-js`](https://github.com/grpc/grpc-node).

> [!WARNING]
> **Status: sketch.** A typed skeleton — it compiles against the contract and
> wires the lifecycle, registry and pipeline; binding a `.proto` service definition
> in `listen()` is a documented `TODO`. It proves the abstraction fits a second
> request/response transport beyond HTTP — not yet for production.

## 📦 Install

```bash
npm i @xfcfam/xf @xfcfam/xf-server @xfcfam/xf-server-grpc
```

## 🚀 Shape

```ts
import { GrpcServerBusiness, GrpcException,
         type GrpcRequest, type GrpcResponse } from '@xfcfam/xf-server-grpc'

export class AppGrpcServer extends GrpcServerBusiness {
  constructor() { super({ port: 50051 }) }
}
// in a service's init():  B.server.unary('users.UserService', 'GetUser', this.getUser)
```

## 🧰 Exported Components

### Generalizations

| Component | Description |
|---|---|
| [`GrpcServerBusiness`](./src/business/general/GrpcServerBusiness.ts) | The gRPC orchestrator over `@grpc/grpc-js`. Raises a typed `GrpcException` (`code`); handlers take a `GrpcRequest` and return a `GrpcResponse`. |

## 🔗 How it maps to the contract

| Core contract | HTTP | gRPC |
|---|---|---|
| `TAddr` | `{ method, path }` | `{ service, method }` |
| `dispatch` | `onRequest → handler → onResponse` | identical |
| `ServerException` | `HttpException` (`status`) | `GrpcException` (`code`) |

> [!TIP]
> Pending: bind `.proto` via `@grpc/proto-loader` + `server.addService`, and
> streaming RPCs (mirroring the WebSocket model in `xf-server-http`).

## 📚 Documentation

Full specification → **[xfcfam.org](https://xfcfam.org)**

## ⚖️ License

MIT
