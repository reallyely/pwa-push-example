import type { Recipient, PushSubscriptionJSON } from '../domain/recipient.ts';
import type { Notification } from '../domain/notification.ts';

export interface RecipientRepository {
  findByUsername(username: string): Promise<Recipient | null>;
  findByEndpoint(endpoint: string): Promise<Recipient | null>;
  findAll(): Promise<Recipient[]>;
  save(recipient: Recipient): Promise<void>;
}

export interface NotificationRepository {
  findById(id: string): Promise<Notification | null>;
  findAll(): Promise<Notification[]>;
  save(notification: Notification): Promise<void>;

  // Must atomically claim the entire due set in one synchronous pass before
  // any await — see "Claiming due notifications must be atomic" in
  // notification-delivery-model.md. Returns exactly the notifications it
  // claimed; callers never re-derive the due set themselves.
  claimDueNotifications(now: Date): Promise<Notification[]>;
}

export type PushGatewayResult =
  | { ok: true }
  | { ok: false; reason: 'subscription-expired' | 'send-failed' };

export interface PushGateway {
  // Never throws/leaks the underlying library's error shape past this port.
  send(pushSubscription: PushSubscriptionJSON, payload: string): Promise<PushGatewayResult>;
}
