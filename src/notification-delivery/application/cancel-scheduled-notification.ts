import type { NotificationRepository } from './ports.ts';
import { notificationDeliveryError } from './errors.ts';

interface Deps {
  notificationRepository: NotificationRepository;
}

interface CancelScheduledNotificationRequest {
  notificationId: string;
}

export function makeCancelScheduledNotification({ notificationRepository }: Deps) {
  return async function cancelScheduledNotification({ notificationId }: CancelScheduledNotificationRequest): Promise<void> {
    const notification = await notificationRepository.findById(notificationId);
    if (!notification) {
      throw notificationDeliveryError('no such scheduled notification', 'NOT_FOUND');
    }
    notification.cancel(); // throws INVALID_TRANSITION if not currently Scheduled
    await notificationRepository.save(notification);
  };
}
