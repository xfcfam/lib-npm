/**
 * Interaction Layer Injection — placeholder.
 *
 * `A` is the canonical injection of the Interaction Layer. `@xfcfam/xf-react-view`
 * is a library that contributes Generalizations to the Interaction Layer
 * (the `ReactView` / `ObservableReactView` / `StatelessReactView` mixin
 * Generalizations); it does not own any Logical of this layer, so its own
 * `A` declares no static slots. The class is kept structurally complete
 * (private constructor + empty `init` / `terminate`) so the artefact
 * passes XF validation. It is NOT exported from the package — consumers
 * import `A` from their own artefact.
 */
export class A {
  private constructor() {}
  static async init(): Promise<void> {}
  static async terminate(): Promise<void> {}
}
