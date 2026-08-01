# Identity — Bounded Context

This document captures the domain model for accounts, login, and roles
(`src/identity/`), scoped deliberately as its own **bounded context**,
separate from both [`domain-model.md`](domain-model.md)'s Core Domain
(Training / Survey / Participant / Question) and
[`notification-delivery-model.md`](notification-delivery-model.md)'s
Recipient/Notification model.

## Why this is its own bounded context

Identity is a **Generic Subdomain** — same reasoning as
[`notification-delivery-model.md`](notification-delivery-model.md): email +
password authentication, sessions, and role storage are a solved problem, not
this project's competitive advantage. It stays decoupled from every other
context so that:

- Password hashing, session tokens, and cookie mechanics never leak into
  Notification Delivery or the future Core Domain.
- Other contexts depend on Identity through a narrow interface (its
  `application/` use cases, plus the one sanctioned guard-import exception
  described below) — they never reach into its storage.
- This context's own model stays small enough to reason about on its own.

No Training/Survey/Participant/Question concepts are modeled here. That is
intentional and out of scope for this document.

## Ubiquitous language

| Term | Meaning in this context |
|---|---|
| **User** (aggregate root) | An account: `id`, `email` (unique, login identifier), `passwordHash`, `role`, `createdAt`. |
| **Role** | Closed set `Participant \| Researcher \| Trainer` a User is assigned at registration. |
| **Session** | A logged-in browser's proof of identity: `token` (identity), `userId`, `expiresAt`. |

Explicitly rejected terms:

- **`Account`** — considered and dropped. It's a redundant word for the same
  concept as `User`; keeping both in circulation would leave no rule for which
  one a new contributor should reach for. `User` wins because it's what every
  other context (and the HTTP layer, `req.user`) already needs to say.
- **This context's `User(role: Participant)` vs. the Core Domain's
  `Participant`** — not a rejected term, but a deliberate non-merge worth
  recording here the way `notification-delivery-model.md` records its own
  `Recipient` boundary note. A `User` with `role: Participant` is a
  login/credentials concept — email, password hash, nothing about the study
  itself. The future Core Domain's `Participant` entity
  ([`domain-model.md`](domain-model.md)) is a different concept — survey
  demographics, blackout window — that happens to belong to the same person.
  When that entity is built, it references a `User` by id rather than
  duplicating email/credential storage; Identity's model does not grow
  study-specific fields to accommodate it.

## Entities & Aggregates

### `User` (aggregate root)

- `id` — identity
- `email` — unique, login identifier
- `passwordHash` — never the raw password
- `role` — a `Role`
- `createdAt`

Behavior: `register({id, email, passwordHash, role, createdAt})` — the only
creation path. No mutation methods: no password change, no role change, no
email change. Nothing in the current requirements asks for them, and adding
them speculatively would be exactly the kind of premature vocabulary growth
`notification-delivery-model.md`'s own rejected-terms discipline warns
against.

### `Session`

- `token` — identity, and the bearer credential itself (must be unguessable)
- `userId` — reference to a `User` by id, not embedded
- `expiresAt`

Behavior: `issue({token, userId, ttlMs})` — the only creation path, sets
`expiresAt = now + ttlMs`. `isExpired(now)` — the only query behavior a
Session needs.

`Role` is a value object, not an entity — a closed set with no identity of
its own, same shape as `NotificationStatus` in
[`notification-delivery-model.md`](notification-delivery-model.md): a frozen
object of constants plus `isValid()`.

## State machines

Identity has no multi-state entity the way `Notification` does. The only
state-like behavior in this context is `Session.isExpired(now)` — a session
is either live or expired, and expiry is a pure function of `expiresAt` versus
the current time, not a transition anything calls. There is no
`stateDiagram-v2` here because there is no transition to diagram: a Session is
never un-expired, extended, or moved between states by any use case — it is
simply issued once and later found to be expired or not. `LogoutUser` deletes
the Session row outright rather than transitioning it to a "logged out"
state, so there is no third state to model either.

## Target layering

Implemented as TypeScript compiled via `tsc` and run as NestJS (see
[`architecture.md`](../architecture.md) for why the build step exists and
which files are allowed to import `@nestjs/*`):

```
src/identity/
  domain/
    role.ts                    # value object: Participant | Researcher | Trainer, ROLES + isValid()
    user.ts                    # entity: User.register(...), no mutation methods
    session.ts                 # entity: Session.issue(...), isExpired(now)
  application/
    ports.ts                    # UserRepository, SessionRepository, PasswordHasher (interfaces)
                                 # + their DI Symbol tokens (USER_REPOSITORY, SESSION_REPOSITORY,
                                 # PASSWORD_HASHER, GENERATE_ID, GENERATE_SESSION_TOKEN)
    errors.ts                   # identityError — this context's coded-error shape, thrown by
                                 # use cases, mapped to HTTP status by
                                 # interface/identity-exception.filter.ts
    register-user.ts            # RegisterUser — validates + saves a new User, then calls
                                 # notification-delivery's RegisterRecipient to provision a
                                 # Recipient keyed by the new user's id
    login-user.ts                # LoginUser — verifies credentials, issues a Session
    logout-user.ts               # LogoutUser — deletes a Session by token, idempotent
    get-current-user.ts          # GetCurrentUser — resolves a Session token to a User view;
                                 # used by both GET /api/auth/me and SessionAuthGuard
    list-users.ts                # ListUsers — {id, email, role}[], no passwordHash; backs the
                                 # admin "send to" picker
                                 # Each file above exports one plain class with a single
                                 # execute(request) method (the Clean Architecture
                                 # "Interactor" shape) — zero @nestjs/* imports. Constructed
                                 # by identity.module.ts via useFactory, never auto-wired by
                                 # Nest's decorator scanning.
  infrastructure/
    sqlite-user-repository.ts    # @Injectable(); implements UserRepository; owns the users table
    sqlite-session-repository.ts # @Injectable(); implements SessionRepository; owns the sessions table
    scrypt-password-hasher.ts    # @Injectable(); implements PasswordHasher using node:crypto
                                 # (scryptSync + random salt + timingSafeEqual) — no new dependency
  interface/
    auth.controller.ts           # @Controller('api/auth') — register, login, logout, me, users
    session-auth.guard.ts        # @Injectable() CanActivate — reads the session cookie, resolves
                                 # it via a self-constructed GetCurrentUser, sets req.user
    roles.guard.ts               # @Injectable() CanActivate — reads @Roles() metadata via Reflector,
                                 # checks req.user.role
    roles.decorator.ts           # @Roles(...roles) — SetMetadata wrapper read by roles.guard.ts
    identity-exception.filter.ts # @Catch() ExceptionFilter, scoped to this context's controller
                                 # via @UseFilters() (not global) — error-code -> HTTP-status
                                 # mapping, imports the error type from application/errors.ts
                                 # rather than owning it
  identity.module.ts             # this context's slice of the composition root: a Nest @Module
                                 # whose providers array wires infrastructure adapters (useClass)
                                 # and use-case classes (useFactory, each keyed by the class
                                 # itself as its own DI token) into the controller above; imports
                                 # NotificationDeliveryModule to get RegisterRecipient
```

`src/infrastructure/sqlite.ts` is this context's persistence layer's
**generic technical infrastructure** module too (see
[`architecture.md`](../architecture.md) and
[`notification-delivery-model.md`](notification-delivery-model.md)) — shared,
not owned by Identity. `sqlite-user-repository.ts` and
`sqlite-session-repository.ts` are the only files that know the `users` and
`sessions` table schemas, calling `getDb()` directly in their constructors
rather than receiving it through Nest's DI, matching the existing pattern.

`ports.ts` lives in `application/`, not `domain/`, for the same reason
`notification-delivery-model.md` gives: a repository/hasher interface is
shaped by what this application needs to persist or verify, not an Enterprise
Business Rule the entities would carry regardless of the software.

Identity uses two separate id-shaped generators, not one, because they have
different security requirements: `GENERATE_ID` is the same weak generator
`notification-delivery.module.ts` already defines for `Recipient`/
`Notification` ids — fine, since those ids aren't secret. `Session.token` is a
bearer credential anyone holding it can use to act as that user, so
`GENERATE_SESSION_TOKEN` is wired separately, directly to
`crypto.randomBytes(32).toString('hex')`, and must never be satisfied by the
weak generator.

## Relationship to other contexts

Other contexts integrate with Identity in exactly two ways:

1. **Provisioning a Recipient.** `RegisterUser` calls
   `notification-delivery`'s `RegisterRecipient.execute({ username: user.id })`
   as a plain constructor dependency — no port/interface indirection, since
   `RegisterRecipient` is already a framework-free Interactor and this
   codebase treats a directly-injected plain class as a normal dependency
   between two `application/` layers. This fulfills the integration point
   `notification-delivery-model.md`'s "Relationship to the future Core
   Domain" section anticipated ("The Core Domain will provision Recipients
   into this context") — Identity fulfills that role now, ahead of the Core
   Domain existing. Any context that needs a `Recipient` provisioned for a
   `User` should follow this same shape: call `RegisterRecipient` directly,
   don't duplicate recipient-registration logic.

2. **Gating a route.** `SessionAuthGuard` and `RolesGuard` (in
   `src/identity/interface/`) are the one sanctioned exception to "one
   context never reaches into another context's `interface/`" (the rule
   `architecture.md` otherwise states without exception). Any controller in
   any context may `@UseGuards(SessionAuthGuard, RolesGuard)` by importing
   these two classes directly. This is allowed specifically because
   authentication/authorization is a cross-cutting concern, not a business
   capability being reached into — the same category of dependency as
   injecting Nest's own `ConfigService` or `Reflector` anywhere in the app,
   not a peer bounded context's domain logic. Both guards are deliberately
   constructible without going through `IdentityModule`'s DI container (see
   `session-auth.guard.ts`'s self-contained construction), so that importing
   them never requires a consuming context's module to import
   `IdentityModule` — which matters concretely here, since `IdentityModule`
   already imports `NotificationDeliveryModule` (for `RegisterRecipient`),
   and the reverse import would create a module cycle.

Other contexts must not import from `src/identity/domain/`,
`src/identity/application/`, or `src/identity/infrastructure/` — those stay
private to this context.

## Non-goals (for now)

- No password reset or password change.
- No email verification.
- No multi-role accounts — one `User` has exactly one `Role`, chosen once at
  registration.
- No admin-driven invites or account creation — registration is always
  self-service, with the registrant choosing their own role.
