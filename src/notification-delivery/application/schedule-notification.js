const { Notification } = require('../domain/notification');

function makeScheduleNotification({ recipientRepository, notificationRepository, generateId }) {
  return async function scheduleNotification({ recipientId, title, description, scheduledDateTime, icon }) {
    const recipient = await recipientRepository.findByUsername(recipientId);
    if (!recipient) {
      const err = new Error('unknown username, register first');
      err.code = 'NOT_FOUND';
      throw err;
    }
    const notification = Notification.schedule({
      id: generateId(),
      recipientId,
      title,
      description,
      scheduledDateTime,
      icon,
    });
    await notificationRepository.save(notification);
    return { notificationId: notification.id };
  };
}

module.exports = { makeScheduleNotification };
