/**
 * Access Layer Injection — placeholder.
 *
 * `R` is the canonical injection of the Access Layer. `@xfcfam/xf-server`
 * is a library that contributes Generalizations and Transfer objects to
 * the Interaction Layer ( `ObjectRestService`,
 * `HttpServerBusiness`); it does not own any Logical of this layer, so
 * its own `R` declares no static slots. The class is kept structurally
 * complete (private constructor + empty `init` / `terminate`) so the
 * artefact passes XF validation. It is NOT exported from the package —
 * consumers import `R` from their own artefact.
 */
export class R {
  private constructor() {}
  static async init(): Promise<void> {}
  static async terminate(): Promise<void> {}
}
