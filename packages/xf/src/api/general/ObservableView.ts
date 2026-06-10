import { View } from './View.js'

/**
 * Generalization for Interaction Layer components whose state can be
 * observed — typically GUI views that other widgets re-render against.
 *
 * Subclasses call {@link notify} when state changes; consumers
 * register/unregister via {@link observe} / {@link remove}.
 *
 * @typeParam T  Shape of the observable state.
 */
export abstract class ObservableView<T> extends View<T> {
  private nextId = 0
  private observers = new Map<number, (state: T) => void>()

  /**
   * Register an observer.
   *
   * @param observer  Callback invoked with the current state on every {@link notify}.
   * @returns         An id usable in {@link remove}.
   */
  observe(observer: (state: T) => void): number {
    const id = ++this.nextId
    this.observers.set(id, observer)
    return id
  }

  /**
   * Unregister an observer.
   *
   * @param id  The id previously returned by {@link observe}.
   */
  remove(id: number): void {
    this.observers.delete(id)
  }

  /**
   * Invoke every registered observer with the current state.
   */
  notify(): void {
    this.observers.forEach(observer => observer(this.state))
  }

  /**
   * No-op. Override to add setup.
   *
   * @returns A resolved promise.
   */
  async init(): Promise<void> {}

  /**
   * Drops all observers.
   *
   * @returns A resolved promise.
   */
  async terminate(): Promise<void> {
    this.observers.clear()
  }
}
