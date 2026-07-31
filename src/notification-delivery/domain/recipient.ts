export interface PushSubscriptionKeys {
  p256dh: string;
  auth: string;
}

export interface PushSubscriptionJSON {
  endpoint: string;
  keys: PushSubscriptionKeys;
  expirationTime?: number | null;
}

interface RecipientProps {
  username: string;
  pushSubscription?: PushSubscriptionJSON | null;
}

class Recipient {
  username: string;
  pushSubscription: PushSubscriptionJSON | null;

  constructor({ username, pushSubscription = null }: RecipientProps) {
    if (!username || typeof username !== 'string' || !username.trim()) {
      throw new Error('Recipient requires a non-empty username');
    }
    this.username = username;
    this.pushSubscription = pushSubscription;
  }

  static register(username: string): Recipient {
    return new Recipient({ username });
  }

  subscribeToPush(subscription: PushSubscriptionJSON): void {
    if (!subscription || !subscription.endpoint) {
      throw new Error('subscription requires an endpoint');
    }
    this.pushSubscription = subscription;
  }

  // Invoked when a delivery attempt reports the subscription is gone
  // (PushGateway maps the push service's 404/410 to this outcome).
  clearSubscription(): void {
    this.pushSubscription = null;
  }
}

module.exports = { Recipient };
export type { Recipient };
