import { Injectable } from '@nestjs/common';
import { getDb } from '#sqlite';
import { User, type Role } from 'domain/identity';
import type { UserRepository } from '#identity/application/ports.js';

interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  role: string;
  created_at: string;
}

function rowToEntity(row: UserRow): User {
  return new User({
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash,
    role: row.role as Role,
    createdAt: new Date(row.created_at),
  });
}

@Injectable()
export class SqliteUserRepository implements UserRepository {
  private db = getDb();

  constructor() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL,
        created_at TEXT NOT NULL
      )
    `);
  }

  async findByEmail(email: string): Promise<User | null> {
    const row = this.db.prepare(`SELECT id, email, password_hash, role, created_at FROM users WHERE email = ?`).get(email) as UserRow | undefined;
    return row ? rowToEntity(row) : null;
  }

  async findById(id: string): Promise<User | null> {
    const row = this.db.prepare(`SELECT id, email, password_hash, role, created_at FROM users WHERE id = ?`).get(id) as UserRow | undefined;
    return row ? rowToEntity(row) : null;
  }

  async findAll(): Promise<User[]> {
    const rows = this.db.prepare(`SELECT id, email, password_hash, role, created_at FROM users`).all() as unknown as UserRow[];
    return rows.map(rowToEntity);
  }

  async save(user: User): Promise<void> {
    this.db.prepare(`
      INSERT INTO users (id, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET email = excluded.email, password_hash = excluded.password_hash, role = excluded.role, created_at = excluded.created_at
    `).run(user.id, user.email, user.passwordHash, user.role, user.createdAt.toISOString());
  }
}
