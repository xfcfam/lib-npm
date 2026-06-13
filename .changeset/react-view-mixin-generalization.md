---
'@xfcfam/xf-react-view': minor
---

Add `@xfcfam/xf-react-view` — React presentation Generalizations for the
Interaction Layer. Introduces the **Mixin Generalizations** `ReactView`,
`ObservableReactView` and `StatelessReactView`: class factories that graft
the XF `View` / `ObservableView` / `StatelessView` Generalizations onto a
peer-developer base (canonically `React.Component`), so a component inherits
the actual Generalization surface — and the `init` / `terminate` lifecycle
the injection `A` orchestrates — without surrendering its framework base.
`ReactView` also bridges the React mount/unmount lifecycle to the XF
`init` / `terminate` hooks.
