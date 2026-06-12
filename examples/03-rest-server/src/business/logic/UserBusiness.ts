import { StatelessBusiness } from '@xfcfam/xf'
import { randomUUID } from 'node:crypto'
import { R } from '../../repository/R.js'
import type { User } from '../../repository/transfers/User.js'

/**
 * Domain logic for users — proxies onto the Access layer for storage
 * and adds the business rules (id generation, default fields).
 */
export class UserBusiness extends StatelessBusiness {
  override async init(): Promise<void> {}
  override async terminate(): Promise<void> {}

  async findById(id: string): Promise<User | null> {
    return R.usersRepository.findById(id)
  }

  async list(): Promise<readonly User[]> {
    return R.usersRepository.findAll()
  }

  async create(input: { name: string; email: string }): Promise<User> {
    const user: User = {
      id: randomUUID(),
      name: input.name,
      email: input.email,
      createdAt: new Date(),
    }
    return R.usersRepository.create(user)
  }

  async update(id: string, patch: { name?: string; email?: string }): Promise<User | null> {
    return R.usersRepository.update(id, patch)
  }

  async delete(id: string): Promise<boolean> {
    return R.usersRepository.delete(id)
  }
}
