# `@xfcfam/xf-server-grpc` — sketch

gRPC transport for the **XF Architecture Model**. Implements the
transport-agnostic [`@xfcfam/xf-server`](../xf-server) contract over
[`@grpc/grpc-js`](https://github.com/grpc/grpc-node).

> **Status: sketch.** This package is a typed skeleton. It compiles
> against the core contract and wires the full lifecycle, route registry
> and request pipeline; the protobuf service-definition binding (loading
> a `.proto` and calling `server.addService`) is a documented `TODO` in
> `GrpcServerBusiness.listen()`. It exists to prove the abstraction fits
> a second request/response transport beyond HTTP — not yet for
> production use.

## Why it fits the contract cleanly

A gRPC unary RPC is request → response, exactly like an HTTP request. So
it maps onto the core with no friction:

| Core contract | HTTP | gRPC |
| --- | --- | --- |
| `TAddr` (address) | `{ method, path }` | `{ service, method }` |
| `TReq` / `TRes` | `HttpRequest` / `HttpResponse` | `GrpcRequest` / `GrpcResponse` |
| `dispatch` pipeline | `onRequest → handler → onResponse` | identical |
| `ServerException` | `HttpException` (+ `status`) | `GrpcException` (+ `code`) |

## Shape

```typescript
import { GrpcServerBusiness, GrpcException, type GrpcRequest, type GrpcResponse } from '@xfcfam/xf-server-grpc'

export class AppGrpcServer extends GrpcServerBusiness {
  constructor() { super({ port: 50051 }) }
}

// In a service's init(), push RPCs to B.server:
export class UsersGrpcService /* extends an Interaction base */ {
  init() {
    B.server.unary('users.UserService', 'GetUser', this.getUser)
  }
  private async getUser(req: GrpcRequest<{ id: string }>): Promise<GrpcResponse> {
    const user = await B.usersBusiness.findById(req.message.id)
    if (user === null) throw new GrpcException(5 /* NOT_FOUND */, `User ${req.message.id}`)
    return { message: user }
  }
}
```

## What's pending

- Load `.proto` files via `@grpc/proto-loader` and bind each registered
  route to its `ServiceDefinition` (`server.addService(def, impl)`),
  where `impl[method] = this.adapt(service, method, handler)`.
- Streaming RPCs (client / server / bidi) — the unary path is sketched;
  streaming would mirror the WebSocket model in `@xfcfam/xf-server-http`.

## License

MIT.
