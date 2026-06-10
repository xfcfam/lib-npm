import { Repository } from '@xfcfam/xf'
import type { User } from '../../transfers/User.js'

interface State { users: Map<string, User> }

/**
 * In-memory CRUD store for users. Real artefacts would extend a
 * `DatabaseRepository` from `@xfcfam/xf-sql` instead — this Logical
 * keeps the example self-contained.
 */
export class UsersRepository extends Repository<State> {
  constructor() { super({ users: new Map() }) }

  override async init(): Promise<void> {
    // Seed two users so the GET endpoints have something to return.
    const now = new Date()
    this.state.users.set('1', { id: '1', name: 'Ada Lovelace',  email: 'ada@xfcfam.org',  createdAt: now })
    this.state.users.set('2', { id: '2', name: 'Alan Turing',   email: 'alan@xfcfam.org', createdAt: now })
  }

  override async terminate(): Promise<void> {
    this.state.users.clear()
  }

  async findById(id: string): Promise<User | null> {
    return this.state.users.get(id) ?? null
  }

  async findAll(): Promise<User[]> {
    return [...this.state.users.values()]
  }

  async create(user: User): Promise<User> {
    this.state.users.set(user.id, user)
    return user
  }

  async update(id: string, patch: Partial<Omit<User, 'id' | 'createdAt'>>): Promise<User | null> {
    const existing = this.state.users.get(id)
    if (existing === undefined) return null
    const updated: User = { ...existing, ...patch }
    this.state.users.set(id, updated)
    return updated
  }

  async delete(id: string): Promise<boolean> {
    return this.state.users.delete(id)
  }
}
