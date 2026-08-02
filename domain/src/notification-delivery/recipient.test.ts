import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { Recipient } from './recipient.ts';

const subscription = { endpoint: 'https://push.example/abc', keys: { p256dh: 'p', auth: 'a' } };

describe('Recipient construction', () => {
  test('requires a non-empty username', () => {
    assert.throws(() => new Recipient({ username: '' }));
    assert.throws(() => new Recipient({ username: '   ' }));
  });

  test('register() creates a recipient with no push subscription', () => {
    const recipient = Recipient.register('alice');
    assert.equal(recipient.username, 'alice');
    assert.equal(recipient.pushSubscription, null);
  });
});

describe('Recipient#subscribeToPush', () => {
  test('requires a subscription with an endpoint', () => {
    const recipient = Recipient.register('alice');
    assert.throws(() => recipient.subscribeToPush({} as any));
  });

  test('stores the subscription', () => {
    const recipient = Recipient.register('alice');
    recipient.subscribeToPush(subscription);
    assert.equal(recipient.pushSubscription, subscription);
  });
});

describe('Recipient#clearSubscription', () => {
  test('removes a stored subscription', () => {
    const recipient = Recipient.register('alice');
    recipient.subscribeToPush(subscription);
    recipient.clearSubscription();
    assert.equal(recipient.pushSubscription, null);
  });
});
