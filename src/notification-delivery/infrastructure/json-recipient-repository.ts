import * as store from '#store';
import { Recipient } from '#notification-delivery/domain/recipient.ts';
import type { UserRecord } from '#store';
import type { RecipientRepository } from '#notification-delivery/application/ports.ts';
import type { Recipient as RecipientEntity } from '#notification-delivery/domain/recipient.ts';

function toEntity(username: string, data: UserRecord): RecipientEntity {
  return new Recipient({ username, pushSubscription: data.subscription });
}

export class JsonRecipientRepository implements RecipientRepository {
  users: Map<string, UserRecord>;

  constructor() {
    this.users = store.load();
  }

  async findByUsername(username: string): Promise<RecipientEntity | null> {
    const data = this.users.get(username);
    return data ? toEntity(username, data) : null;
  }

  async findByEndpoint(endpoint: string): Promise<RecipientEntity | null> {
    for (const [username, data] of this.users.entries()) {
      if (data.subscription && data.subscription.endpoint === endpoint) {
        return toEntity(username, data);
      }
    }
    return null;
  }

  async findAll(): Promise<RecipientEntity[]> {
    return Array.from(this.users.entries()).map(([username, data]) => toEntity(username, data));
  }

  async save(recipient: RecipientEntity): Promise<void> {
    this.users.set(recipient.username, { subscription: recipient.pushSubscription });
    store.save(this.users);
  }
}
