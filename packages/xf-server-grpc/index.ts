/**
 * `@xfcfam/xf-server-grpc` — gRPC transport for the XF Architecture
 * Model (CFAM). **Sketch**: validates that the `@xfcfam/xf-server`
 * contract fits a second request/response transport. The lifecycle,
 * registry and pipeline are wired; the protobuf service-definition
 * binding is a documented TODO in {@link GrpcServerBusiness}.
 *
 * See https://xfcfam.org for the full XF specification.
 */

// ── Business Generalization ───────────────────────────────
export { GrpcServerBusiness } from './src/business/general/GrpcServerBusiness.js'
export type { GrpcServerOptions } from './src/business/general/GrpcServerBusiness.js'

// ── Transfers ─────────────────────────────────────────────
export type {
  GrpcAddress,
  GrpcMetadata,
  GrpcRequest,
  GrpcResponse,
  GrpcHandler,
} from './src/business/transfers/GrpcMessage.js'
export { GrpcException } from './src/business/transfers/GrpcException.js'
