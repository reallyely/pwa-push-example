function makeDeliverNotification({ notificationRepository, recipientRepository, pushGateway, now = () => new Date() }) {
  return async function deliverNotification({ notificationId }) {
    const notification = await notificationRepository.findById(notificationId);
    if (!notification) {
      const err = new Error('no such notification');
      err.code = 'NOT_FOUND';
      throw err;
    }

    const recipient = await recipientRepository.findByUsername(notification.recipientId);
    if (!recipient || !recipient.pushSubscription) {
      notification.markFailed('no-active-subscription');
      await notificationRepository.save(notification);
      return { status: notification.status, reason: notification.failureReason };
    }

    const payload = JSON.stringify({
      title: notification.title,
      body: notification.description,
      icon: notification.icon || undefined,
    });

    const result = await pushGateway.send(recipient.pushSubscription, payload);

    if (result.ok) {
      notification.markSent(now());
    } else if (result.reason === 'subscription-expired') {
      recipient.clearSubscription();
      await recipientRepository.save(recipient);
      notification.markFailed('subscription-expired');
    } else {
      notification.markFailed(result.reason || 'send-failed');
    }
    await notificationRepository.save(notification);
    return { status: notification.status, reason: notification.failureReason };
  };
}

module.exports = { makeDeliverNotification };
