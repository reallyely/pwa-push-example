import type { RecipientRepository } from './ports.ts';
import type { PushSubscriptionJSON } from '#notification-delivery/domain/recipient.ts';
import { notificationDeliveryError } from './errors.ts';

interface Deps {
  recipientRepository: RecipientRepository;
}

interface SubscribeRecipientRequest {
  username: string;
  subscription: PushSubscriptionJSON;
}

export function makeSubscribeRecipient({ recipientRepository }: Deps) {
  return async function subscribeRecipient({ username, subscription }: SubscribeRecipientRequest): Promise<void> {
    const recipient = await recipientRepository.findByUsername(username);
    if (!recipient) {
      throw notificationDeliveryError('unknown username, register first', 'NOT_FOUND');
    }
    if (!subscription || !subscription.endpoint) {
      throw notificationDeliveryError('subscription is required', 'INVALID_INPUT');
    }
    recipient.subscribeToPush(subscription);
    await recipientRepository.save(recipient);
  };
}
