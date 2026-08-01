import { Injectable } from '@nestjs/common';
import { getDb } from '#sqlite';
import { Recipient } from '#notification-delivery/domain/recipient.js';
import type { PushSubscriptionJSON, Recipient as RecipientEntity } from '#notification-delivery/domain/recipient.js';
import type { RecipientRepository } from '#notification-delivery/application/ports.js';

export interface RecipientRecord {
  subscription: PushSubscriptionJSON | null;
}

interface RecipientRow {
  username: string;
  subscription: string | null;
}

function toEntity(username: string, record: RecipientRecord): RecipientEntity {
  return new Recipient({ username, pushSubscription: record.subscription });
}

function rowToRecord(row: RecipientRow): RecipientRecord {
  return { subscription: row.subscription ? JSON.parse(row.subscription) : null };
}

@Injectable()
export class SqliteRecipientRepository implements RecipientRepository {
  private db = getDb();

  constructor() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS recipients (
        username TEXT PRIMARY KEY,
        subscription TEXT
      )
    `);
  }

  async findByUsername(username: string): Promise<RecipientEntity | null> {
    const row = this.db.prepare(`SELECT username, subscription FROM recipients WHERE username = ?`).get(username) as RecipientRow | undefined;
    return row ? toEntity(username, rowToRecord(row)) : null;
  }

  async findByEndpoint(endpoint: string): Promise<RecipientEntity | null> {
    const rows = this.db.prepare(`SELECT username, subscription FROM recipients WHERE subscription IS NOT NULL`).all() as unknown as RecipientRow[];
    for (const row of rows) {
      const record = rowToRecord(row);
      if (record.subscription && record.subscription.endpoint === endpoint) {
        return toEntity(row.username, record);
      }
    }
    return null;
  }

  async findAll(): Promise<RecipientEntity[]> {
    const rows = this.db.prepare(`SELECT username, subscription FROM recipients`).all() as unknown as RecipientRow[];
    return rows.map((row) => toEntity(row.username, rowToRecord(row)));
  }

  async save(recipient: RecipientEntity): Promise<void> {
    this.db.prepare(`
      INSERT INTO recipients (username, subscription) VALUES (?, ?)
      ON CONFLICT(username) DO UPDATE SET subscription = excluded.subscription
    `).run(recipient.username, recipient.pushSubscription ? JSON.stringify(recipient.pushSubscription) : null);
  }
}
