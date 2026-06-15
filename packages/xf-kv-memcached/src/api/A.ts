/**
 * Interaction Layer Injection — placeholder.
 *
 * `A` is the canonical injection of the Interaction Layer. `@xfcfam/xf-kv-memcached`
 * contributes only Access-layer Generalizations and Transfers, so its
 * own `A` declares no static slots. Kept structurally complete so the
 * artefact passes XF validation. NOT exported.
 */
export class A {
  private constructor() {}
  static async init(): Promise<void> {}
  static async terminate(): Promise<void> {}
}
