require('dotenv').config();
const path = require('path');
const express = require('express');
const webpush = require('web-push');
const store = require('./store');

const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT, PORT = 3000 } = process.env;

if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY || !VAPID_SUBJECT) {
  throw new Error('Missing VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT env vars');
}

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

// username -> { subscription: PushSubscriptionJSON | null }
// Loaded from disk at startup and rewritten on every mutation, so
// registered users/subscriptions survive server restarts and redeploys.
const users = store.load();
console.log(`[store] loaded ${users.size} registered user(s)`);

// Array of { id, username, title, body, sentAt, status }, newest last.
// Loaded from disk at startup and rewritten on every send, so the admin
// dashboard can show a history of notifications across restarts/redeploys.
const notifications = store.loadNotifications();
console.log(`[store] loaded ${notifications.length} notification record(s)`);

// Array of { id, username, title, body, icon, sendAt, status, createdAt, sentAt },
// newest last. status is 'pending' | 'sent' | 'failed' | 'expired' | 'canceled'.
// Loaded from disk at startup and rewritten on every schedule/cancel/fire, so
// scheduled sends survive restarts/redeploys — including the machine being
// asleep (Fly scale-to-zero) right through the scheduled time.
const scheduled = store.loadScheduled();
console.log(`[store] loaded ${scheduled.length} scheduled notification(s)`);

function persist() {
  store.save(users);
}

function persistNotifications() {
  store.saveNotifications(notifications);
}

function persistScheduled() {
  store.saveScheduled(scheduled);
}

function recordNotification({ username, title, body, sentAt, status }) {
  notifications.push({
    id: `${sentAt.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
    username,
    title,
    body,
    sentAt: sentAt.toISOString(),
    status,
  });
  persistNotifications();
}

const app = express();
app.use(express.json());

app.use('/', express.static(path.join(__dirname, 'public/client')));
app.use('/admin', express.static(path.join(__dirname, 'public/admin')));

app.get('/api/vapid-public-key', (req, res) => {
  res.json({ publicKey: VAPID_PUBLIC_KEY });
});

app.post('/api/register', (req, res) => {
  const { username } = req.body || {};
  if (!username || typeof username !== 'string' || !username.trim()) {
    return res.status(400).json({ error: 'username is required' });
  }
  const name = username.trim();
  if (!users.has(name)) {
    users.set(name, { subscription: null });
    persist();
  }
  res.status(201).json({ username: name });
});

app.post('/api/subscribe', (req, res) => {
  const { username, subscription } = req.body || {};
  if (!username || !users.has(username)) {
    return res.status(404).json({ error: 'unknown username, register first' });
  }
  if (!subscription || !subscription.endpoint) {
    return res.status(400).json({ error: 'subscription is required' });
  }
  users.get(username).subscription = subscription;
  persist();
  res.status(204).end();
});

app.post('/api/resubscribe', (req, res) => {
  const { oldEndpoint, subscription } = req.body || {};
  if (!subscription || !subscription.endpoint) {
    return res.status(400).json({ error: 'subscription is required' });
  }
  const user = Array.from(users.values()).find(
    (u) => u.subscription && u.subscription.endpoint === oldEndpoint
  );
  if (!user) {
    return res.status(404).json({ error: 'no matching subscription found' });
  }
  user.subscription = subscription;
  persist();
  res.status(204).end();
});

app.get('/api/users', (req, res) => {
  const list = Array.from(users.entries()).map(([username, data]) => ({
    username,
    subscribed: !!data.subscription,
  }));
  res.json(list);
});

// Sends a push to a registered user right now. Shared by the immediate
// /api/send route and by runDueScheduled() when a scheduled notification
// comes due. Returns { ok: true } or { ok: false, httpStatus, error }
// rather than touching the response directly, so both callers can decide
// how to react.
async function deliverPush({ username, title, body, icon }) {
  const user = users.get(username);
  if (!user) {
    return { ok: false, httpStatus: 404, error: 'unknown username' };
  }
  if (!user.subscription) {
    return { ok: false, httpStatus: 409, error: 'user has no active push subscription' };
  }

  const notificationTitle = title || 'Demo notification';
  const notificationBody = body || '';

  const payload = JSON.stringify({
    title: notificationTitle,
    body: notificationBody,
    icon: icon || undefined,
  });

  const sentAt = new Date();
  const endpoint = user.subscription.endpoint;
  console.log(
    `[push] sending to ${username} at ${sentAt.toISOString()} (endpoint ...${endpoint.slice(-24)})`
  );

  try {
    // 'high' urgency maps to FCM high-priority, which Android's push service
    // wakes the device for even in Doze/App Standby. Without it, Chrome
    // defaults to 'normal' urgency, which Android can defer indefinitely
    // once the app is backgrounded/closed and the device goes idle.
    const result = await webpush.sendNotification(user.subscription, payload, { urgency: 'high' });
    const tookMs = Date.now() - sentAt.getTime();
    console.log(
      `[push] accepted by push service for ${username} in ${tookMs}ms (status ${result.statusCode})`
    );
    recordNotification({ username, title: notificationTitle, body: notificationBody, sentAt, status: 'sent' });
    return { ok: true };
  } catch (err) {
    const tookMs = Date.now() - sentAt.getTime();
    if (err.statusCode === 404 || err.statusCode === 410) {
      user.subscription = null;
      persist();
      console.warn(
        `[push] subscription gone for ${username} after ${tookMs}ms (status ${err.statusCode}) — cleared`
      );
      recordNotification({ username, title: notificationTitle, body: notificationBody, sentAt, status: 'expired' });
      return { ok: false, httpStatus: 410, error: 'subscription expired, ask user to re-register' };
    }
    console.error(`[push] send failed for ${username} after ${tookMs}ms`, err);
    recordNotification({ username, title: notificationTitle, body: notificationBody, sentAt, status: 'failed' });
    return { ok: false, httpStatus: 500, error: 'failed to send notification' };
  }
}

app.post('/api/send', async (req, res) => {
  const { username, title, body, icon } = req.body || {};
  const result = await deliverPush({ username, title, body, icon });
  if (!result.ok) {
    return res.status(result.httpStatus).json({ error: result.error });
  }
  res.json({ ok: true });
});

app.get('/api/notifications', (req, res) => {
  const list = [...notifications].sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt));
  res.json(list);
});

app.post('/api/schedule', (req, res) => {
  const { username, title, body, icon, sendAt } = req.body || {};
  if (!username || !users.has(username)) {
    return res.status(404).json({ error: 'unknown username, register first' });
  }
  if (!sendAt) {
    return res.status(400).json({ error: 'sendAt is required' });
  }
  const sendAtDate = new Date(sendAt);
  if (Number.isNaN(sendAtDate.getTime())) {
    return res.status(400).json({ error: 'sendAt must be a valid date/time' });
  }
  if (sendAtDate.getTime() <= Date.now()) {
    return res.status(400).json({ error: 'sendAt must be in the future' });
  }

  const entry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    username,
    title: title || 'Demo notification',
    body: body || '',
    icon: icon || undefined,
    sendAt: sendAtDate.toISOString(),
    status: 'pending',
    createdAt: new Date().toISOString(),
    sentAt: null,
  };
  scheduled.push(entry);
  persistScheduled();
  res.status(201).json(entry);
});

app.get('/api/scheduled', (req, res) => {
  const list = [...scheduled].sort((a, b) => new Date(a.sendAt) - new Date(b.sendAt));
  res.json(list);
});

app.delete('/api/scheduled/:id', (req, res) => {
  const entry = scheduled.find((s) => s.id === req.params.id);
  if (!entry) {
    return res.status(404).json({ error: 'no such scheduled notification' });
  }
  if (entry.status !== 'pending') {
    return res.status(409).json({ error: `cannot cancel a notification that is already ${entry.status}` });
  }
  entry.status = 'canceled';
  persistScheduled();
  res.status(204).end();
});

// Finds every pending scheduled notification whose time has come (including
// ones that were due while this machine was stopped) and sends them. Safe to
// call repeatedly/concurrently-ish since each entry is flipped out of
// 'pending' before its async send resolves.
async function runDueScheduled() {
  const now = Date.now();
  const due = scheduled.filter((s) => s.status === 'pending' && new Date(s.sendAt).getTime() <= now);
  if (due.length === 0) {
    return { checked: scheduled.length, sent: 0 };
  }

  console.log(`[schedule] ${due.length} notification(s) due`);
  let sent = 0;
  for (const entry of due) {
    entry.status = 'sending';
    persistScheduled();
    const result = await deliverPush({
      username: entry.username,
      title: entry.title,
      body: entry.body,
      icon: entry.icon,
    });
    entry.status = result.ok ? 'sent' : 'failed';
    entry.sentAt = new Date().toISOString();
    if (!result.ok) {
      entry.error = result.error;
    }
    persistScheduled();
    if (result.ok) sent += 1;
  }
  return { checked: scheduled.length, sent };
}

// Woken by an external scheduler (see .github/workflows/cron.yml) hitting
// this URL roughly once a minute. Any HTTP request wakes a stopped Fly
// machine (auto_start_machines), so this is what actually lets a scheduled
// send fire even after the machine has scaled to zero — Fly's own machine
// scheduling only supports recurring hourly/daily/monthly buckets, not an
// arbitrary one-off time picked by a user.
app.get('/api/cron/tick', async (req, res) => {
  const { CRON_SECRET } = process.env;
  if (CRON_SECRET && req.get('x-cron-secret') !== CRON_SECRET) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  const result = await runDueScheduled();
  res.json(result);
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
  // Catch up on anything that came due while the process was down (e.g. the
  // Fly machine was stopped straight through the scheduled time), then keep
  // checking periodically for as long as this process happens to stay warm.
  runDueScheduled();
  setInterval(runDueScheduled, 60 * 1000);
});
