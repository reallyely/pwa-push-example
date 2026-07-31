import * as store from '#store';
import { Recipient } from '#notification-delivery/domain/recipient.ts';
import type { PushSubscriptionJSON, Recipient as RecipientEntity } from '#notification-delivery/domain/recipient.ts';
import type { RecipientRepository } from '#notification-delivery/application/ports.ts';

const RECIPIENTS_FILE = store.dataFilePath('recipients.json');

export interface RecipientRecord {
  subscription: PushSubscriptionJSON | null;
}

function toEntity(username: string, record: RecipientRecord): RecipientEntity {
  return new Recipient({ username, pushSubscription: record.subscription });
}

export class JsonRecipientRepository implements RecipientRepository {
  recipients: Map<string, RecipientRecord>;

  constructor() {
    this.recipients = store.readJsonMap<string, RecipientRecord>(RECIPIENTS_FILE);
  }

  async findByUsername(username: string): Promise<RecipientEntity | null> {
    const record = this.recipients.get(username);
    return record ? toEntity(username, record) : null;
  }

  async findByEndpoint(endpoint: string): Promise<RecipientEntity | null> {
    for (const [username, record] of this.recipients.entries()) {
      if (record.subscription && record.subscription.endpoint === endpoint) {
        return toEntity(username, record);
      }
    }
    return null;
  }

  async findAll(): Promise<RecipientEntity[]> {
    return Array.from(this.recipients.entries()).map(([username, record]) => toEntity(username, record));
  }

  async save(recipient: RecipientEntity): Promise<void> {
    this.recipients.set(recipient.username, { subscription: recipient.pushSubscription });
    store.writeJsonMap(RECIPIENTS_FILE, this.recipients);
  }
}
