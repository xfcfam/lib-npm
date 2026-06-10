/**
 * Transfer object for the User concept.
 *
 * Pure data, no logic. The Repository fills it; the Business layer
 * applies rules to it; the Interaction layer renders / returns it.
 */
export interface User {
  id: number
  name: string
  username: string
  email: string
}
