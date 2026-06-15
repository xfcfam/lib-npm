/**
 * Interaction Layer Injection — placeholder.
 *
 * `A` is the canonical injection of the Interaction Layer.
 * `@xfcfam/xf-logger` contributes nothing to this layer, so its own `A`
 * declares no static slots. Kept structurally complete (private
 * constructor + empty `init` / `terminate`) so the artefact passes XF
 * validation. NOT exported.
 */
export class A {
  private constructor() {}
  static async init(): Promise<void> {}
  static async terminate(): Promise<void> {}
}
