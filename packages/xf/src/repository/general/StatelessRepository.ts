import { Repository } from './Repository.js'

/**
 * Generalization for stateless Access Layer components.
 *
 * Use this when the Repository performs operations that do not require
 * any local state between calls — for example, pure protocol adapters,
 * one-shot fetchers, or computed serializers.
 *
 * Equivalent to `Repository<null>` with a zero-argument constructor.
 *
 * @example
 * ```ts
 * import { StatelessRepository } from '@xfcfam/xf'
 *
 * export class TimeRepository extends StatelessRepository {
 *   async init()      {}
 *   async terminate() {}
 *   now(): number { return Date.now() }
 * }
 * ```
 */
export abstract class StatelessRepository extends Repository<null> {
  constructor() {
    super(null)
  }
}
