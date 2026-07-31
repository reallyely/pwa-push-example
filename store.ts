const fs = require('fs');
const path = require('path');
import type { PushSubscriptionJSON } from './src/notification-delivery/domain/recipient.ts';

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'users.json');
const NOTIFICATIONS_FILE = path.join(DATA_DIR, 'notifications.json');
const SCHEDULED_FILE = path.join(DATA_DIR, 'scheduled.json');
const NOTIFICATION_RECORDS_FILE = path.join(DATA_DIR, 'notification-records.json');

export interface UserRecord {
  subscription: PushSubscriptionJSON | null;
}

export interface LegacyNotificationEntry {
  id: string;
  username: string;
  title: string;
  body: string;
  sentAt: string;
  status: 'sent' | 'failed' | 'expired';
}

export interface LegacyScheduledEntry {
  id: string;
  username: string;
  title: string;
  body: string;
  icon?: string | null;
  sendAt: string;
  status: 'pending' | 'sending' | 'sent' | 'failed' | 'expired' | 'canceled';
  createdAt: string;
  sentAt: string | null;
  error?: string;
}

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

function load(): Map<string, UserRecord> {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) {
    return new Map();
  }
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const entries = JSON.parse(raw);
    return new Map(entries);
  } catch (err) {
    console.error(`[store] failed to read ${DATA_FILE}, starting empty`, err);
    return new Map();
  }
}

function save(users: Map<string, UserRecord>): void {
  const tmpFile = `${DATA_FILE}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(Array.from(users.entries()), null, 2));
  fs.renameSync(tmpFile, DATA_FILE);
}

function loadNotifications(): LegacyNotificationEntry[] {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(NOTIFICATIONS_FILE)) {
    return [];
  }
  try {
    const raw = fs.readFileSync(NOTIFICATIONS_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error(`[store] failed to read ${NOTIFICATIONS_FILE}, starting empty`, err);
    return [];
  }
}

function saveNotifications(notifications: LegacyNotificationEntry[]): void {
  const tmpFile = `${NOTIFICATIONS_FILE}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(notifications, null, 2));
  fs.renameSync(tmpFile, NOTIFICATIONS_FILE);
}

function loadScheduled(): LegacyScheduledEntry[] {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(SCHEDULED_FILE)) {
    return [];
  }
  try {
    const raw = fs.readFileSync(SCHEDULED_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error(`[store] failed to read ${SCHEDULED_FILE}, starting empty`, err);
    return [];
  }
}

function saveScheduled(scheduled: LegacyScheduledEntry[]): void {
  const tmpFile = `${SCHEDULED_FILE}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(scheduled, null, 2));
  fs.renameSync(tmpFile, SCHEDULED_FILE);
}

// Returns null (not []) when the file has never been written, so a caller
// can distinguish "not yet migrated from the legacy notifications.json /
// scheduled.json files" from "migrated, but currently empty".
function loadNotificationRecords(): NotificationRecord[] | null {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(NOTIFICATION_RECORDS_FILE)) {
    return null;
  }
  try {
    const raw = fs.readFileSync(NOTIFICATION_RECORDS_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error(`[store] failed to read ${NOTIFICATION_RECORDS_FILE}, starting empty`, err);
    return [];
  }
}

function saveNotificationRecords(records: NotificationRecord[]): void {
  const tmpFile = `${NOTIFICATION_RECORDS_FILE}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(records, null, 2));
  fs.renameSync(tmpFile, NOTIFICATION_RECORDS_FILE);
}

module.exports = {
  load,
  save,
  loadNotifications,
  saveNotifications,
  loadScheduled,
  saveScheduled,
  loadNotificationRecords,
  saveNotificationRecords,
};
