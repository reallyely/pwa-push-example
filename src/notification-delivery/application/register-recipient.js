const { Recipient } = require('../domain/recipient');

function makeRegisterRecipient({ recipientRepository }) {
  return async function registerRecipient({ username }) {
    if (!username || typeof username !== 'string' || !username.trim()) {
      const err = new Error('username is required');
      err.code = 'INVALID_INPUT';
      throw err;
    }
    const name = username.trim();
    const existing = await recipientRepository.findByUsername(name);
    if (!existing) {
      await recipientRepository.save(Recipient.register(name));
    }
    return { username: name };
  };
}

module.exports = { makeRegisterRecipient };
