/**
 * Access Layer Injection — placeholder.
 *
 * `@xfcfam/xf-reactnative-fs` contributes Access Generalizations
 * (`FileRepository` and its `Cached` / `Audited` variants); it owns no
 * Logical of its own, so its `R` declares no static slots. Kept
 * structurally complete so the artefact passes XF validation. NOT
 * exported — consumers import `R` from their own artefact.
 */
export class R {
  private constructor() {}
  static async init(): Promise<void> {}
  static async terminate(): Promise<void> {}
}
