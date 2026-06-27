/**
 * `@xfcfam/xf-client-grpc` — gRPC outbound client for the XF Architecture
 * Model (CFAM). **Sketch**: the `@xfcfam/xf-client` contract over
 * `@grpc/grpc-js`. Unary RPCs map onto the pipeline; the protobuf binding
 * is a documented TODO. Counterpart of `@xfcfam/xf-server-grpc`.
 */
export { GrpcClientRepository } from './src/repository/general/GrpcClientRepository.js'
export type { UnaryInvoker } from './src/repository/general/GrpcClientRepository.js'
export type { GrpcRequest, GrpcResponse } from './src/repository/transfers/GrpcMessage.js'
