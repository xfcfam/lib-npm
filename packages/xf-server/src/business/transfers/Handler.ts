/**
 * Business-layer Transfer — the function signature every inbound
 * entry-point handler conforms to, regardless of transport.
 *
 * A handler receives a fully decoded request and returns the response
 * to send back. May be async — the server `await`s it. The concrete
 * request/response shapes are protocol-specific (HTTP, gRPC, raw
 * socket, …) and are supplied by the protocol package as the `TReq` /
 * `TRes` type arguments; the core only fixes the *shape of the
 * contract*, not the wire types.
 *
 * @typeParam TReq  Protocol-specific request type (e.g. `HttpRequest`).
 * @typeParam TRes  Protocol-specific response type (e.g. `HttpResponse`).
 */
export type Handler<TReq, TRes> = (request: TReq) => Promise<TRes> | TRes
