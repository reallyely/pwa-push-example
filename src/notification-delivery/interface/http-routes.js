const express = require('express');

const ERROR_STATUS_BY_CODE = {
  NOT_FOUND: 404,
  INVALID_INPUT: 400,
  INVALID_SCHEDULE: 400,
  INVALID_TRANSITION: 409,
};

function sendError(res, err, fallbackStatus = 500) {
  const status = ERROR_STATUS_BY_CODE[err.code] || fallbackStatus;
  if (status === 500) console.error(err);
  res.status(status).json({ error: err.message });
}

function toWireStatus(notification) {
  switch (notification.status) {
    case 'Scheduled': return 'pending';
    case 'Sent': return 'sent';
    case 'Cancelled': return 'canceled';
    case 'Failed':
      return notification.failureReason === 'subscription-expired' ? 'expired' : 'failed';
    default: return notification.status;
  }
}

// Translates the domain shape (recipientId/description/scheduledDateTime/
// sentDateTime) into the wire shape public/admin/app.js already expects
// (username/body/sendAt/sentAt), so the frontend needs no changes.
function toNotificationView(notification) {
  return {
    id: notification.id,
    username: notification.recipientId,
    title: notification.title,
    body: notification.description,
    icon: notification.icon || undefined,
    sendAt: notification.scheduledDateTime.toISOString(),
    sentAt: notification.sentDateTime ? notification.sentDateTime.toISOString() : null,
    status: toWireStatus(notification),
  };
}

function makeHttpRoutes({
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
}) {
  const router = express.Router();
  router.use(express.json());

  router.get('/api/vapid-public-key', (req, res) => {
    res.json({ publicKey: vapidPublicKey });
  });

  router.post('/api/register', async (req, res) => {
    try {
      const result = await registerRecipient({ username: (req.body || {}).username });
      res.status(201).json(result);
    } catch (err) {
      sendError(res, err);
    }
  });

  router.post('/api/subscribe', async (req, res) => {
    try {
      const { username, subscription } = req.body || {};
      await subscribeRecipient({ username, subscription });
      res.status(204).end();
    } catch (err) {
      sendError(res, err);
    }
  });

  router.post('/api/resubscribe', async (req, res) => {
    try {
      const { oldEndpoint, subscription } = req.body || {};
      await resubscribeRecipient({ oldEndpoint, subscription });
      res.status(204).end();
    } catch (err) {
      sendError(res, err);
    }
  });

  router.get('/api/users', async (req, res) => {
    res.json(await listRecipients());
  });

  router.post('/api/send', async (req, res) => {
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
      if (result.status === 'Sent') {
        return res.json({ ok: true });
      }
      const statusByReason = {
        'no-active-subscription': [409, 'user has no active push subscription'],
        'subscription-expired': [410, 'subscription expired, ask user to re-register'],
      };
      const [httpStatus, message] = statusByReason[result.reason] || [500, 'failed to send notification'];
      res.status(httpStatus).json({ error: message });
    } catch (err) {
      sendError(res, err);
    }
  });

  router.get('/api/notifications', async (req, res) => {
    const list = await listNotifications({ view: 'history' });
    res.json(list.map(toNotificationView));
  });

  router.post('/api/schedule', async (req, res) => {
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
      sendError(res, err);
    }
  });

  router.get('/api/scheduled', async (req, res) => {
    const list = await listNotifications({ view: 'scheduled' });
    res.json(list.map(toNotificationView));
  });

  router.delete('/api/scheduled/:id', async (req, res) => {
    try {
      await cancelScheduledNotification({ notificationId: req.params.id });
      res.status(204).end();
    } catch (err) {
      sendError(res, err);
    }
  });

  router.get('/api/cron/tick', async (req, res) => {
    if (cronSecret && req.get('x-cron-secret') !== cronSecret) {
      return res.status(401).json({ error: 'unauthorized' });
    }
    res.json(await runDueNotifications());
  });

  return router;
}

module.exports = { makeHttpRoutes };
