const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'users.json');
const NOTIFICATIONS_FILE = path.join(DATA_DIR, 'notifications.json');
const SCHEDULED_FILE = path.join(DATA_DIR, 'scheduled.json');
const NOTIFICATION_RECORDS_FILE = path.join(DATA_DIR, 'notification-records.json');

function load() {
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

function save(users) {
  const tmpFile = `${DATA_FILE}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(Array.from(users.entries()), null, 2));
  fs.renameSync(tmpFile, DATA_FILE);
}

function loadNotifications() {
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

function saveNotifications(notifications) {
  const tmpFile = `${NOTIFICATIONS_FILE}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(notifications, null, 2));
  fs.renameSync(tmpFile, NOTIFICATIONS_FILE);
}

function loadScheduled() {
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

function saveScheduled(scheduled) {
  const tmpFile = `${SCHEDULED_FILE}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(scheduled, null, 2));
  fs.renameSync(tmpFile, SCHEDULED_FILE);
}

// Returns null (not []) when the file has never been written, so a caller
// can distinguish "not yet migrated from the legacy notifications.json /
// scheduled.json files" from "migrated, but currently empty".
function loadNotificationRecords() {
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

function saveNotificationRecords(records) {
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
