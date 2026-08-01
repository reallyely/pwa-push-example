import type { Recipient, PushSubscriptionJSON } from '#notification-delivery/domain/recipient.js';
import type { Notification } from '#notification-delivery/domain/notification.js';

export const RECIPIENT_REPOSITORY = Symbol('RecipientRepository');

export interface RecipientRepository {
  findByUsername(username: string): Promise<Recipient | null>;
  findByEndpoint(endpoint: string): Promise<Recipient | null>;
  findAll(): Promise<Recipient[]>;
  save(recipient: Recipient): Promise<void>;
}

export const NOTIFICATION_REPOSITORY = Symbol('NotificationRepository');

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

export const PUSH_GATEWAY = Symbol('PushGateway');

export interface PushGateway {
  // Never throws/leaks the underlying library's error shape past this port.
  send(pushSubscription: PushSubscriptionJSON, payload: string): Promise<PushGatewayResult>;
}

// DI seam for id generation — a plain value (not really a "port" the way a
// repository/gateway is), colocated here since it's the natural place other
// application classes' constructors pull it in from.
export const GENERATE_ID = Symbol('GenerateId');
export type GenerateId = () => string;
