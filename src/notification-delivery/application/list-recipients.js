function makeListRecipients({ recipientRepository }) {
  return async function listRecipients() {
    const recipients = await recipientRepository.findAll();
    return recipients.map((r) => ({ username: r.username, subscribed: !!r.pushSubscription }));
  };
}

module.exports = { makeListRecipients };
