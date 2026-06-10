/**
 * Transfer object for the User concept.
 *
 * Pure data, no logic. Repository fills it; Business applies rules;
 * Interaction returns / renders it.
 */
export interface User {
  id: number
  name: string
  email: string
  createdAt: Date
}
