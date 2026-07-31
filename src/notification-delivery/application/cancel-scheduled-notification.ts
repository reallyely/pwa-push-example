import type { NotificationRepository } from './ports.ts';

interface Deps {
  notificationRepository: NotificationRepository;
}

interface CancelScheduledNotificationRequest {
  notificationId: string;
}

interface AppError extends Error {
  code?: string;
}

function makeCancelScheduledNotification({ notificationRepository }: Deps) {
  return async function cancelScheduledNotification({ notificationId }: CancelScheduledNotificationRequest): Promise<void> {
    const notification = await notificationRepository.findById(notificationId);
    if (!notification) {
      const err: AppError = new Error('no such scheduled notification');
      err.code = 'NOT_FOUND';
      throw err;
    }
    notification.cancel(); // throws INVALID_TRANSITION if not currently Scheduled
    await notificationRepository.save(notification);
  };
}

module.exports = { makeCancelScheduledNotification };
