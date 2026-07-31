import type { RecipientRepository } from './ports.ts';
import type { PushSubscriptionJSON } from '../domain/recipient.ts';

interface Deps {
  recipientRepository: RecipientRepository;
}

interface ResubscribeRecipientRequest {
  oldEndpoint: string;
  subscription: PushSubscriptionJSON;
}

interface AppError extends Error {
  code?: string;
}

function makeResubscribeRecipient({ recipientRepository }: Deps) {
  return async function resubscribeRecipient({ oldEndpoint, subscription }: ResubscribeRecipientRequest): Promise<void> {
    if (!subscription || !subscription.endpoint) {
      const err: AppError = new Error('subscription is required');
      err.code = 'INVALID_INPUT';
      throw err;
    }
    const recipient = await recipientRepository.findByEndpoint(oldEndpoint);
    if (!recipient) {
      const err: AppError = new Error('no matching subscription found');
      err.code = 'NOT_FOUND';
      throw err;
    }
    recipient.subscribeToPush(subscription);
    await recipientRepository.save(recipient);
  };
}

module.exports = { makeResubscribeRecipient };
