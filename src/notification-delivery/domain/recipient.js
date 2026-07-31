class Recipient {
  constructor({ username, pushSubscription = null }) {
    if (!username || typeof username !== 'string' || !username.trim()) {
      throw new Error('Recipient requires a non-empty username');
    }
    this.username = username;
    this.pushSubscription = pushSubscription;
  }

  static register(username) {
    return new Recipient({ username });
  }

  subscribeToPush(subscription) {
    if (!subscription || !subscription.endpoint) {
      throw new Error('subscription requires an endpoint');
    }
    this.pushSubscription = subscription;
  }

  // Invoked when a delivery attempt reports the subscription is gone
  // (PushGateway maps the push service's 404/410 to this outcome).
  clearSubscription() {
    this.pushSubscription = null;
  }
}

module.exports = { Recipient };
