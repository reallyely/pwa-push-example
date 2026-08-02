import { Injectable } from '@nestjs/common';
import { getDb } from '#sqlite';
import { Notification, STATUSES, type NotificationStatus, type Notification as NotificationEntity } from 'domain/notification-delivery';
import type { NotificationRepository } from '#notification-delivery/application/ports.js';

export interface NotificationRecord {
  id: string;
  recipientId: string;
  title: string;
  description: string;
  scheduledDateTime: string;
  icon: string | null;
  status: string;
  sentDateTime: string | null;
  failureReason: string | null;
}

function toEntity(record: NotificationRecord): NotificationEntity {
  return new Notification({
    id: record.id,
    recipientId: record.recipientId,
    title: record.title,
    description: record.description,
    scheduledDateTime: new Date(record.scheduledDateTime),
    icon: record.icon,
    status: record.status as NotificationStatus,
    sentDateTime: record.sentDateTime ? new Date(record.sentDateTime) : null,
    failureReason: record.failureReason,
  });
}

function toRecord(notification: NotificationEntity): NotificationRecord {
  return {
    id: notification.id,
    recipientId: notification.recipientId,
    title: notification.title,
    description: notification.description,
    scheduledDateTime: notification.scheduledDateTime.toISOString(),
    icon: notification.icon,
    status: notification.status,
    sentDateTime: notification.sentDateTime ? notification.sentDateTime.toISOString() : null,
    failureReason: notification.failureReason,
  };
}

@Injectable()
export class SqliteNotificationRepository implements NotificationRepository {
  private db = getDb();
  // Ids claimed by claimDueNotifications() but not yet saved back with a
  // terminal status — closes the gap an overlapping tick could otherwise
  // race through. Not part of NotificationStatus; see
  // "Claiming due notifications must be atomic" in the model doc.
  private claimedIds: Set<string> = new Set();

  constructor() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        recipientId TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        scheduledDateTime TEXT NOT NULL,
        icon TEXT,
        status TEXT NOT NULL,
        sentDateTime TEXT,
        failureReason TEXT
      )
    `);
  }

  async findById(id: string): Promise<NotificationEntity | null> {
    const row = this.db.prepare(`SELECT * FROM notifications WHERE id = ?`).get(id) as NotificationRecord | undefined;
    return row ? toEntity(row) : null;
  }

  async findAll(): Promise<NotificationEntity[]> {
    const rows = this.db.prepare(`SELECT * FROM notifications`).all() as unknown as NotificationRecord[];
    return rows.map(toEntity);
  }

  async save(notification: NotificationEntity): Promise<void> {
    const record = toRecord(notification);
    this.db.prepare(`
      INSERT INTO notifications (id, recipientId, title, description, scheduledDateTime, icon, status, sentDateTime, failureReason)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        recipientId = excluded.recipientId,
        title = excluded.title,
        description = excluded.description,
        scheduledDateTime = excluded.scheduledDateTime,
        icon = excluded.icon,
        status = excluded.status,
        sentDateTime = excluded.sentDateTime,
        failureReason = excluded.failureReason
    `).run(
      record.id,
      record.recipientId,
      record.title,
      record.description,
      record.scheduledDateTime,
      record.icon,
      record.status,
      record.sentDateTime,
      record.failureReason,
    );
    this.claimedIds.delete(notification.id);
  }

  async claimDueNotifications(now: Date): Promise<NotificationEntity[]> {
    const rows = this.db.prepare(`SELECT * FROM notifications WHERE status = ? AND scheduledDateTime <= ?`)
      .all(STATUSES.SCHEDULED, now.toISOString()) as unknown as NotificationRecord[];
    const due = rows.filter((r) => !this.claimedIds.has(r.id));
    for (const record of due) {
      this.claimedIds.add(record.id);
    }
    return due.map(toEntity);
  }
}
