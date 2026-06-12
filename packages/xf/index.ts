/**
 * `@xfcfam/xf` — core library of the XF Architecture Model (CFAM).
 *
 * Re-exports the building blocks of an XF-compliant artefact, grouped
 * by layer:
 *
 * - **Access**       — {@link R}, {@link Repository}, {@link StatelessRepository},
 *                       {@link ObservableRepository}, {@link RetryableRepository},
 *                       {@link PaginatedRepository}, {@link ClockRepository}
 * - **Business**     — {@link B}, {@link Business}, {@link StatelessBusiness},
 *                       {@link ObservableBusiness}, {@link ScheduleBusiness},
 *                       {@link ObservableScheduleBusiness}, {@link CacheableBusiness},
 *                       {@link ObservableCacheableBusiness}, {@link ValidatedBusiness},
 *                       {@link StateMachineBusiness}, {@link ObservableStateMachineBusiness},
 *                       {@link EventSourcedBusiness}, {@link ConcurrentBusiness},
 *                       {@link LockedBusiness}, {@link BatchedBusiness}
 * - **Interaction**  — {@link A}, {@link View}, {@link StatelessView},
 *                       {@link ObservableView}, {@link ScheduleView},
 *                       {@link Service}, {@link StatelessService},
 *                       {@link CommandService}, {@link CronService}
 * - **Architecture** — {@link XF} (optional orchestrator)
 *
 * See https://xfcfam.org for the full specification.
 */

// ── Access ────────────────────────────────────────────────
export { R } from './src/repository/R.js'
export { Repository } from './src/repository/general/Repository.js'
export { StatelessRepository } from './src/repository/general/StatelessRepository.js'
export { ObservableRepository } from './src/repository/general/ObservableRepository.js'
export { RetryableRepository } from './src/repository/general/RetryableRepository.js'
export type { RetryOptions } from './src/repository/general/RetryableRepository.js'
export { PaginatedRepository } from './src/repository/general/PaginatedRepository.js'
export type { Page } from './src/repository/general/PaginatedRepository.js'
export { ClockRepository } from './src/repository/general/ClockRepository.js'
export { NotInitializedException } from './src/repository/transfers/NotInitializedException.js'

// ── Business ──────────────────────────────────────────────
export { B } from './src/business/B.js'
export { Business } from './src/business/general/Business.js'
export { StatelessBusiness } from './src/business/general/StatelessBusiness.js'
export { ObservableBusiness } from './src/business/general/ObservableBusiness.js'
export { ScheduleBusiness } from './src/business/general/ScheduleBusiness.js'
export { ObservableScheduleBusiness } from './src/business/general/ObservableScheduleBusiness.js'
export { CacheableBusiness } from './src/business/general/CacheableBusiness.js'
export { ObservableCacheableBusiness } from './src/business/general/ObservableCacheableBusiness.js'
export { ValidatedBusiness } from './src/business/general/ValidatedBusiness.js'
export type { ValidationResult } from './src/business/general/ValidatedBusiness.js'
export { StateMachineBusiness } from './src/business/general/StateMachineBusiness.js'
export type { TransitionTable } from './src/business/general/StateMachineBusiness.js'
export { ObservableStateMachineBusiness } from './src/business/general/ObservableStateMachineBusiness.js'
export { EventSourcedBusiness } from './src/business/general/EventSourcedBusiness.js'
export { ConcurrentBusiness } from './src/business/general/ConcurrentBusiness.js'
export { LockedBusiness } from './src/business/general/LockedBusiness.js'
export { BatchedBusiness } from './src/business/general/BatchedBusiness.js'
export type { BatchOptions, BatchFlushReason, BatchErrorPolicy } from './src/business/general/BatchedBusiness.js'
export { IllegalTransitionException } from './src/business/transfers/IllegalTransitionException.js'

// ── Interaction ───────────────────────────────────────────
export { A } from './src/api/A.js'
export { View } from './src/api/general/View.js'
export { StatelessView } from './src/api/general/StatelessView.js'
export { Service } from './src/api/general/Service.js'
export { StatelessService } from './src/api/general/StatelessService.js'
export { ObservableView } from './src/api/general/ObservableView.js'
export { ScheduleView } from './src/api/general/ScheduleView.js'
export { CommandService } from './src/api/general/CommandService.js'
export { CronService } from './src/api/general/CronService.js'

// ── Architecture ──────────────────────────────────────────
export { XF } from './src/XF.js'
