import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { GetCurrentUser } from './get-current-user.js';
import { User } from '#identity/domain/user.js';
import { Session } from '#identity/domain/session.js';
import type { SessionRepository, UserRepository } from './ports.js';

function fakeSessionRepository(session: Session | null): SessionRepository {
  return {
    async findByToken() { return session; },
    async save() { throw new Error('not used in this test'); },
    async deleteByToken() { throw new Error('not used in this test'); },
  };
}

function fakeUserRepository(user: User | null): UserRepository {
  return {
    async findByEmail() { throw new Error('not used in this test'); },
    async findById() { return user; },
    async findAll() { throw new Error('not used in this test'); },
    async save() { throw new Error('not used in this test'); },
  };
}

describe('GetCurrentUser', () => {
  test('throws UNAUTHENTICATED when there is no token', async () => {
    const getCurrentUser = new GetCurrentUser(fakeSessionRepository(null), fakeUserRepository(null));

    await assert.rejects(
      () => getCurrentUser.execute({ token: undefined }),
      (err: any) => err.code === 'UNAUTHENTICATED',
    );
  });

  test('throws UNAUTHENTICATED when the session is unknown', async () => {
    const getCurrentUser = new GetCurrentUser(fakeSessionRepository(null), fakeUserRepository(null));

    await assert.rejects(
      () => getCurrentUser.execute({ token: 'missing' }),
      (err: any) => err.code === 'UNAUTHENTICATED',
    );
  });

  test('throws UNAUTHENTICATED when the session is expired', async () => {
    const session = Session.issue({ token: 't1', userId: 'u1', ttlMs: -1000 });
    const getCurrentUser = new GetCurrentUser(fakeSessionRepository(session), fakeUserRepository(null));

    await assert.rejects(
      () => getCurrentUser.execute({ token: 't1' }),
      (err: any) => err.code === 'UNAUTHENTICATED',
    );
  });

  test('throws UNAUTHENTICATED when the session user no longer exists', async () => {
    const session = Session.issue({ token: 't1', userId: 'u1', ttlMs: 60_000 });
    const getCurrentUser = new GetCurrentUser(fakeSessionRepository(session), fakeUserRepository(null));

    await assert.rejects(
      () => getCurrentUser.execute({ token: 't1' }),
      (err: any) => err.code === 'UNAUTHENTICATED',
    );
  });

  test('returns the user for a valid session', async () => {
    const session = Session.issue({ token: 't1', userId: 'u1', ttlMs: 60_000 });
    const user = User.register({ id: 'u1', email: 'alice@example.com', passwordHash: 'h', role: 'Participant', createdAt: new Date() });
    const getCurrentUser = new GetCurrentUser(fakeSessionRepository(session), fakeUserRepository(user));

    const result = await getCurrentUser.execute({ token: 't1' });

    assert.deepEqual(result, { id: 'u1', email: 'alice@example.com', role: 'Participant' });
  });
});
