import type { User } from '#identity/domain/user.js';
import type { Session } from '#identity/domain/session.js';

export const USER_REPOSITORY = Symbol('UserRepository');

export interface UserRepository {
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  findAll(): Promise<User[]>;
  save(user: User): Promise<void>;
}

export const SESSION_REPOSITORY = Symbol('SessionRepository');

export interface SessionRepository {
  findByToken(token: string): Promise<Session | null>;
  save(session: Session): Promise<void>;
  deleteByToken(token: string): Promise<void>;
}

export const PASSWORD_HASHER = Symbol('PasswordHasher');

export interface PasswordHasher {
  hash(password: string): Promise<string>;
  verify(password: string, hash: string): Promise<boolean>;
}

// DI seam for id generation — a plain value (not really a "port" the way a
// repository/gateway is), colocated here since it's the natural place other
// application classes' constructors pull it in from. Ids aren't secret.
export const GENERATE_ID = Symbol('GenerateId');
export type GenerateId = () => string;

// Separate from GENERATE_ID: a Session.token is a bearer credential, so it
// must be unguessable, unlike a weak id. Never satisfy this with GENERATE_ID.
export const GENERATE_SESSION_TOKEN = Symbol('GenerateSessionToken');
export type GenerateSessionToken = () => string;
