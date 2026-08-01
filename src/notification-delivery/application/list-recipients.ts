import type { RecipientRepository } from './ports.js';

export interface RecipientView {
  username: string;
  subscribed: boolean;
}

export class ListRecipients {
  constructor(private recipientRepository: RecipientRepository) {}

  async execute(): Promise<RecipientView[]> {
    const recipients = await this.recipientRepository.findAll();
    return recipients.map((r) => ({ username: r.username, subscribed: !!r.pushSubscription }));
  }
}
