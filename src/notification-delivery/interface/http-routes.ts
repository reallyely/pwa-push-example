import express from 'express';
import type { RecipientView } from '#notification-delivery/application/list-recipients.ts';
import type { DeliverNotificationResponse } from '#notification-delivery/application/deliver-notification.ts';
import type { Notification } from '#notification-delivery/domain/notification.ts';
import { toNotificationView, toSendOutcome } from './notification-presenter.ts';
import { sendError } from './http-errors.ts';
import type { NotificationDeliveryError } from '#notification-delivery/application/errors.ts';

interface HttpRoutesConfig {
  vapidPublicKey: string;
  cronSecret?: string;
  registerRecipient: (request: { username: string }) => Promise<{ username: string }>;
  subscribeRecipient: (request: { username: string; subscription: any }) => Promise<void>;
  resubscribeRecipient: (request: { oldEndpoint: string; subscription: any }) => Promise<void>;
  listRecipients: () => Promise<RecipientView[]>;
  scheduleNotification: (request: {
    recipientId: string;
    title: string;
    description: string;
    scheduledDateTime: Date;
    icon?: string;
  }) => Promise<{ notificationId: string }>;
  cancelScheduledNotification: (request: { notificationId: string }) => Promise<void>;
  deliverNotification: (request: { notificationId: string }) => Promise<DeliverNotificationResponse>;
  runDueNotifications: () => Promise<{ checked: number; sent: number }>;
  listNotifications: (request: { view: 'scheduled' | 'history' }) => Promise<Notification[]>;
}

export function makeHttpRoutes({
  vapidPublicKey,
  cronSecret,
  registerRecipient,
  subscribeRecipient,
  resubscribeRecipient,
  listRecipients,
  scheduleNotification,
  cancelScheduledNotification,
  deliverNotification,
  runDueNotifications,
  listNotifications,
}: HttpRoutesConfig) {
  const router = express.Router();
  router.use(express.json());

  router.get('/api/vapid-public-key', (req: any, res: any) => {
    res.json({ publicKey: vapidPublicKey });
  });

  router.post('/api/register', async (req: any, res: any) => {
    try {
      const result = await registerRecipient({ username: (req.body || {}).username });
      res.status(201).json(result);
    } catch (err) {
      sendError(res, err as NotificationDeliveryError);
    }
  });

  router.post('/api/subscribe', async (req: any, res: any) => {
    try {
      const { username, subscription } = req.body || {};
      await subscribeRecipient({ username, subscription });
      res.status(204).end();
    } catch (err) {
      sendError(res, err as NotificationDeliveryError);
    }
  });

  router.post('/api/resubscribe', async (req: any, res: any) => {
    try {
      const { oldEndpoint, subscription } = req.body || {};
      await resubscribeRecipient({ oldEndpoint, subscription });
      res.status(204).end();
    } catch (err) {
      sendError(res, err as NotificationDeliveryError);
    }
  });

  router.get('/api/users', async (req: any, res: any) => {
    res.json(await listRecipients());
  });

  router.post('/api/send', async (req: any, res: any) => {
    try {
      const { username, title, body, icon } = req.body || {};
      const { notificationId } = await scheduleNotification({
        recipientId: username,
        title: title || 'Demo notification',
        description: body || '',
        scheduledDateTime: new Date(),
        icon,
      });
      const result = await deliverNotification({ notificationId });
      const { httpStatus, body: responseBody } = toSendOutcome(result);
      res.status(httpStatus).json(responseBody);
    } catch (err) {
      sendError(res, err as NotificationDeliveryError);
    }
  });

  router.get('/api/notifications', async (req: any, res: any) => {
    const list = await listNotifications({ view: 'history' });
    res.json(list.map(toNotificationView));
  });

  router.post('/api/schedule', async (req: any, res: any) => {
    try {
      const { username, title, body, icon, sendAt } = req.body || {};
      if (!sendAt) {
        return res.status(400).json({ error: 'sendAt is required' });
      }
      const scheduledDateTime = new Date(sendAt);
      if (Number.isNaN(scheduledDateTime.getTime())) {
        return res.status(400).json({ error: 'sendAt must be a valid date/time' });
      }
      const { notificationId } = await scheduleNotification({
        recipientId: username,
        title: title || 'Demo notification',
        description: body || '',
        scheduledDateTime,
        icon,
      });
      res.status(201).json({
        id: notificationId,
        username,
        title: title || 'Demo notification',
        body: body || '',
        icon,
        sendAt: scheduledDateTime.toISOString(),
        status: 'pending',
      });
    } catch (err) {
      sendError(res, err as NotificationDeliveryError);
    }
  });

  router.get('/api/scheduled', async (req: any, res: any) => {
    const list = await listNotifications({ view: 'scheduled' });
    res.json(list.map(toNotificationView));
  });

  router.delete('/api/scheduled/:id', async (req: any, res: any) => {
    try {
      await cancelScheduledNotification({ notificationId: req.params.id });
      res.status(204).end();
    } catch (err) {
      sendError(res, err as NotificationDeliveryError);
    }
  });

  router.get('/api/cron/tick', async (req: any, res: any) => {
    if (cronSecret && req.get('x-cron-secret') !== cronSecret) {
      return res.status(401).json({ error: 'unauthorized' });
    }
    res.json(await runDueNotifications());
  });

  return router;
}
