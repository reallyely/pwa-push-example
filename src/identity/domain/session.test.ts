import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { Session } from './session.js';

describe('Session.issue', () => {
  test('requires a non-empty token', () => {
    assert.throws(() => Session.issue({ token: '', userId: 'u1', ttlMs: 1000 }));
  });

  test('requires a non-empty userId', () => {
    assert.throws(() => Session.issue({ token: 't1', userId: '', ttlMs: 1000 }));
  });

  test('sets expiresAt to now + ttlMs', () => {
    const before = Date.now();
    const session = Session.issue({ token: 't1', userId: 'u1', ttlMs: 1000 });
    const after = Date.now();
    assert.ok(session.expiresAt.getTime() >= before + 1000);
    assert.ok(session.expiresAt.getTime() <= after + 1000);
  });
});

describe('Session#isExpired', () => {
  test('is false before expiry', () => {
    const session = Session.issue({ token: 't1', userId: 'u1', ttlMs: 10_000 });
    assert.equal(session.isExpired(new Date()), false);
  });

  test('is true after expiry', () => {
    const session = Session.issue({ token: 't1', userId: 'u1', ttlMs: 1000 });
    assert.equal(session.isExpired(new Date(Date.now() + 2000)), true);
  });

  test('defaults now to the current time', () => {
    const session = Session.issue({ token: 't1', userId: 'u1', ttlMs: -1000 });
    assert.equal(session.isExpired(), true);
  });
});
