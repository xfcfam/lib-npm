/**
 * Access Layer Injection — placeholder.
 *
 * `R` is the canonical injection of the Access Layer. `@xfcfam/xf-server-grpc` is a
 * library that contributes Generalizations and Transfer objects; it
 * owns no Logical of its own, so its `R` declares no static slots.
 * Kept structurally complete (private constructor + empty
 * `init` / `terminate`) so the artefact passes XF validation. NOT
 * exported — consumers import `R` from their own artefact.
 */
export class R {
  private constructor() {}
  static async init(): Promise<void> {}
  static async terminate(): Promise<void> {}
}
