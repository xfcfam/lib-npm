/** Outbound unary gRPC request: fully-qualified method and the request message. */
export interface GrpcRequest<TMessage = unknown> { readonly service: string; readonly method: string; readonly message: TMessage }
/** Inbound unary gRPC response message. */
export interface GrpcResponse<TMessage = unknown> { readonly message: TMessage }
