import type { Role } from 'domain/identity';
import type { UserRepository } from './ports.js';

export interface UserView {
  id: string;
  email: string;
  role: Role;
}

export class ListUsers {
  constructor(private userRepository: UserRepository) {}

  async execute(): Promise<UserView[]> {
    const users = await this.userRepository.findAll();
    return users.map((user) => ({ id: user.id, email: user.email, role: user.role }));
  }
}
