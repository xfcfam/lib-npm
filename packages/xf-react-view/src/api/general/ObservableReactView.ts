import type { Constructor, ViewLifecycle } from './ReactView.js'

/**
 * Public surface a base gains when wrapped by {@link ObservableReactView}:
 * the XF View lifecycle plus the observer protocol. Declared explicitly so
 * the mixin can annotate its return type — a mixin yields an anonymous
 * class, and declaration emit cannot represent the private observer
 * registry on an inferred anonymous type (TS4094).
 *
 * @typeParam TState  Shape of the observed state snapshot.
 */
export interface ObservableSurface<TState> extends ViewLifecycle {
  /** Register an observer; returns an id usable in `remove`. */
  observe(observer: (state: TState) => void): number
  /** Unregister an observer by the id returned from `observe`. */
  remove(id: number): void
  /** Fan a state snapshot out to every registered observer. */
  notify(state: TState): void
}

/**
 * Mixin Generalization for Interaction Layer components whose state can
 * be observed — the mixin counterpart of `ObservableView<T>` from
 * `@xfcfam/xf`, for components that must also extend a peer-developer
 * class (canonically `React.Component`).
 *
 * Same rationale as {@link ReactView}: TypeScript is single-inheritance,
 * so a component already bound to a framework base cannot also
 * `extends ObservableView<T>`. This factory grafts the observable View
 * Generalization onto whatever base the peer developer mandates.
 *
 * The Generalization is parameterised on the observed state `TState` via
 * the outer call, then applied to the base via the inner call — the
 * standard way to thread a type parameter through a TypeScript mixin:
 *
 * ```ts
 * class Foo extends ObservableReactView<MyState>()(Base) { … }
 * ```
 *
 * Because the peer base owns the presentation state (React's
 * `this.state`), {@link notify} takes the current snapshot explicitly
 * rather than reading a `protected state` the way the core
 * `ObservableView<T>` does. Subscribers register / unregister via
 * {@link observe} / {@link remove}; {@link terminate} drops them all.
 *
 * @typeParam TState  Shape of the observed state snapshot.
 * @returns  A mixin: pass it the peer-developer base to extend.
 *
 * @example
 * ```tsx
 * import { Component } from 'react'
 * import { ObservableReactView } from '@xfcfam/xf-react-view'
 *
 * interface State { count: number }
 *
 * export class CounterView
 *   extends ObservableReactView<State>()(Component<{}, State>) {
 *   override async init() { this.setState({ count: 0 }) }
 *   increment() {
 *     const next = { count: this.state.count + 1 }
 *     this.setState(next)
 *     this.notify(next)        // fan out to external observers
 *   }
 * }
 * ```
 */
export function ObservableReactView<TState = unknown>() {
  return function observableReactView<TBase extends Constructor>(
    Base: TBase,
  ): TBase & Constructor<ObservableSurface<TState>> {
    return class ObservableReactViewGeneralization extends Base implements ViewLifecycle {
      // ECMAScript private fields (not TS `private`): a mixin returns an
      // anonymous class whose emitted declaration may not carry TS-private
      // members (TS4094), so the registry is kept truly private with `#`.
      #nextId = 0
      #observers = new Map<number, (state: TState) => void>()

      /**
       * Register an observer.
       *
       * @param observer  Callback invoked with the snapshot passed to
       *                   every {@link notify}.
       * @returns         An id usable in {@link remove}.
       */
      observe(observer: (state: TState) => void): number {
        const id = ++this.#nextId
        this.#observers.set(id, observer)
        return id
      }

      /**
       * Unregister an observer.
       *
       * @param id  The id previously returned by {@link observe}.
       */
      remove(id: number): void {
        this.#observers.delete(id)
      }

      /**
       * Invoke every registered observer with the given state snapshot.
       *
       * @param state  The current state to fan out to observers.
       */
      notify(state: TState): void {
        this.#observers.forEach(observer => observer(state))
      }

      /**
       * No-op. Override to add setup. Invoked by `A` and by the React
       * mount bridge on subclasses that also pull in {@link ReactView}.
       */
      async init(): Promise<void> {}

      /**
       * Drops all observers.
       */
      async terminate(): Promise<void> {
        this.#observers.clear()
      }
    }
  }
}
