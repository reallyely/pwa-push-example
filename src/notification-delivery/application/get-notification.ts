import type { NotificationRepository } from './ports.ts';
import type { Notification } from '#notification-delivery/domain/notification.ts';
import { notificationDeliveryError } from './errors.ts';

interface Deps {
  notificationRepository: NotificationRepository;
}

interface GetNotificationRequest {
  notificationId: string;
}

export function makeGetNotification({ notificationRepository }: Deps) {
  return async function getNotification({ notificationId }: GetNotificationRequest): Promise<Notification> {
    const notification = await notificationRepository.findById(notificationId);
    if (!notification) {
      throw notificationDeliveryError('no such notification', 'NOT_FOUND');
    }
    return notification;
  };
}
