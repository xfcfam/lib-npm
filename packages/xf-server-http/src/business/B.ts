/**
 * Business Layer Injection — placeholder.
 *
 * `B` is the canonical injection of the Business Layer. `@xfcfam/xf-server`
 * is a library that contributes Generalizations and Transfer objects to
 * the Interaction Layer ( `ObjectRestService`,
 * `HttpServerBusiness`); it does not own any Logical of this layer, so
 * its own `B` declares no static slots. The class is kept structurally
 * complete (private constructor + empty `init` / `terminate`) so the
 * artefact passes XF validation. It is NOT exported from the package —
 * consumers import `B` from their own artefact.
 */
export class B {
  private constructor() {}
  static async init(): Promise<void> {}
  static async terminate(): Promise<void> {}
}
