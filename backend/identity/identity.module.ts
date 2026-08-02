import { Module } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import {
  USER_REPOSITORY,
  SESSION_REPOSITORY,
  PASSWORD_HASHER,
  GENERATE_ID,
  GENERATE_SESSION_TOKEN,
  type UserRepository,
  type SessionRepository,
  type PasswordHasher,
} from './application/ports.js';
import { SqliteUserRepository } from './infrastructure/sqlite-user-repository.js';
import { SqliteSessionRepository } from './infrastructure/sqlite-session-repository.js';
import { ScryptPasswordHasher } from './infrastructure/scrypt-password-hasher.js';
import { RegisterUser } from './application/register-user.js';
import { LoginUser } from './application/login-user.js';
import { LogoutUser } from './application/logout-user.js';
import { GetCurrentUser } from './application/get-current-user.js';
import { ListUsers } from './application/list-users.js';
import { AuthController } from './interface/auth.controller.js';
import { NotificationDeliveryModule } from '../notification-delivery/notification-delivery.module.js';
import { RegisterRecipient } from '../notification-delivery/application/register-recipient.js';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

@Module({
  imports: [NotificationDeliveryModule],
  controllers: [AuthController],
  providers: [
    { provide: USER_REPOSITORY, useClass: SqliteUserRepository },
    { provide: SESSION_REPOSITORY, useClass: SqliteSessionRepository },
    { provide: PASSWORD_HASHER, useClass: ScryptPasswordHasher },
    { provide: GENERATE_ID, useValue: generateId },
    { provide: GENERATE_SESSION_TOKEN, useValue: () => randomBytes(32).toString('hex') },

    {
      provide: RegisterUser,
      useFactory: (
        userRepository: UserRepository,
        passwordHasher: PasswordHasher,
        generateIdFn: () => string,
        registerRecipient: RegisterRecipient,
      ) => new RegisterUser(userRepository, passwordHasher, generateIdFn, registerRecipient),
      inject: [USER_REPOSITORY, PASSWORD_HASHER, GENERATE_ID, RegisterRecipient],
    },
    {
      provide: LoginUser,
      useFactory: (
        userRepository: UserRepository,
        sessionRepository: SessionRepository,
        passwordHasher: PasswordHasher,
        generateSessionTokenFn: () => string,
      ) => new LoginUser(userRepository, sessionRepository, passwordHasher, generateSessionTokenFn),
      inject: [USER_REPOSITORY, SESSION_REPOSITORY, PASSWORD_HASHER, GENERATE_SESSION_TOKEN],
    },
    {
      provide: LogoutUser,
      useFactory: (sessionRepository: SessionRepository) => new LogoutUser(sessionRepository),
      inject: [SESSION_REPOSITORY],
    },
    {
      provide: GetCurrentUser,
      useFactory: (sessionRepository: SessionRepository, userRepository: UserRepository) => new GetCurrentUser(sessionRepository, userRepository),
      inject: [SESSION_REPOSITORY, USER_REPOSITORY],
    },
    {
      provide: ListUsers,
      useFactory: (userRepository: UserRepository) => new ListUsers(userRepository),
      inject: [USER_REPOSITORY],
    },
  ],
})
export class IdentityModule {}
