import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { RegisterUser } from './register-user.js';
import { User } from '#identity/domain/user.js';
import type { UserRepository, PasswordHasher } from './ports.js';
import type { RegisterRecipient } from '#notification-delivery/application/register-recipient.js';

function fakeUserRepository(existing: User | null = null): UserRepository & { saved: User[] } {
  const saved: User[] = [];
  const repository = {
    async findByEmail() { return existing; },
    async findById() { throw new Error('not used in this test'); },
    async findAll() { throw new Error('not used in this test'); },
    async save(user: User) { saved.push(user); },
  };
  return Object.assign(repository, { saved }) as unknown as UserRepository & { saved: User[] };
}

function fakePasswordHasher(): PasswordHasher {
  return {
    async hash(password: string) { return `hashed:${password}`; },
    async verify() { throw new Error('not used in this test'); },
  };
}

function fakeRegisterRecipient(): RegisterRecipient & { calls: any[] } {
  const calls: any[] = [];
  const recipient = {
    async execute(request: any) { calls.push(request); },
  };
  return Object.assign(recipient, { calls }) as unknown as RegisterRecipient & { calls: any[] };
}

describe('RegisterUser', () => {
  test('rejects an invalid email', async () => {
    const registerUser = new RegisterUser(fakeUserRepository(), fakePasswordHasher(), () => 'u1', fakeRegisterRecipient());

    await assert.rejects(
      () => registerUser.execute({ email: 'not-an-email', password: 'password1', role: 'Participant' }),
      (err: any) => err.code === 'INVALID_INPUT',
    );
  });

  test('rejects an invalid role', async () => {
    const registerUser = new RegisterUser(fakeUserRepository(), fakePasswordHasher(), () => 'u1', fakeRegisterRecipient());

    await assert.rejects(
      () => registerUser.execute({ email: 'alice@example.com', password: 'password1', role: 'Admin' }),
      (err: any) => err.code === 'INVALID_INPUT',
    );
  });

  test('rejects a short password', async () => {
    const registerUser = new RegisterUser(fakeUserRepository(), fakePasswordHasher(), () => 'u1', fakeRegisterRecipient());

    await assert.rejects(
      () => registerUser.execute({ email: 'alice@example.com', password: 'short', role: 'Participant' }),
      (err: any) => err.code === 'INVALID_INPUT',
    );
  });

  test('rejects an email that is already registered', async () => {
    const existing = User.register({
      id: 'u0',
      email: 'alice@example.com',
      passwordHash: 'h',
      role: 'Participant',
      createdAt: new Date(),
    });
    const registerUser = new RegisterUser(fakeUserRepository(existing), fakePasswordHasher(), () => 'u1', fakeRegisterRecipient());

    await assert.rejects(
      () => registerUser.execute({ email: 'alice@example.com', password: 'password1', role: 'Participant' }),
      (err: any) => err.code === 'EMAIL_TAKEN',
    );
  });

  test('normalizes email, saves the user, and provisions a Recipient', async () => {
    const userRepository = fakeUserRepository();
    const registerRecipient = fakeRegisterRecipient();
    const registerUser = new RegisterUser(userRepository, fakePasswordHasher(), () => 'u1', registerRecipient);

    const result = await registerUser.execute({ email: '  Alice@Example.com  ', password: 'password1', role: 'Participant' });

    assert.deepEqual(result, { id: 'u1', email: 'alice@example.com', role: 'Participant' });
    assert.equal(userRepository.saved.length, 1);
    assert.equal(userRepository.saved[0].passwordHash, 'hashed:password1');
    assert.deepEqual(registerRecipient.calls, [{ username: 'u1' }]);
  });
});
