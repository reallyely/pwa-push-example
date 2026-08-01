import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";

import { JsonRecipientRepository } from "#notification-delivery/infrastructure/json-recipient-repository.ts";
import { JsonNotificationRepository } from "#notification-delivery/infrastructure/json-notification-repository.ts";
import { WebPushGateway } from "#notification-delivery/infrastructure/web-push-gateway.ts";

import { makeRegisterRecipient } from "#notification-delivery/application/register-recipient.ts";
import { makeSubscribeRecipient } from "#notification-delivery/application/subscribe-recipient.ts";
import { makeResubscribeRecipient } from "#notification-delivery/application/resubscribe-recipient.ts";
import { makeListRecipients } from "#notification-delivery/application/list-recipients.ts";
import { makeScheduleNotification } from "#notification-delivery/application/schedule-notification.ts";
import { makeCancelScheduledNotification } from "#notification-delivery/application/cancel-scheduled-notification.ts";
import { makeDeliverNotification } from "#notification-delivery/application/deliver-notification.ts";
import { makeRunDueNotifications } from "#notification-delivery/application/run-due-notifications.ts";
import { makeListNotifications } from "#notification-delivery/application/list-notifications.ts";
import { makeGetNotification } from "#notification-delivery/application/get-notification.ts";

import { makeHttpRoutes } from "#notification-delivery/interface/http-routes.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const {
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY,
  VAPID_SUBJECT,
  CRON_SECRET,
  PORT = 3000,
} = process.env;

if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY || !VAPID_SUBJECT) {
  throw new Error(
    "Missing VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT env vars",
  );
}

function generateId(): string {
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

const deliverNotification = makeDeliverNotification({
  notificationRepository,
  recipientRepository,
  pushGateway,
});
const scheduleNotification = makeScheduleNotification({
  recipientRepository,
  notificationRepository,
  generateId,
});
const cancelScheduledNotification = makeCancelScheduledNotification({
  notificationRepository,
});
const runDueNotifications = makeRunDueNotifications({
  notificationRepository,
  deliverNotification,
});
const listNotifications = makeListNotifications({ notificationRepository });
const getNotification = makeGetNotification({ notificationRepository });

// --- Interface ---
const app = express();

app.use("/", express.static(path.join(__dirname, "public/client")));
app.use("/admin", express.static(path.join(__dirname, "public/admin")));

app.use(
  makeHttpRoutes({
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
    getNotification,
  }),
);

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
  // Catch up on anything that came due while the process was down (e.g. the
  // Fly machine was stopped straight through the scheduled time), then keep
  // checking periodically for as long as this process happens to stay warm.
  runDueNotifications();
  setInterval(runDueNotifications, 60 * 1000);
});
