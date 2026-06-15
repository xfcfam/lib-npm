/**
 * A single key-value entry, optionally with a per-entry TTL (seconds).
 * Flows into bulk writes ({@link KeyValueRepository.setMany}). A dumb
 * data carrier — it models no behaviour.
 *
 * @typeParam V  The value type stored by the repository.
 */
export interface Entry<V> {
  /** The (un-namespaced) key. */
  readonly key: string
  /** The value to store. */
  readonly value: V
  /** Optional time-to-live in seconds; falls back to the repository default. */
  readonly ttl?: number
}
