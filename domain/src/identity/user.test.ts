import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { User } from './user.ts';

function validProps(overrides: Record<string, unknown> = {}) {
  return {
    id: 'u1',
    email: 'alice@example.com',
    passwordHash: 'hashed',
    role: 'Participant',
    createdAt: new Date(),
    ...overrides,
  } as any;
}

describe('User.register', () => {
  test('requires a valid email', () => {
    assert.throws(() => User.register(validProps({ email: '' })));
    assert.throws(() => User.register(validProps({ email: 'not-an-email' })));
    assert.throws(() => User.register(validProps({ email: 'missing-domain@' })));
  });

  test('requires a non-empty passwordHash', () => {
    assert.throws(() => User.register(validProps({ passwordHash: '' })));
  });

  test('requires a valid role', () => {
    assert.throws(() => User.register(validProps({ role: 'Admin' })));
  });

  test('creates a User with the given fields', () => {
    const createdAt = new Date();
    const user = User.register(validProps({ createdAt }));
    assert.equal(user.id, 'u1');
    assert.equal(user.email, 'alice@example.com');
    assert.equal(user.passwordHash, 'hashed');
    assert.equal(user.role, 'Participant');
    assert.equal(user.createdAt, createdAt);
  });
});
