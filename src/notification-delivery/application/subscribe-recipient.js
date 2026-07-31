function makeSubscribeRecipient({ recipientRepository }) {
  return async function subscribeRecipient({ username, subscription }) {
    const recipient = await recipientRepository.findByUsername(username);
    if (!recipient) {
      const err = new Error('unknown username, register first');
      err.code = 'NOT_FOUND';
      throw err;
    }
    if (!subscription || !subscription.endpoint) {
      const err = new Error('subscription is required');
      err.code = 'INVALID_INPUT';
      throw err;
    }
    recipient.subscribeToPush(subscription);
    await recipientRepository.save(recipient);
  };
}

module.exports = { makeSubscribeRecipient };
