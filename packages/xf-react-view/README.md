# 🧩 `@xfcfam/xf-react-view`

> React presentation Generalizations for the **XF Architecture Model (CFAM)** —
> Mixin factories that graft the Interaction-Layer `View` onto a `React.Component`
> peer base.

> [!NOTE]
> React class components must `extends React.Component`, but XF requires every
> component to inherit its layer Generalization (the `View` suffix). TypeScript is
> single-inheritance, so the two collide. The XF answer is the **Mixin
> Generalization** — a class factory that grafts the `View` onto the peer base, so a
> component inherits the *actual* Generalization (and the `init` / `terminate`
> lifecycle) without surrendering its `React.Component` base.

## 📦 Install

```bash
npm i @xfcfam/xf @xfcfam/xf-react-view react
```

`react` (`>=18`) is a peer dependency; the package itself imports no React types.

## 🚀 Quick start

```tsx
import { Component } from 'react'
import { ReactView } from '@xfcfam/xf-react-view'

interface Props { userId: number }
interface State { name: string }

// Inherits the actual View Generalization *and* React.Component.
export class UserView extends ReactView(Component<Props, State>) {
  override async init() {                  // runs on mount (and via injection A)
    const user = await B.users.fetch(this.props.userId)
    this.setState({ name: user.name })
  }
  override async terminate() {}            // runs on unmount
  override render() { return <span>{this.state?.name}</span> }
}
```

> [!IMPORTANT]
> Put mount / unmount logic in `init` / `terminate`, **not** in `componentDidMount` /
> `componentWillUnmount` — the mixin bridges React's lifecycle onto them. Overriding
> the React methods without calling `super` drops the bridge.

## 🧰 Exported Components

### Generalizations

| Component | Description |
|---|---|
| [`ReactView`](./src/api/general/ReactView.ts) | Stateful presentation View (mirrors `View<T>`). Grafts the XF View lifecycle onto a base and bridges React mount / unmount → `init` / `terminate`. Presentation state stays in the peer base (`this.state`). |
| [`ObservableReactView`](./src/api/general/ObservableReactView.ts) | Observable View (mirrors `ObservableView<T>`) — `ObservableReactView<TState>()(Base)`. Adds `observe` / `remove` / `notify` on top of the mount-bridged base; `notify` takes the snapshot explicitly since React owns the state. |
| [`StatelessReactView`](./src/api/general/StatelessReactView.ts) | Stateless presentation View (mirrors `StatelessView`) — `ReactView` applied to a base with no presentation state of its own. |

The `Constructor` helper type and the `ViewLifecycle` contract every mixed component
satisfies are exported alongside (see [`ReactView.ts`](./src/api/general/ReactView.ts)).

## 📚 Documentation

Full specification → **[xfcfam.org](https://xfcfam.org)**

## ⚖️ License

MIT
