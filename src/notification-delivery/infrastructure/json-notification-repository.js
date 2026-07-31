const store = require('../../../store');
const { Notification } = require('../domain/notification');
const { STATUSES } = require('../domain/notification-status');
const { migrateLegacyNotificationFiles } = require('./migrate-legacy-notification-files');

function toEntity(record) {
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

function toRecord(notification) {
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

class JsonNotificationRepository {
  constructor() {
    const existing = store.loadNotificationRecords();
    if (existing !== null) {
      this.records = existing;
    } else {
      this.records = migrateLegacyNotificationFiles({
        legacyNotifications: store.loadNotifications(),
        legacyScheduled: store.loadScheduled(),
      });
      console.log(`[notification-delivery] migrated ${this.records.length} legacy notification record(s)`);
      this._persist();
    }
    // Ids claimed by claimDueNotifications() but not yet saved back with a
    // terminal status — closes the gap an overlapping tick could otherwise
    // race through. Not part of NotificationStatus; see
    // "Claiming due notifications must be atomic" in the model doc.
    this._claimedIds = new Set();
  }

  async findById(id) {
    const record = this.records.find((r) => r.id === id);
    return record ? toEntity(record) : null;
  }

  async findAll() {
    return this.records.map(toEntity);
  }

  async save(notification) {
    const record = toRecord(notification);
    const index = this.records.findIndex((r) => r.id === record.id);
    if (index === -1) {
      this.records.push(record);
    } else {
      this.records[index] = record;
    }
    this._claimedIds.delete(record.id);
    this._persist();
  }

  async claimDueNotifications(now) {
    const due = this.records.filter(
      (r) => r.status === STATUSES.SCHEDULED
        && !this._claimedIds.has(r.id)
        && new Date(r.scheduledDateTime).getTime() <= now.getTime()
    );
    for (const record of due) {
      this._claimedIds.add(record.id);
    }
    return due.map(toEntity);
  }

  _persist() {
    store.saveNotificationRecords(this.records);
  }
}

module.exports = { JsonNotificationRepository };
