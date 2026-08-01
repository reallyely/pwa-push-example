import { User } from '#identity/domain/user.js';
import { isValid as isValidRole } from '#identity/domain/role.js';
import type { Role } from '#identity/domain/role.js';
import type { RegisterRecipient } from '#notification-delivery/application/register-recipient.js';
import type { UserRepository, PasswordHasher, GenerateId } from './ports.js';
import { identityError } from './errors.js';

const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface RegisterUserRequest {
  email: string;
  password: string;
  role: string;
}

interface RegisterUserResponse {
  id: string;
  email: string;
  role: Role;
}

export class RegisterUser {
  constructor(
    private userRepository: UserRepository,
    private passwordHasher: PasswordHasher,
    private generateId: GenerateId,
    private registerRecipient: RegisterRecipient,
  ) {}

  async execute({ email, password, role }: RegisterUserRequest): Promise<RegisterUserResponse> {
    const normalizedEmail = (email || '').trim().toLowerCase();
    if (!normalizedEmail || !EMAIL_SHAPE.test(normalizedEmail)) {
      throw identityError('a valid email is required', 'INVALID_INPUT');
    }
    if (!isValidRole(role)) {
      throw identityError('a valid role is required', 'INVALID_INPUT');
    }
    if (!password || password.length < 8) {
      throw identityError('password must be at least 8 characters', 'INVALID_INPUT');
    }

    const existing = await this.userRepository.findByEmail(normalizedEmail);
    if (existing) {
      throw identityError('email is already registered', 'EMAIL_TAKEN');
    }

    const passwordHash = await this.passwordHasher.hash(password);
    const id = this.generateId();
    const user = User.register({ id, email: normalizedEmail, passwordHash, role, createdAt: new Date() });
    await this.userRepository.save(user);

    await this.registerRecipient.execute({ username: user.id });

    return { id: user.id, email: user.email, role: user.role };
  }
}
