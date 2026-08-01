import type { RecipientRepository } from './ports.js';
import type { PushSubscriptionJSON } from '#notification-delivery/domain/recipient.js';
import { notificationDeliveryError } from './errors.js';

interface SubscribeRecipientRequest {
  username: string;
  subscription: PushSubscriptionJSON;
}

export class SubscribeRecipient {
  constructor(private recipientRepository: RecipientRepository) {}

  async execute({ username, subscription }: SubscribeRecipientRequest): Promise<void> {
    const recipient = await this.recipientRepository.findByUsername(username);
    if (!recipient) {
      throw notificationDeliveryError('unknown username, register first', 'NOT_FOUND');
    }
    if (!subscription || !subscription.endpoint) {
      throw notificationDeliveryError('subscription is required', 'INVALID_INPUT');
    }
    recipient.subscribeToPush(subscription);
    await this.recipientRepository.save(recipient);
  }
}
