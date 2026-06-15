/**
 * Access Layer Injection — placeholder.
 *
 * `R` is the canonical injection of the Access Layer. `@xfcfam/xf-kv`
 * is a library that contributes Generalizations and Transfer objects;
 * it does not own any Logical of this layer, so its own `R` declares
 * no static slots. Kept structurally complete (private constructor +
 * empty `init` / `terminate`) so the artefact passes XF validation.
 * NOT exported — consumers import `R` from their own artefact.
 */
export class R {
  private constructor() {}
  static async init(): Promise<void> {}
  static async terminate(): Promise<void> {}
}
