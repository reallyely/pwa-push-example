import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { GetCurrentUser } from '#identity/application/get-current-user.js';
import { SqliteSessionRepository } from '#identity/infrastructure/sqlite-session-repository.js';
import { SqliteUserRepository } from '#identity/infrastructure/sqlite-user-repository.js';

export function parseCookie(cookieHeader: string | undefined, name: string): string | undefined {
  if (!cookieHeader) return undefined;
  for (const part of cookieHeader.split(';')) {
    const separatorIndex = part.indexOf('=');
    if (separatorIndex === -1) continue;
    const key = part.slice(0, separatorIndex).trim();
    if (key === name) {
      return decodeURIComponent(part.slice(separatorIndex + 1).trim());
    }
  }
  return undefined;
}

// Deliberately not Nest-DI-constructed: builds its own GetCurrentUser from
// the sqlite repositories directly (same bypass-DI pattern the repositories
// already use for getDb()). This lets any context's controllers
// @UseGuards(SessionAuthGuard) by importing the class directly, without that
// context's module importing IdentityModule — IdentityModule already imports
// NotificationDeliveryModule the other direction, so the reverse import
// would create a module cycle.
@Injectable()
export class SessionAuthGuard implements CanActivate {
  private getCurrentUser = new GetCurrentUser(new SqliteSessionRepository(), new SqliteUserRepository());

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = parseCookie(request.headers.cookie, 'session');

    try {
      const user = await this.getCurrentUser.execute({ token });
      (request as any).user = user;
      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }
}
