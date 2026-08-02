interface SessionProps {
  token: string;
  userId: string;
  expiresAt: Date;
}

interface IssueProps {
  token: string;
  userId: string;
  ttlMs: number;
}

export class Session {
  token: string;
  userId: string;
  expiresAt: Date;

  constructor({ token, userId, expiresAt }: SessionProps) {
    this.token = token;
    this.userId = userId;
    this.expiresAt = expiresAt;
  }

  static issue({ token, userId, ttlMs }: IssueProps): Session {
    if (!token || typeof token !== 'string') {
      throw new Error('Session requires a non-empty token');
    }
    if (!userId || typeof userId !== 'string') {
      throw new Error('Session requires a non-empty userId');
    }
    return new Session({ token, userId, expiresAt: new Date(Date.now() + ttlMs) });
  }

  isExpired(now: Date = new Date()): boolean {
    return this.expiresAt.getTime() <= now.getTime();
  }
}
