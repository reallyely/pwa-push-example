import type { RecipientRepository } from './ports.ts';

interface Deps {
  recipientRepository: RecipientRepository;
}

export interface RecipientView {
  username: string;
  subscribed: boolean;
}

export function makeListRecipients({ recipientRepository }: Deps) {
  return async function listRecipients(): Promise<RecipientView[]> {
    const recipients = await recipientRepository.findAll();
    return recipients.map((r) => ({ username: r.username, subscribed: !!r.pushSubscription }));
  };
}
