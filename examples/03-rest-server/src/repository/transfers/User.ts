/**
 * Access-layer Transfer — a single user record as stored locally.
 *
 * The Transfer carries data only; no behaviour. Business logic that
 * acts on users lives in `UsersBusiness`.
 */
export interface User {
  readonly id: string
  readonly name: string
  readonly email: string
  readonly createdAt: Date
}
