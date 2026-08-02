import type { RecipientRepository } from './ports.js';
import type { PushSubscriptionJSON } from 'domain/notification-delivery';
import { notificationDeliveryError } from './errors.js';

interface ResubscribeRecipientRequest {
  oldEndpoint: string;
  subscription: PushSubscriptionJSON;
}

export class ResubscribeRecipient {
  constructor(private recipientRepository: RecipientRepository) {}

  async execute({ oldEndpoint, subscription }: ResubscribeRecipientRequest): Promise<void> {
    if (!subscription || !subscription.endpoint) {
      throw notificationDeliveryError('subscription is required', 'INVALID_INPUT');
    }
    const recipient = await this.recipientRepository.findByEndpoint(oldEndpoint);
    if (!recipient) {
      throw notificationDeliveryError('no matching subscription found', 'NOT_FOUND');
    }
    recipient.subscribeToPush(subscription);
    await this.recipientRepository.save(recipient);
  }
}
