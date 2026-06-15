/**
 * Access Layer Injection — placeholder.
 *
 * `@xfcfam/xf-logger-file` contributes a single Business Generalization
 * (`RotatingFileTreeBusiness`) and owns no Access Logical of its own, so
 * its `R` declares no static slots. The file tree reaches the consumer's
 * `@xfcfam/xf-fs` `FileRepository` through the **consumer's** `R`. Kept
 * structurally complete so the artefact passes XF validation. NOT exported.
 */
export class R {
  private constructor() {}
  static async init(): Promise<void> {}
  static async terminate(): Promise<void> {}
}
