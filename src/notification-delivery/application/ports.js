class RecipientRepository {
  async findByUsername(username) { throw new Error('not implemented'); } // eslint-disable-line no-unused-vars
  async findByEndpoint(endpoint) { throw new Error('not implemented'); } // eslint-disable-line no-unused-vars
  async findAll() { throw new Error('not implemented'); }
  async save(recipient) { throw new Error('not implemented'); } // eslint-disable-line no-unused-vars
}

class NotificationRepository {
  async findById(id) { throw new Error('not implemented'); } // eslint-disable-line no-unused-vars
  async findAll() { throw new Error('not implemented'); }
  async save(notification) { throw new Error('not implemented'); } // eslint-disable-line no-unused-vars

  // Must atomically claim the entire due set in one synchronous pass before
  // any await — see "Claiming due notifications must be atomic" in
  // notification-delivery-model.md. Returns exactly the notifications it
  // claimed; callers never re-derive the due set themselves.
  async claimDueNotifications(now) { throw new Error('not implemented'); } // eslint-disable-line no-unused-vars
}

class PushGateway {
  // Resolves { ok: true } or { ok: false, reason: 'subscription-expired' | 'send-failed' }.
  // Never throws/leaks the underlying library's error shape past this port.
  async send(pushSubscription, payload) { throw new Error('not implemented'); } // eslint-disable-line no-unused-vars
}

module.exports = { RecipientRepository, NotificationRepository, PushGateway };
