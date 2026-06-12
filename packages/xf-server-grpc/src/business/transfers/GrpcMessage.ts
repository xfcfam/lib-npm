/**
 * Business-layer Transfer — the gRPC address: the `{ service, method }`
 * pair that identifies an RPC. This is the concrete `TAddr` the gRPC
 * server supplies to the generic `Route<TAddr, …>` of `@xfcfam/xf-server`
 * — the gRPC counterpart of HTTP's `{ method, path }`.
 */
export interface GrpcAddress {
  /** Fully-qualified service name, e.g. `users.UserService`. */
  readonly service: string
  /** RPC method name, e.g. `GetUser`. */
  readonly method: string
}

/** gRPC metadata (trailing/leading key → value(s)). */
export type GrpcMetadata = Readonly<Record<string, string | readonly string[]>>

/**
 * Business-layer Transfer — a single inbound unary RPC as seen by a
 * handler. `message` is the decoded request payload (the protobuf
 * message as a plain object).
 */
export interface GrpcRequest<TMessage = unknown> {
  readonly service: string
  readonly method: string
  readonly message: TMessage
  readonly metadata: GrpcMetadata
}

/**
 * Business-layer Transfer — the reply a handler returns. `message` is
 * the response payload; `status` (a gRPC status code, 0 = OK) and
 * `metadata` are optional.
 */
export interface GrpcResponse<TMessage = unknown> {
  readonly message: TMessage
  readonly status?: number
  readonly metadata?: GrpcMetadata
}

/** Function signature of a unary RPC handler. */
export type GrpcHandler<TReq = unknown, TRes = unknown> = (
  request: GrpcRequest<TReq>,
) => Promise<GrpcResponse<TRes>> | GrpcResponse<TRes>
