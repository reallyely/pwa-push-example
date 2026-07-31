import * as store from '#store';
import { Notification } from '#notification-delivery/domain/notification.ts';
import { STATUSES } from '#notification-delivery/domain/notification-status.ts';
import { migrateLegacyNotificationFiles } from './migrate-legacy-notification-files.ts';
import type { LegacyNotificationEntry, LegacyScheduledEntry } from './migrate-legacy-notification-files.ts';
import type { NotificationRepository } from '#notification-delivery/application/ports.ts';
import type { Notification as NotificationEntity } from '#notification-delivery/domain/notification.ts';

const NOTIFICATION_RECORDS_FILE = store.dataFilePath('notification-records.json');
const LEGACY_NOTIFICATIONS_FILE = store.dataFilePath('notifications.json');
const LEGACY_SCHEDULED_FILE = store.dataFilePath('scheduled.json');

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
    status: record.status,
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

export class JsonNotificationRepository implements NotificationRepository {
  records: NotificationRecord[];
  // Ids claimed by claimDueNotifications() but not yet saved back with a
  // terminal status — closes the gap an overlapping tick could otherwise
  // race through. Not part of NotificationStatus; see
  // "Claiming due notifications must be atomic" in the model doc.
  private claimedIds: Set<string>;

  constructor() {
    const existing = store.readJsonFile<NotificationRecord[]>(NOTIFICATION_RECORDS_FILE);
    if (existing !== undefined) {
      this.records = existing;
    } else {
      this.records = migrateLegacyNotificationFiles({
        legacyNotifications: store.readJsonFile<LegacyNotificationEntry[]>(LEGACY_NOTIFICATIONS_FILE) ?? [],
        legacyScheduled: store.readJsonFile<LegacyScheduledEntry[]>(LEGACY_SCHEDULED_FILE) ?? [],
      });
      console.log(`[notification-delivery] migrated ${this.records.length} legacy notification record(s)`);
      this.persist();
    }
    this.claimedIds = new Set();
  }

  async findById(id: string): Promise<NotificationEntity | null> {
    const record = this.records.find((r) => r.id === id);
    return record ? toEntity(record) : null;
  }

  async findAll(): Promise<NotificationEntity[]> {
    return this.records.map(toEntity);
  }

  async save(notification: NotificationEntity): Promise<void> {
    const record = toRecord(notification);
    const index = this.records.findIndex((r) => r.id === record.id);
    if (index === -1) {
      this.records.push(record);
    } else {
      this.records[index] = record;
    }
    this.claimedIds.delete(record.id);
    this.persist();
  }

  async claimDueNotifications(now: Date): Promise<NotificationEntity[]> {
    const due = this.records.filter(
      (r) => r.status === STATUSES.SCHEDULED
        && !this.claimedIds.has(r.id)
        && new Date(r.scheduledDateTime).getTime() <= now.getTime()
    );
    for (const record of due) {
      this.claimedIds.add(record.id);
    }
    return due.map(toEntity);
  }

  private persist(): void {
    store.writeJsonFile(NOTIFICATION_RECORDS_FILE, this.records);
  }
}
