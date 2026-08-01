import { Notification } from '#notification-delivery/domain/notification.js';
import type { RecipientRepository, NotificationRepository, GenerateId } from './ports.js';
import { notificationDeliveryError } from './errors.js';

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

export class ScheduleNotification {
  constructor(
    private recipientRepository: RecipientRepository,
    private notificationRepository: NotificationRepository,
    private generateId: GenerateId,
  ) {}

  async execute({
    recipientId,
    title,
    description,
    scheduledDateTime,
    icon,
  }: ScheduleNotificationRequest): Promise<ScheduleNotificationResponse> {
    const recipient = await this.recipientRepository.findByUsername(recipientId);
    if (!recipient) {
      throw notificationDeliveryError('unknown username, register first', 'NOT_FOUND');
    }
    const notification = Notification.schedule({
      id: this.generateId(),
      recipientId,
      title,
      description,
      scheduledDateTime,
      icon,
    });
    await this.notificationRepository.save(notification);
    return { notificationId: notification.id };
  }
}
