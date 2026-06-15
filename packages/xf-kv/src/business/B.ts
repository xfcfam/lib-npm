/**
 * Business Layer Injection — placeholder.
 *
 * `B` is the canonical injection of the Business Layer. `@xfcfam/xf-kv`
 * contributes only Access-layer Generalizations and Transfers, so its
 * own `B` declares no static slots. Kept structurally complete so the
 * artefact passes XF validation. NOT exported.
 */
export class B {
  private constructor() {}
  static async init(): Promise<void> {}
  static async terminate(): Promise<void> {}
}
