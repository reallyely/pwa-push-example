import type { RecipientRepository, NotificationRepository, PushGateway } from './ports.js';

interface DeliverNotificationRequest {
  notificationId: string;
}

export interface DeliverNotificationResponse {
  status: string;
  reason?: string | null;
}

export class DeliverNotification {
  constructor(
    private notificationRepository: NotificationRepository,
    private recipientRepository: RecipientRepository,
    private pushGateway: PushGateway,
    private now: () => Date = () => new Date(),
  ) {}

  async execute({ notificationId }: DeliverNotificationRequest): Promise<DeliverNotificationResponse> {
    const notification = await this.notificationRepository.findById(notificationId);
    if (!notification) {
      const err: Error & { code?: string } = new Error('no such notification');
      err.code = 'NOT_FOUND';
      throw err;
    }

    const recipient = await this.recipientRepository.findByUsername(notification.recipientId);
    if (!recipient || !recipient.pushSubscription) {
      notification.markFailed('no-active-subscription');
      await this.notificationRepository.save(notification);
      return { status: notification.status, reason: notification.failureReason };
    }

    const payload = JSON.stringify({
      title: notification.title,
      body: notification.description,
      icon: notification.icon || undefined,
      data: { notificationId: notification.id },
    });

    const result = await this.pushGateway.send(recipient.pushSubscription, payload);

    if (result.ok) {
      notification.markSent(this.now());
    } else if (result.reason === 'subscription-expired') {
      recipient.clearSubscription();
      await this.recipientRepository.save(recipient);
      notification.markFailed('subscription-expired');
    } else {
      notification.markFailed(result.reason || 'send-failed');
    }
    await this.notificationRepository.save(notification);
    return { status: notification.status, reason: notification.failureReason };
  }
}
