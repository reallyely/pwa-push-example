const { Recipient } = require('../domain/recipient.ts');
import type { RecipientRepository } from './ports.ts';

interface Deps {
  recipientRepository: RecipientRepository;
}

interface RegisterRecipientRequest {
  username: string;
}

interface RegisterRecipientResponse {
  username: string;
}

interface InputError extends Error {
  code?: string;
}

function makeRegisterRecipient({ recipientRepository }: Deps) {
  return async function registerRecipient({ username }: RegisterRecipientRequest): Promise<RegisterRecipientResponse> {
    if (!username || typeof username !== 'string' || !username.trim()) {
      const err: InputError = new Error('username is required');
      err.code = 'INVALID_INPUT';
      throw err;
    }
    const name = username.trim();
    const existing = await recipientRepository.findByUsername(name);
    if (!existing) {
      await recipientRepository.save(Recipient.register(name));
    }
    return { username: name };
  };
}

module.exports = { makeRegisterRecipient };
