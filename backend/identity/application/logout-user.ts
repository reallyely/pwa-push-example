import type { SessionRepository } from './ports.js';

interface LogoutUserRequest {
  token: string;
}

export class LogoutUser {
  constructor(private sessionRepository: SessionRepository) {}

  async execute({ token }: LogoutUserRequest): Promise<void> {
    await this.sessionRepository.deleteByToken(token);
  }
}
