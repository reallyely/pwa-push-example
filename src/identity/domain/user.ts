import { isValid as isValidRole } from './role.js';
import type { Role } from './role.js';

const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface UserProps {
  id: string;
  email: string;
  passwordHash: string;
  role: Role;
  createdAt: Date;
}

export class User {
  id: string;
  email: string;
  passwordHash: string;
  role: Role;
  createdAt: Date;

  constructor({ id, email, passwordHash, role, createdAt }: UserProps) {
    this.id = id;
    this.email = email;
    this.passwordHash = passwordHash;
    this.role = role;
    this.createdAt = createdAt;
  }

  static register({ id, email, passwordHash, role, createdAt }: UserProps): User {
    if (!email || typeof email !== 'string' || !EMAIL_SHAPE.test(email)) {
      throw new Error('User requires a valid email');
    }
    if (!passwordHash || typeof passwordHash !== 'string') {
      throw new Error('User requires a non-empty passwordHash');
    }
    if (!isValidRole(role)) {
      throw new Error('User requires a valid role');
    }
    return new User({ id, email, passwordHash, role, createdAt });
  }
}
