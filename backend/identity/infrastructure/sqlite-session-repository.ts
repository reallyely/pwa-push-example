import { Injectable } from '@nestjs/common';
import { getDb } from '#sqlite';
import { Session } from 'domain/identity';
import type { SessionRepository } from '#identity/application/ports.js';

interface SessionRow {
  token: string;
  user_id: string;
  expires_at: string;
}

function rowToEntity(row: SessionRow): Session {
  return new Session({ token: row.token, userId: row.user_id, expiresAt: new Date(row.expires_at) });
}

@Injectable()
export class SqliteSessionRepository implements SessionRepository {
  private db = getDb();

  constructor() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        token TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        expires_at TEXT NOT NULL
      )
    `);
  }

  async findByToken(token: string): Promise<Session | null> {
    const row = this.db.prepare(`SELECT token, user_id, expires_at FROM sessions WHERE token = ?`).get(token) as SessionRow | undefined;
    return row ? rowToEntity(row) : null;
  }

  async save(session: Session): Promise<void> {
    this.db.prepare(`
      INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)
      ON CONFLICT(token) DO UPDATE SET user_id = excluded.user_id, expires_at = excluded.expires_at
    `).run(session.token, session.userId, session.expiresAt.toISOString());
  }

  async deleteByToken(token: string): Promise<void> {
    this.db.prepare(`DELETE FROM sessions WHERE token = ?`).run(token);
  }
}
