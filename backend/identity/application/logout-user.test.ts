import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { LogoutUser } from './logout-user.js';
import type { SessionRepository } from './ports.js';

function fakeSessionRepository(): SessionRepository & { deleted: string[] } {
  const deleted: string[] = [];
  const repository = {
    async findByToken() { throw new Error('not used in this test'); },
    async save() { throw new Error('not used in this test'); },
    async deleteByToken(token: string) { deleted.push(token); },
  };
  return Object.assign(repository, { deleted }) as unknown as SessionRepository & { deleted: string[] };
}

describe('LogoutUser', () => {
  test('deletes the session by token', async () => {
    const sessionRepository = fakeSessionRepository();
    const logoutUser = new LogoutUser(sessionRepository);

    await logoutUser.execute({ token: 'token1' });

    assert.deepEqual(sessionRepository.deleted, ['token1']);
  });

  test('is idempotent for an unknown token', async () => {
    const sessionRepository = fakeSessionRepository();
    const logoutUser = new LogoutUser(sessionRepository);

    await assert.doesNotReject(() => logoutUser.execute({ token: 'missing' }));
  });
});
