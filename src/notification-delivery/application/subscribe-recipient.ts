import type { RecipientRepository } from './ports.ts';
import type { PushSubscriptionJSON } from '#notification-delivery/domain/recipient.ts';

interface Deps {
  recipientRepository: RecipientRepository;
}

interface SubscribeRecipientRequest {
  username: string;
  subscription: PushSubscriptionJSON;
}

interface AppError extends Error {
  code?: string;
}

export function makeSubscribeRecipient({ recipientRepository }: Deps) {
  return async function subscribeRecipient({ username, subscription }: SubscribeRecipientRequest): Promise<void> {
    const recipient = await recipientRepository.findByUsername(username);
    if (!recipient) {
      const err: AppError = new Error('unknown username, register first');
      err.code = 'NOT_FOUND';
      throw err;
    }
    if (!subscription || !subscription.endpoint) {
      const err: AppError = new Error('subscription is required');
      err.code = 'INVALID_INPUT';
      throw err;
    }
    recipient.subscribeToPush(subscription);
    await recipientRepository.save(recipient);
  };
}
