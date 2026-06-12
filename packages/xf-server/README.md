# `@xfcfam/xf-server`

Transport-agnostic **inbound-server contract** for the **XF Architecture
Model**. This package has no transport of its own — it defines the
abstract bases that every concrete `@xfcfam/xf-server-*` package
implements, so they all share one lifecycle, one registration model, and
one request pipeline regardless of protocol.

You normally install a concrete package (`@xfcfam/xf-server-http`, …),
not this one directly. Reach for `@xfcfam/xf-server` when you want to
write your own transport, or to depend only on the abstract types.

## The family

| Package | Transport | Status |
| --- | --- | --- |
| [`@xfcfam/xf-server-http`](../xf-server-http) | HTTP — REST · WebSocket · SSE · GraphQL (Fastify) | stable |
| [`@xfcfam/xf-server-grpc`](../xf-server-grpc) | gRPC (`@grpc/grpc-js`) | sketch |
| [`@xfcfam/xf-server-tcp`](../xf-server-tcp) | raw TCP (`node:net`) | sketch |
| [`@xfcfam/xf-server-udp`](../xf-server-udp) | UDP (`node:dgram`) | sketch |

## What it defines

| Export | Layer · type | Purpose |
| --- | --- | --- |
| `ServerBusiness<TAddr, TReq, TRes>` | Business · Generalization | The server orchestrator. Owns the **route registry** (`register`) and the **request pipeline** (`dispatch`: `onRequest → handler → onResponse`, `onError` in the catch). Leaves `listen` / `close` and the address / wire types abstract. |
| `EntryService<TReq, TRes>` | Interaction · Generalization | The entry-point service base. Provides the per-service `wrap()` pipeline. |
| `Route<TAddr, TReq, TRes>` | Business · Transfer | An `{ address, handler }` registration. |
| `Handler<TReq, TRes>` | Business · Transfer | The handler function signature. |
| `ServerException` | Business · Transfer | Base for typed entry-point errors (protocols add `status` / `code`). |

## The contract in one diagram

```
                 ┌─────────────────── @xfcfam/xf-server (this package) ──────────────────┐
                 │  ServerBusiness<TAddr,TReq,TRes>   EntryService<TReq,TRes>            │
                 │    · register(address, handler)      · wrap(handler)                  │
                 │    · dispatch(req, handler, …)        · onRequest/onResponse/onError   │
                 │    · listen()/close()  ← abstract                                      │
                 └───────────────▲───────────────────────────▲──────────────────────────┘
                                 │ implements                 │ extends
         ┌───────────────────────┴───────┐         ┌──────────┴──────────────┐
         │ HttpServerBusiness            │         │ RestService / …          │
         │ TAddr = {method,path}         │         │ TReq=HttpRequest         │
         │ TReq=HttpRequest TRes=…       │         │ TRes=HttpResponse        │
         └───────────────────────────────┘         └─────────────────────────┘
              (xf-server-http; grpc/tcp/udp analogous)
```

## Writing a transport

A protocol package supplies the address scheme (`TAddr`), the request /
response types (`TReq` / `TRes`), and the two abstract lifecycle methods:

```typescript
import { ServerBusiness, type ServerState } from '@xfcfam/xf-server'

interface MyState extends ServerState<MyAddr, MyReq, MyRes> { /* transport handle, options */ }

export abstract class MyServerBusiness extends ServerBusiness<MyAddr, MyReq, MyRes, MyState> {
  // ergonomic registration on top of the protected `register`
  on(addr: MyAddr, handler: Handler<MyReq, MyRes>) { this.register(addr, handler) }

  override async listen() {
    // open the socket; for each `this.routes`, on inbound message call
    //   const res = await this.dispatch(req, route.handler, errToRes)
    // and write `res` back to the wire.
  }
  override async close() { /* shut down the transport */ }
}
```

The lifecycle is fixed by the contract: `init()` is a **no-op** (routes
are pushed during the Interaction layer's `init`), the start-point calls
`listen()` explicitly once all routes are registered, and `terminate()`
delegates to `close()`.

## Design note — why "request/response server"

The contract is shaped around **request → response** transports
addressed by a key (HTTP `{method,path}`, gRPC `{service,method}`).
HTTP and gRPC fit it cleanly. Raw sockets sit at the edge: UDP
(datagram + optional reply) still maps onto `dispatch`, while TCP
(connection-oriented, no addressing) reuses only the *lifecycle* and
bypasses the pipeline — see the `xf-server-tcp` README. If raw sockets
ever warrant first-class support, the cleaner home is a thinner
`xf-socket-*` base rather than diluting this contract.

## License

MIT.
