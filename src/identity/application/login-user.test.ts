import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { LoginUser } from './login-user.js';
import { User } from '#identity/domain/user.js';
import { Session } from '#identity/domain/session.js';
import type { UserRepository, SessionRepository, PasswordHasher } from './ports.js';

function fakeUser() {
  return User.register({
    id: 'u1',
    email: 'alice@example.com',
    passwordHash: 'hashed:password1',
    role: 'Participant',
    createdAt: new Date(),
  });
}

function fakeUserRepository(user: User | null): UserRepository {
  return {
    async findByEmail() { return user; },
    async findById() { throw new Error('not used in this test'); },
    async findAll() { throw new Error('not used in this test'); },
    async save() { throw new Error('not used in this test'); },
  };
}

function fakeSessionRepository(): SessionRepository & { saved: Session[] } {
  const saved: Session[] = [];
  const repository = {
    async findByToken() { throw new Error('not used in this test'); },
    async save(session: Session) { saved.push(session); },
    async deleteByToken() { throw new Error('not used in this test'); },
  };
  return Object.assign(repository, { saved }) as unknown as SessionRepository & { saved: Session[] };
}

function fakePasswordHasher(matches: boolean): PasswordHasher {
  return {
    async hash() { throw new Error('not used in this test'); },
    async verify() { return matches; },
  };
}

describe('LoginUser', () => {
  test('rejects an unknown email with INVALID_CREDENTIALS', async () => {
    const loginUser = new LoginUser(fakeUserRepository(null), fakeSessionRepository(), fakePasswordHasher(true), () => 'token1');

    await assert.rejects(
      () => loginUser.execute({ email: 'nobody@example.com', password: 'password1' }),
      (err: any) => err.code === 'INVALID_CREDENTIALS',
    );
  });

  test('rejects a wrong password with the same INVALID_CREDENTIALS error', async () => {
    const loginUser = new LoginUser(fakeUserRepository(fakeUser()), fakeSessionRepository(), fakePasswordHasher(false), () => 'token1');

    await assert.rejects(
      () => loginUser.execute({ email: 'alice@example.com', password: 'wrong' }),
      (err: any) => err.code === 'INVALID_CREDENTIALS',
    );
  });

  test('issues and saves a session on success', async () => {
    const sessionRepository = fakeSessionRepository();
    const loginUser = new LoginUser(fakeUserRepository(fakeUser()), sessionRepository, fakePasswordHasher(true), () => 'token1');

    const result = await loginUser.execute({ email: '  Alice@Example.com ', password: 'password1' });

    assert.equal(result.token, 'token1');
    assert.deepEqual(result.user, { id: 'u1', email: 'alice@example.com', role: 'Participant' });
    assert.equal(sessionRepository.saved.length, 1);
    assert.equal(sessionRepository.saved[0].token, 'token1');
    assert.equal(sessionRepository.saved[0].userId, 'u1');
  });
});
