import type { NotificationRepository } from './ports.js';
import type { Notification } from 'domain/notification-delivery';
import { notificationDeliveryError } from './errors.js';

interface GetNotificationRequest {
  notificationId: string;
}

export class GetNotification {
  constructor(private notificationRepository: NotificationRepository) {}

  async execute({ notificationId }: GetNotificationRequest): Promise<Notification> {
    const notification = await this.notificationRepository.findById(notificationId);
    if (!notification) {
      throw notificationDeliveryError('no such notification', 'NOT_FOUND');
    }
    return notification;
  }
}
