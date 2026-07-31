import { Recipient } from '#notification-delivery/domain/recipient.ts';
import type { RecipientRepository } from './ports.ts';
import { notificationDeliveryError } from './errors.ts';

interface Deps {
  recipientRepository: RecipientRepository;
}

interface RegisterRecipientRequest {
  username: string;
}

interface RegisterRecipientResponse {
  username: string;
}

export function makeRegisterRecipient({ recipientRepository }: Deps) {
  return async function registerRecipient({ username }: RegisterRecipientRequest): Promise<RegisterRecipientResponse> {
    if (!username || typeof username !== 'string' || !username.trim()) {
      throw notificationDeliveryError('username is required', 'INVALID_INPUT');
    }
    const name = username.trim();
    const existing = await recipientRepository.findByUsername(name);
    if (!existing) {
      await recipientRepository.save(Recipient.register(name));
    }
    return { username: name };
  };
}
