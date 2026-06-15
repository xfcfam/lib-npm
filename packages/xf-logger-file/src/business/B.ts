/**
 * Business Layer Injection — placeholder.
 *
 * `@xfcfam/xf-logger-file` contributes the `RotatingFileTreeBusiness`
 * Generalization, which the consumer extends into their own Logical and
 * registers in their own `B`; this library owns no Logical, so its `B`
 * declares no static slots. Kept structurally complete so the artefact
 * passes XF validation. NOT exported.
 */
export class B {
  private constructor() {}
  static async init(): Promise<void> {}
  static async terminate(): Promise<void> {}
}
