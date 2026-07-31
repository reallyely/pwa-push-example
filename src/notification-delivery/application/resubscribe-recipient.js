function makeResubscribeRecipient({ recipientRepository }) {
  return async function resubscribeRecipient({ oldEndpoint, subscription }) {
    if (!subscription || !subscription.endpoint) {
      const err = new Error('subscription is required');
      err.code = 'INVALID_INPUT';
      throw err;
    }
    const recipient = await recipientRepository.findByEndpoint(oldEndpoint);
    if (!recipient) {
      const err = new Error('no matching subscription found');
      err.code = 'NOT_FOUND';
      throw err;
    }
    recipient.subscribeToPush(subscription);
    await recipientRepository.save(recipient);
  };
}

module.exports = { makeResubscribeRecipient };
