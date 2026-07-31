const { STATUSES } = require('../domain/notification-status');

// One-time translation of the pre-refactor data/notifications.json (immediate
// sends) + data/scheduled.json (scheduled sends) into the merged Notification
// record shape. Called once by JsonNotificationRepository, only when
// notification-records.json has never been written.
function migrateLegacyNotificationFiles({ legacyNotifications, legacyScheduled }) {
  const records = [];

  for (const entry of legacyScheduled) {
    let status;
    let failureReason = null;
    switch (entry.status) {
      case 'pending':
      case 'sending': // leftover concurrency-guard state; safe to re-claim as still due
        status = STATUSES.SCHEDULED;
        break;
      case 'sent':
        status = STATUSES.SENT;
        break;
      case 'failed':
        status = STATUSES.FAILED;
        failureReason = entry.error || 'send-failed';
        break;
      case 'expired':
        status = STATUSES.FAILED;
        failureReason = 'subscription-expired';
        break;
      case 'canceled':
        status = STATUSES.CANCELLED;
        break;
      default:
        status = STATUSES.SCHEDULED;
    }
    records.push({
      id: entry.id,
      recipientId: entry.username,
      title: entry.title,
      description: entry.body,
      scheduledDateTime: entry.sendAt,
      icon: entry.icon || null,
      status,
      sentDateTime: entry.sentAt || null,
      failureReason,
    });
  }

  for (const entry of legacyNotifications) {
    // Immediate sends had no persisted schedule — model as "scheduled for
    // the instant it was sent," per the immediate-send resolution in
    // notification-delivery-model.md.
    const status = entry.status === 'sent' ? STATUSES.SENT : STATUSES.FAILED;
    records.push({
      id: entry.id,
      recipientId: entry.username,
      title: entry.title,
      description: entry.body,
      scheduledDateTime: entry.sentAt,
      icon: null,
      status,
      sentDateTime: status === STATUSES.SENT ? entry.sentAt : null,
      failureReason: status === STATUSES.FAILED
        ? (entry.status === 'expired' ? 'subscription-expired' : 'send-failed')
        : null,
    });
  }

  return records;
}

module.exports = { migrateLegacyNotificationFiles };
