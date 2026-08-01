import { Recipient } from '#notification-delivery/domain/recipient.js';
import type { RecipientRepository } from './ports.js';
import { notificationDeliveryError } from './errors.js';

interface RegisterRecipientRequest {
  username: string;
}

interface RegisterRecipientResponse {
  username: string;
}

export class RegisterRecipient {
  constructor(private recipientRepository: RecipientRepository) {}

  async execute({ username }: RegisterRecipientRequest): Promise<RegisterRecipientResponse> {
    if (!username || typeof username !== 'string' || !username.trim()) {
      throw notificationDeliveryError('username is required', 'INVALID_INPUT');
    }
    const name = username.trim();
    const existing = await this.recipientRepository.findByUsername(name);
    if (!existing) {
      await this.recipientRepository.save(Recipient.register(name));
    }
    return { username: name };
  }
}
