/**
 * Access-layer Transfer — a single file blob held in the in-memory
 * store. The bytes are kept as a `Uint8Array` so downloads can serve
 * them either as a buffer or as a stream slice.
 */
export interface StoredFile {
  readonly id: string
  readonly filename: string
  readonly mimeType: string
  readonly bytes: Uint8Array
  readonly uploadedAt: Date
}
