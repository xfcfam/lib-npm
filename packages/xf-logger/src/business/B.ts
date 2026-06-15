/**
 * Business Layer Injection — placeholder.
 *
 * `B` is the canonical injection of the Business Layer. `@xfcfam/xf-logger`
 * contributes Business Generalizations (`LoggerBusiness`,
 * `ConsoleTreeBusiness`) that the consumer extends into their own
 * Logicals and registers in their own `B`; this library owns no Logical,
 * so its own `B` declares no static slots. Kept structurally complete so
 * the artefact passes XF validation. NOT exported.
 */
export class B {
  private constructor() {}
  static async init(): Promise<void> {}
  static async terminate(): Promise<void> {}
}
