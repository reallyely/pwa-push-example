import type { RecipientRepository } from './ports.ts';
import type { PushSubscriptionJSON } from '#notification-delivery/domain/recipient.ts';
import { notificationDeliveryError } from './errors.ts';

interface Deps {
  recipientRepository: RecipientRepository;
}

interface ResubscribeRecipientRequest {
  oldEndpoint: string;
  subscription: PushSubscriptionJSON;
}

export function makeResubscribeRecipient({ recipientRepository }: Deps) {
  return async function resubscribeRecipient({ oldEndpoint, subscription }: ResubscribeRecipientRequest): Promise<void> {
    if (!subscription || !subscription.endpoint) {
      throw notificationDeliveryError('subscription is required', 'INVALID_INPUT');
    }
    const recipient = await recipientRepository.findByEndpoint(oldEndpoint);
    if (!recipient) {
      throw notificationDeliveryError('no matching subscription found', 'NOT_FOUND');
    }
    recipient.subscribeToPush(subscription);
    await recipientRepository.save(recipient);
  };
}
