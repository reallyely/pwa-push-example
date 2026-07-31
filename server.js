require('dotenv').config();
const path = require('path');
const express = require('express');
const webpush = require('web-push');

const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT, PORT = 3000 } = process.env;

if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY || !VAPID_SUBJECT) {
  throw new Error('Missing VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT env vars');
}

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

// username -> { subscription: PushSubscriptionJSON | null }
const users = new Map();

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
  res.status(204).end();
});

app.get('/api/users', (req, res) => {
  const list = Array.from(users.entries()).map(([username, data]) => ({
    username,
    subscribed: !!data.subscription,
  }));
  res.json(list);
});

app.post('/api/send', async (req, res) => {
  const { username, title, body, icon } = req.body || {};
  const user = users.get(username);
  if (!user) {
    return res.status(404).json({ error: 'unknown username' });
  }
  if (!user.subscription) {
    return res.status(409).json({ error: 'user has no active push subscription' });
  }

  const payload = JSON.stringify({
    title: title || 'Demo notification',
    body: body || '',
    icon: icon || undefined,
  });

  try {
    // 'high' urgency maps to FCM high-priority, which Android's push service
    // wakes the device for even in Doze/App Standby. Without it, Chrome
    // defaults to 'normal' urgency, which Android can defer indefinitely
    // once the app is backgrounded/closed and the device goes idle.
    await webpush.sendNotification(user.subscription, payload, { urgency: 'high' });
    res.json({ ok: true });
  } catch (err) {
    if (err.statusCode === 404 || err.statusCode === 410) {
      user.subscription = null;
      return res.status(410).json({ error: 'subscription expired, ask user to re-register' });
    }
    console.error('sendNotification failed', err);
    res.status(500).json({ error: 'failed to send notification' });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
