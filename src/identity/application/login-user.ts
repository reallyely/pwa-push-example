import { Session } from '#identity/domain/session.js';
import type { Role } from '#identity/domain/role.js';
import type { UserRepository, SessionRepository, PasswordHasher, GenerateSessionToken } from './ports.js';
import { identityError } from './errors.js';

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

interface LoginUserRequest {
  email: string;
  password: string;
}

interface LoginUserResponse {
  token: string;
  expiresAt: Date;
  user: { id: string; email: string; role: Role };
}

export class LoginUser {
  constructor(
    private userRepository: UserRepository,
    private sessionRepository: SessionRepository,
    private passwordHasher: PasswordHasher,
    private generateSessionToken: GenerateSessionToken,
  ) {}

  async execute({ email, password }: LoginUserRequest): Promise<LoginUserResponse> {
    const normalizedEmail = (email || '').trim().toLowerCase();
    const user = await this.userRepository.findByEmail(normalizedEmail);
    const passwordMatches = user ? await this.passwordHasher.verify(password, user.passwordHash) : false;
    if (!user || !passwordMatches) {
      throw identityError('invalid email or password', 'INVALID_CREDENTIALS');
    }

    const token = this.generateSessionToken();
    const session = Session.issue({ token, userId: user.id, ttlMs: SESSION_TTL_MS });
    await this.sessionRepository.save(session);

    return { token: session.token, expiresAt: session.expiresAt, user: { id: user.id, email: user.email, role: user.role } };
  }
}
