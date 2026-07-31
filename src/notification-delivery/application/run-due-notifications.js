function makeRunDueNotifications({ notificationRepository, deliverNotification, now = () => new Date() }) {
  return async function runDueNotifications() {
    const due = await notificationRepository.claimDueNotifications(now());
    let sent = 0;
    for (const notification of due) {
      const result = await deliverNotification({ notificationId: notification.id });
      if (result.status === 'Sent') sent += 1;
    }
    return { checked: due.length, sent };
  };
}

module.exports = { makeRunDueNotifications };
