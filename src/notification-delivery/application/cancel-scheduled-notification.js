function makeCancelScheduledNotification({ notificationRepository }) {
  return async function cancelScheduledNotification({ notificationId }) {
    const notification = await notificationRepository.findById(notificationId);
    if (!notification) {
      const err = new Error('no such scheduled notification');
      err.code = 'NOT_FOUND';
      throw err;
    }
    notification.cancel(); // throws INVALID_TRANSITION if not currently Scheduled
    await notificationRepository.save(notification);
  };
}

module.exports = { makeCancelScheduledNotification };
