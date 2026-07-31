require('dotenv').config();
const path = require('path');
const express = require('express');

const { JsonRecipientRepository } = require('./src/notification-delivery/infrastructure/json-recipient-repository');
const { JsonNotificationRepository } = require('./src/notification-delivery/infrastructure/json-notification-repository');
const { WebPushGateway } = require('./src/notification-delivery/infrastructure/web-push-gateway');

const { makeRegisterRecipient } = require('./src/notification-delivery/application/register-recipient');
const { makeSubscribeRecipient } = require('./src/notification-delivery/application/subscribe-recipient');
const { makeResubscribeRecipient } = require('./src/notification-delivery/application/resubscribe-recipient');
const { makeListRecipients } = require('./src/notification-delivery/application/list-recipients');
const { makeScheduleNotification } = require('./src/notification-delivery/application/schedule-notification');
const { makeCancelScheduledNotification } = require('./src/notification-delivery/application/cancel-scheduled-notification');
const { makeDeliverNotification } = require('./src/notification-delivery/application/deliver-notification');
const { makeRunDueNotifications } = require('./src/notification-delivery/application/run-due-notifications');
const { makeListNotifications } = require('./src/notification-delivery/application/list-notifications');

const { makeHttpRoutes } = require('./src/notification-delivery/interface/http-routes');

const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT, CRON_SECRET, PORT = 3000 } = process.env;

if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY || !VAPID_SUBJECT) {
  throw new Error('Missing VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT env vars');
}

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// --- Infrastructure adapters ---
const recipientRepository = new JsonRecipientRepository();
const notificationRepository = new JsonNotificationRepository();
const pushGateway = new WebPushGateway({
  vapidSubject: VAPID_SUBJECT,
  vapidPublicKey: VAPID_PUBLIC_KEY,
  vapidPrivateKey: VAPID_PRIVATE_KEY,
});

// --- Application use cases ---
const registerRecipient = makeRegisterRecipient({ recipientRepository });
const subscribeRecipient = makeSubscribeRecipient({ recipientRepository });
const resubscribeRecipient = makeResubscribeRecipient({ recipientRepository });
const listRecipients = makeListRecipients({ recipientRepository });

const deliverNotification = makeDeliverNotification({ notificationRepository, recipientRepository, pushGateway });
const scheduleNotification = makeScheduleNotification({ recipientRepository, notificationRepository, generateId });
const cancelScheduledNotification = makeCancelScheduledNotification({ notificationRepository });
const runDueNotifications = makeRunDueNotifications({ notificationRepository, deliverNotification });
const listNotifications = makeListNotifications({ notificationRepository });

// --- Interface ---
const app = express();

app.use('/', express.static(path.join(__dirname, 'public/client')));
app.use('/admin', express.static(path.join(__dirname, 'public/admin')));

app.use(makeHttpRoutes({
  vapidPublicKey: VAPID_PUBLIC_KEY,
  cronSecret: CRON_SECRET,
  registerRecipient,
  subscribeRecipient,
  resubscribeRecipient,
  listRecipients,
  scheduleNotification,
  cancelScheduledNotification,
  deliverNotification,
  runDueNotifications,
  listNotifications,
}));

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
  // Catch up on anything that came due while the process was down (e.g. the
  // Fly machine was stopped straight through the scheduled time), then keep
  // checking periodically for as long as this process happens to stay warm.
  runDueNotifications();
  setInterval(runDueNotifications, 60 * 1000);
});
