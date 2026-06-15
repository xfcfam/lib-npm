/**
 * Access Layer Injection — placeholder.
 *
 * `R` is the canonical injection of the Access Layer. `@xfcfam/xf-react-view`
 * contributes only Interaction-Layer Generalizations; it owns no Access
 * Logical, so its own `R` declares no static slots. The class is kept
 * structurally complete (private constructor + empty `init` / `terminate`)
 * so the artefact passes XF validation. It is NOT exported from the
 * package — consumers import `R` from their own artefact.
 */
export class R {
  private constructor() {}
  static async init(): Promise<void> {}
  static async terminate(): Promise<void> {}
}
