import type { NotificationRepository } from './ports.js';
import { notificationDeliveryError } from './errors.js';

interface CancelScheduledNotificationRequest {
  notificationId: string;
}

export class CancelScheduledNotification {
  constructor(private notificationRepository: NotificationRepository) {}

  async execute({ notificationId }: CancelScheduledNotificationRequest): Promise<void> {
    const notification = await this.notificationRepository.findById(notificationId);
    if (!notification) {
      throw notificationDeliveryError('no such scheduled notification', 'NOT_FOUND');
    }
    notification.cancel(); // throws INVALID_TRANSITION if not currently Scheduled
    await this.notificationRepository.save(notification);
  }
}
