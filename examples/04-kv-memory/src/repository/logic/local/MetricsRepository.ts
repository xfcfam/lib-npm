import { MemoryKeyValueRepository } from '../../general/MemoryKeyValueRepository.js'

/**
 * Access Logical — a tiny counters store (numeric values), used here to
 * track the running login total via the atomic `increment` operation.
 * Counters never expire.
 */
export class MetricsRepository extends MemoryKeyValueRepository<number> {
  constructor() {
    super({ namespace: 'metrics' })
  }

  override async init(): Promise<void> {}
  override async terminate(): Promise<void> {}
}
