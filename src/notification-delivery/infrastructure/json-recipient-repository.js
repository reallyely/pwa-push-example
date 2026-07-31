const store = require('../../../store');
const { Recipient } = require('../domain/recipient');

function toEntity(username, data) {
  return new Recipient({ username, pushSubscription: data.subscription });
}

class JsonRecipientRepository {
  constructor() {
    this.users = store.load(); // Map<username, { subscription }>
  }

  async findByUsername(username) {
    const data = this.users.get(username);
    return data ? toEntity(username, data) : null;
  }

  async findByEndpoint(endpoint) {
    for (const [username, data] of this.users.entries()) {
      if (data.subscription && data.subscription.endpoint === endpoint) {
        return toEntity(username, data);
      }
    }
    return null;
  }

  async findAll() {
    return Array.from(this.users.entries()).map(([username, data]) => toEntity(username, data));
  }

  async save(recipient) {
    this.users.set(recipient.username, { subscription: recipient.pushSubscription });
    store.save(this.users);
  }
}

module.exports = { JsonRecipientRepository };
