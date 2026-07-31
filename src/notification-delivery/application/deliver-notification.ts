import type { RecipientRepository, NotificationRepository, PushGateway } from './ports.ts';
import { notificationDeliveryError } from './errors.ts';

interface Deps {
  notificationRepository: NotificationRepository;
  recipientRepository: RecipientRepository;
  pushGateway: PushGateway;
  now?: () => Date;
}

interface DeliverNotificationRequest {
  notificationId: string;
}

export interface DeliverNotificationResponse {
  status: string;
  reason?: string | null;
}

export function makeDeliverNotification({ notificationRepository, recipientRepository, pushGateway, now = () => new Date() }: Deps) {
  return async function deliverNotification({ notificationId }: DeliverNotificationRequest): Promise<DeliverNotificationResponse> {
    const notification = await notificationRepository.findById(notificationId);
    if (!notification) {
      throw notificationDeliveryError('no such notification', 'NOT_FOUND');
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
