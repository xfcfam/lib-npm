import { Business } from './Business.js'
import { NotInitializedException } from '../../repository/transfers/NotInitializedException.js'

/**
 * Generalization for Business Layer components whose domain state can
 * be observed (typically by Interaction Layer components).
 *
 * Subclasses publish via {@link notify} (optionally passing the new
 * state); consumers register/unregister via {@link observe} /
 * {@link remove}. The state stays encapsulated (`protected`) — a
 * component that wants to expose it adds its own accessor over it.
 * Observer callbacks are isolated — a throwing observer never prevents
 * the others from running.
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
   * @param observer       Callback invoked with the current state on every {@link notify}.
   * @param runOnObserve   When `true`, the observer is also invoked immediately
   *                       with the current state (errors isolated). Default `false`.
   * @returns              An id usable in {@link remove}.
   * @throws {NotInitializedException}  If called before {@link init}.
   */
  observe(observer: (state: T) => void, runOnObserve = false): number {
    if (!this.initialized) {
      throw new NotInitializedException('ObservableBusiness: init() was not called before observe().')
    }
    const id = ++this.nextId
    this.observers.set(id, observer)
    if (runOnObserve) { try { observer(this.state) } catch { /* observer errors are isolated */ } }
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
   * Invoke every registered observer with the current state. If `data`
   * is provided it becomes the new state before observers run. Observer
   * errors are isolated.
   *
   * @param data  Optional new state to publish.
   */
  notify(data?: T): void {
    if (data !== undefined) this.state = data
    this.observers.forEach(observer => { try { observer(this.state) } catch { /* isolated */ } })
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
