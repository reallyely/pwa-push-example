import { Notification } from '#notification-delivery/domain/notification.ts';
import type { RecipientRepository, NotificationRepository } from './ports.ts';
import { notificationDeliveryError } from './errors.ts';

interface Deps {
  recipientRepository: RecipientRepository;
  notificationRepository: NotificationRepository;
  generateId: () => string;
}

interface ScheduleNotificationRequest {
  recipientId: string;
  title: string;
  description: string;
  scheduledDateTime: Date;
  icon?: string | null;
}

interface ScheduleNotificationResponse {
  notificationId: string;
}

export function makeScheduleNotification({ recipientRepository, notificationRepository, generateId }: Deps) {
  return async function scheduleNotification({
    recipientId,
    title,
    description,
    scheduledDateTime,
    icon,
  }: ScheduleNotificationRequest): Promise<ScheduleNotificationResponse> {
    const recipient = await recipientRepository.findByUsername(recipientId);
    if (!recipient) {
      throw notificationDeliveryError('unknown username, register first', 'NOT_FOUND');
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
