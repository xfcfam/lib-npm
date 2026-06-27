import { ClientRepository } from '@xfcfam/xf-client'
import type { GrpcRequest, GrpcResponse } from '../transfers/GrpcMessage.js'

/**
 * Minimal structural view of a unary invoker — what a generated gRPC
 * client stub exposes per method. The protobuf → stub binding is the
 * documented TODO of this sketch (mirror of `@xfcfam/xf-server-grpc`),
 * so we depend on the shape, not on a concrete `@grpc/grpc-js` client.
 */
export type UnaryInvoker = (fullMethod: string, message: unknown) => Promise<unknown>

/**
 * Access-Layer Generalization for a **gRPC** outbound client — the
 * `@grpc/grpc-js` implementation of the {@link ClientRepository} contract.
 *
 * **Status: sketch.** A unary RPC maps cleanly onto the pipeline:
 * `send` invokes `service/method` with the request message and resolves
 * the response message. Streaming RPCs and the protobuf service-definition
 * binding are TODOs. Counterpart of `@xfcfam/xf-server-grpc`.
 */
export abstract class GrpcClientRepository extends ClientRepository<GrpcRequest, GrpcResponse> {
  /** Provided by the concrete client once the channel + generated stub are wired (TODO). */
  protected abstract invoker(): UnaryInvoker

  protected async send(request: GrpcRequest): Promise<GrpcResponse> {
    const message = await this.invoker()(`/${request.service}/${request.method}`, request.message)
    return { message }
  }
}
