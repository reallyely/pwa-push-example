const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'users.json');
const NOTIFICATIONS_FILE = path.join(DATA_DIR, 'notifications.json');
const SCHEDULED_FILE = path.join(DATA_DIR, 'scheduled.json');

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

module.exports = {
  load,
  save,
  loadNotifications,
  saveNotifications,
  loadScheduled,
  saveScheduled,
};
