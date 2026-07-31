const webpush = require('web-push');

class WebPushGateway {
  constructor({ vapidSubject, vapidPublicKey, vapidPrivateKey }) {
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
  }

  async send(pushSubscription, payload) {
    try {
      // 'high' urgency maps to FCM high-priority, which Android's push service
      // wakes the device for even in Doze/App Standby. Default 'normal' can be
      // deferred indefinitely once the app is backgrounded and the device idles.
      await webpush.sendNotification(pushSubscription, payload, { urgency: 'high' });
      return { ok: true };
    } catch (err) {
      if (err.statusCode === 404 || err.statusCode === 410) {
        return { ok: false, reason: 'subscription-expired' };
      }
      console.error('[push] send failed', err);
      return { ok: false, reason: 'send-failed' };
    }
  }
}

module.exports = { WebPushGateway };
