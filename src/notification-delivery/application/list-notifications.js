const { STATUSES } = require('../domain/notification-status');

function makeListNotifications({ notificationRepository }) {
  return async function listNotifications({ view }) {
    const all = await notificationRepository.findAll();
    if (view === 'scheduled') {
      return all
        .filter((n) => n.status === STATUSES.SCHEDULED)
        .sort((a, b) => a.scheduledDateTime - b.scheduledDateTime);
    }
    return all
      .filter((n) => n.status !== STATUSES.SCHEDULED)
      .sort((a, b) => (b.sentDateTime || b.scheduledDateTime) - (a.sentDateTime || a.scheduledDateTime));
  };
}

module.exports = { makeListNotifications };
