import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { ListUsers } from './list-users.js';
import { User } from '#identity/domain/user.js';
import type { UserRepository } from './ports.js';

function fakeUserRepository(users: User[]): UserRepository {
  return {
    async findByEmail() { throw new Error('not used in this test'); },
    async findById() { throw new Error('not used in this test'); },
    async findAll() { return users; },
    async save() { throw new Error('not used in this test'); },
  };
}

describe('ListUsers', () => {
  test('maps users to id/email/role, without passwordHash', async () => {
    const user = User.register({ id: 'u1', email: 'alice@example.com', passwordHash: 'secret', role: 'Researcher', createdAt: new Date() });
    const listUsers = new ListUsers(fakeUserRepository([user]));

    const result = await listUsers.execute();

    assert.deepEqual(result, [{ id: 'u1', email: 'alice@example.com', role: 'Researcher' }]);
    assert.equal((result[0] as any).passwordHash, undefined);
  });
});
