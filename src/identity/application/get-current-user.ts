import type { Role } from '#identity/domain/role.js';
import type { SessionRepository, UserRepository } from './ports.js';
import { identityError } from './errors.js';

interface GetCurrentUserRequest {
  token: string | undefined | null;
}

interface GetCurrentUserResponse {
  id: string;
  email: string;
  role: Role;
}

export class GetCurrentUser {
  constructor(
    private sessionRepository: SessionRepository,
    private userRepository: UserRepository,
  ) {}

  async execute({ token }: GetCurrentUserRequest): Promise<GetCurrentUserResponse> {
    if (!token) {
      throw identityError('not authenticated', 'UNAUTHENTICATED');
    }

    const session = await this.sessionRepository.findByToken(token);
    if (!session || session.isExpired()) {
      throw identityError('not authenticated', 'UNAUTHENTICATED');
    }

    const user = await this.userRepository.findById(session.userId);
    if (!user) {
      throw identityError('not authenticated', 'UNAUTHENTICATED');
    }

    return { id: user.id, email: user.email, role: user.role };
  }
}
