const { Notification } = require('../domain/notification.ts');
import type { RecipientRepository, NotificationRepository } from './ports.ts';

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

interface AppError extends Error {
  code?: string;
}

function makeScheduleNotification({ recipientRepository, notificationRepository, generateId }: Deps) {
  return async function scheduleNotification({
    recipientId,
    title,
    description,
    scheduledDateTime,
    icon,
  }: ScheduleNotificationRequest): Promise<ScheduleNotificationResponse> {
    const recipient = await recipientRepository.findByUsername(recipientId);
    if (!recipient) {
      const err: AppError = new Error('unknown username, register first');
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
