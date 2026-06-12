import { Business } from './Business.js'
import { NotInitializedException } from '../../repository/transfers/NotInitializedException.js'

/**
 * Generalization for Business Layer components whose domain state can
 * be observed (typically by Interaction Layer components).
 *
 * Subclasses call {@link notify} when state changes; consumers
 * register/unregister via {@link observe} / {@link remove}.
 *
 * @typeParam T  Shape of the observable domain state.
 */
export abstract class ObservableBusiness<T> extends Business<T> {
  private nextId = 0
  private observers = new Map<number, (state: T) => void>()
  private initialized = false

  /**
   * Register an observer.
   *
   * @param observer  Callback invoked with the current state on every {@link notify}.
   * @returns         An id usable in {@link remove}.
   * @throws {NotInitializedException}  If called before {@link init}.
   */
  observe(observer: (state: T) => void): number {
    if (!this.initialized) {
      throw new NotInitializedException('ObservableBusiness: init() was not called before observe().')
    }
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
   * Marks the component ready. Override to add setup, calling
   * `super.init()` so {@link observe} becomes usable.
   *
   * @returns A resolved promise.
   */
  async init(): Promise<void> {
    this.initialized = true
  }

  /**
   * Drops all observers.
   *
   * @returns A resolved promise.
   */
  async terminate(): Promise<void> {
    this.observers.clear()
  }
}
