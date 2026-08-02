# Architecture — how this application grows

This document is the standing rule for how new capability gets added to this
app. [`notification-delivery-model.md`](docs/notification-delivery-model.md) is
the first bounded context written to this standard, and is implemented. Write
new bounded contexts to match it.

## Language & runtime

The repo is an npm workspace root (`package.json`'s `"workspaces"`) with
three member packages — `backend/`, `domain/`, and `frontend/`. Each has
its own `package.json`; the root `package.json` only orchestrates (`npm run
build`/`start`/`test` fan out to the relevant workspace(s) — `build` covers
`backend/` and `frontend/`, `start`/`test` delegate to `backend/` only, since
`domain/` has no build step and Angular's own test runner needs a browser, a
separate concern from `backend/`'s `node --test` suite).

`frontend/` is an Angular (confirmed: `^22.1.0`, `frontend/package.json`)
single-page app: standalone components (no `NgModule`), zoneless
(`provideBrowserGlobalErrorListeners()` in `app.config.ts`, no
`zone.js`), signals for reactive state, and the newer `@if`/`@for` template
control-flow syntax. It's built by the Angular CLI (`ng build`, which uses
esbuild under the hood) and consumes `domain/` exactly the way `backend/`
does: `import type { Role } from 'domain/identity'`, resolved through the
npm-workspace symlink straight to `domain/`'s raw `.ts` source, no
path-mapping hacks on either side. See
[`docs/frontend-architecture.md`](frontend-architecture.md) for `frontend/`'s
own folder architecture and layering rules.

`backend/` is TypeScript, compiled with `tsc` (`backend/tsconfig.json`:
`module`/`moduleResolution: NodeNext`, `target: ES2022`,
`experimentalDecorators`/`emitDecoratorMetadata: true`) to `backend/dist/`,
and run with plain `node backend/dist/main.js`. This build step exists for
exactly one reason: NestJS's dependency-injection container needs
`emitDecoratorMetadata` to read constructor parameter types at runtime, and
that requires a real compile — Node's `--experimental-strip-types` only
erases type syntax character-for-character, it never transforms code, so it
can't produce decorator metadata. Every bounded context depends on `tsc` for
this reason; none should reach for a heavier build tool (bundler,
`@nestjs/cli`, etc.) without a new reason forcing it.

Because a real compiler is now in the toolchain, the erasure-only
restrictions this section used to list (no `enum`, no `namespace`, no
constructor parameter properties) no longer apply — write whichever of these
reads best. `domain/` and `application/` (see below) still don't use them
just because they're available; they weren't rewritten when the restriction
lifted, since there was no benefit to the churn.

Relative and `#`-prefixed subpath import specifiers *inside `backend/`* must
reference the extension the *compiled* file will have (`.js`), not the
source file's own extension (`.ts`) — `tsc` copies import strings into its
output verbatim rather than rewriting them, so a source file has to already
say `.js` for the compiled `.js` file to resolve it: `import { Recipient }
from '#notification-delivery/application/ports.js'`, even though the file on
disk is `ports.ts`. This is the standard `NodeNext` module-resolution
convention, not something specific to this repo. `backend/` code never
imports a bounded context's entities/value objects by relative path — those
now live in the separate `domain/` package (below) and are always reached
through its package name: `import { Recipient } from
'domain/notification-delivery'`.

`domain/` is entities and value objects only (see "The `domain/` package"
below) and ships as **raw TypeScript with no build step of its own** — no
`tsconfig.json`, no `dist/`. It's consumed two ways: `backend/` imports it
by package name (`domain/identity`, `domain/notification-delivery`), which
Node resolves via the npm-workspace symlink in `node_modules/domain` straight
to `domain/src/**/*.ts`, executed through Node's native TypeScript
type-stripping (no flag needed — confirmed on `node:22-alpine`, the
Dockerfile's base image, and on whatever Node the host runs); the Angular
`frontend/` package consumes it the same way, via esbuild (the bundler
Angular's `application` builder already uses for the app's own `.ts` files)
transforming `domain/`'s `.ts` inline as part of the app bundle — confirmed
working across `frontend/`'s builds.

Node's native type-stripping does **not** perform the same `.js`-means-`.ts`
extension substitution `tsc` does at type-check/emit time — it resolves a
`.ts` file's relative imports exactly as written, so a specifier of
`./role.js` inside a raw `.ts` file that only has a `role.ts` sibling (no
compiled `.js` ever exists for `domain/`) fails at runtime with
`ERR_MODULE_NOT_FOUND`. The reverse — writing `./role.ts` — resolves fine
under Node but fails `tsc`'s type-check (`backend/`'s single compilation
walks into `domain/`'s files as import targets) with `TS5097`, since
`allowImportingTsExtensions` requires `noEmit`/`emitDeclarationOnly`, which
`backend/` can't set (it needs real `.js` emit for
`emitDecoratorMetadata`). Neither convention that works for a compiled
package works for an uncompiled one referenced from a compiled one — so
`domain/`'s **own internal** cross-file imports (e.g. `user.ts` importing
`role.ts`, or the barrel `index.ts` files) go through a
self-referencing subpath import instead: `domain/package.json` declares
`"imports": { "#*": "./src/*.ts" }`, and its files write `import { Role }
from '#identity/role'`. Neither Node nor `tsc` treats a subpath specifier's
*text* as needing to match a real extension, so both resolve it to the same
`./src/identity/role.ts` file without conflict. This is a deliberate,
tested deviation from the plain relative-import style used everywhere else
in this repo, scoped entirely to `domain/`'s internal files — anyone
importing `domain/` from outside it (from `backend/` or `frontend/`) only
ever sees the package-name/barrel imports described above, never the `#*`
convention.

`frontend/` has its own independent build step, entirely separate from
`backend/`'s `tsc` compile above: Angular's CLI bundles `frontend/src/`
(plus the `domain/` package it imports) via esbuild into
`frontend/dist/frontend/browser/`. `backend/main.ts` serves that directory
as static assets and registers an Express catch-all middleware (after Nest's
own routes, deferring any `/api/*` path to them) that responds with its
`index.html` for any other unmatched `GET` — the standard SPA-fallback
pattern, so client-side routes survive a hard refresh or a direct deep link.
See `backend/main.ts` for the exact wiring and
[`docs/frontend-architecture.md`](frontend-architecture.md) for `frontend/`'s
own folder architecture and layering rules, rather than restating them here
— same "one doc per concern, cross-reference instead of duplicate"
discipline this doc already follows for
[`notification-delivery-model.md`](notification-delivery-model.md).

## The `domain/` package

`domain/` holds only the Entities/Value Objects for every bounded context —
`domain/src/<context>/*.ts` plus a barrel `index.ts` per context, exported
from `domain/package.json` as `domain/<context>` (e.g. `domain/identity`,
`domain/notification-delivery`). It has **zero framework imports and zero
decorators**, same rule as `domain/` always had when it lived inside each
bounded context under `backend/` — moving it to a shared top-level package
didn't relax that, since it's the one piece of each context two different
runtimes (this NestJS backend, and the Angular `frontend/`) both need to
import verbatim. Nothing except Entities/Value Objects belongs here — ports,
use cases, and everything else in the list below stays put in
`backend/<context>/`.

**Promotion rule.** A context's `domain/` is allowed to start out living
inline at `backend/<context>/domain/`, exactly as `identity/` and
`notification-delivery/` both originally did before this repo grew a second
delivery mechanism — for as long as only `backend/` consumes it. It only
needs to move out into this shared top-level `domain/<context>/` package the
day a second delivery mechanism (like `frontend/`) actually needs the same
entities/value objects. This is forward-looking guidance for the next
bounded context that gets added, not a description of history: don't
scaffold a context straight into the shared package speculatively, the same
"don't scaffold this speculatively" discipline `shared-kernel/`'s own
folder-tree comment below already states for the *cross-context* sharing
axis, applied here to the *cross-delivery-mechanism* axis instead.

## Folder architecture

```
domain/                            # shared package — see "The domain/ package" above
  package.json
  src/
    <bounded-context>/
      <entity-or-value-object>.ts  # zero framework/library imports, including zero @nestjs/*
      index.ts                     # barrel: export * from '#<context>/<file>' for each file above

backend/
  main.ts                          # composition root entrypoint: bootstrap Nest, static
                                    # assets, listen. No business logic.
  app.module.ts                    # root Nest module: imports ConfigModule/ScheduleModule
                                    # and every bounded context's <context>.module.ts
  <bounded-context>/                # one per bounded context, e.g. notification-delivery/
    application/
      ports.ts                     # repository/gateway interfaces + their DI Symbol tokens,
                                    # defined here (not domain/) — imports entities from
                                    # 'domain/<context>' by package name
      <use-case>.ts                  # one file per operation, a plain class with an execute()
                                    # method (Clean Architecture "Interactor") — zero
                                    # @nestjs/* imports; Nest only ever calls into these,
                                    # never decorates them
    infrastructure/                 # adapters implementing application/ports.ts, as real
                                    # @Injectable() Nest providers — this is the "Frameworks &
                                    # Drivers" ring, where framework awareness belongs
    interface/                      # the delivery-mechanism layer, and the only place besides
                                    # the composition root that imports @nestjs/*: thin
                                    # @Controller()s, an @Injectable() scheduler if the context
                                    # has time-based triggers, an @Catch() exception filter —
                                    # each translates its delivery mechanism <-> a use case
    <context>.module.ts             # this context's slice of the composition root: a Nest
                                    # @Module wiring infrastructure providers (useClass) and
                                    # use-case classes (useFactory, keyed by the class itself
                                    # as its own DI token) into the controllers/scheduler above
  shared-kernel/                    # only created the day two contexts provably need the
                                     # same domain concept — do not scaffold this speculatively
  infrastructure/                   # generic technical infrastructure with zero domain knowledge —
                                     # e.g. sqlite.ts (shared DatabaseSync connection to
                                     # DATA_DIR/app.db). Owns no entity/record types and no
                                     # context-specific filenames/table schemas; those belong to the
                                     # bounded context's own infrastructure/ adapter that calls in here
```

Rules that go with the tree:

- **Ports live in `backend/<context>/application/`, not `domain/`.** A
  repository or gateway interface is shaped by what this application needs
  to persist or deliver — that's a Use Case concern, not an Enterprise
  Business Rule an entity would carry regardless of the software. Keep
  `domain/` free of anything that only exists because of infrastructure.
- **`domain/` and `application/` never import `@nestjs/*` (or any other
  framework), full stop** — not even a `Symbol` token defined by Nest. This is
  stricter than the general Dependency Rule below: it's what keeps the DI
  framework choice from leaking into business logic. Use-case classes are
  plain, independently constructible and testable with `new`; NestJS's role
  is limited to *calling* them, via the `useFactory` wiring in each context's
  `<context>.module.ts`, and to the outer `infrastructure/`/`interface/`
  layers where framework awareness is expected. `domain/` additionally never
  imports anything from `backend/` — the dependency only ever runs
  `backend/` → `domain/`, never the reverse, since `domain/` is also consumed
  by the `frontend/` package and can't know NestJS (or any other
  backend-only concern) exists.
- **Dependencies point inward only.** `infrastructure/` and `interface/` may
  import from `application/` and `domain/`. `application/` may import from
  `domain/`. Nothing in `domain/` or `application/` ever imports a name from
  `infrastructure/` or `interface/`.
- **One context never reaches into another context's `infrastructure/` or
  `interface/`.** Cross-context calls go through the target context's
  `application/` use cases only — that's the whole interface it exposes.
- **`backend/infrastructure/` is not a bounded context and not
  `shared-kernel/`.** `shared-kernel/` holds a domain concept two contexts
  agree to share; `backend/infrastructure/` holds purely technical adapters
  (file I/O, HTTP clients, etc.) that no context owns and every context may
  depend on. A file here must not import from any bounded context's
  `domain/` or `application/` — that dependency only ever runs the other way.
- **`backend/main.ts` + `backend/app.module.ts` + each context's
  `<context>.module.ts` together are the composition root.** Between them
  they construct infrastructure adapters, wire them into use cases, mount
  each context's controllers, and start listening. None of them contain
  business logic of their own — a `<context>.module.ts` is wiring (a
  `providers` array), not a place to put an `if`.

## Where documentation lives

- **One doc per bounded context, in `docs/`**, named `<context>-model.md`
  (e.g. `docs/notification-delivery-model.md`). Written *before* the code,
  since that's when the hard modeling decisions actually get made — not moved
  into `backend/<context>/README.md` once code exists, so the doc isn't tied to a
  path that may not exist yet when it's written.
- **`docs/context-map.md`, once a second bounded context exists.**
  Names every context and the integration relationship between them
  (Customer-Supplier, Conformist, Anti-Corruption Layer, etc.). Until a second
  context exists, that relationship lives inline in the one context's doc (see
  "Relationship to the future Core Domain" in `notification-delivery-model.md`)
  — don't extract a map with only one entry in it.
- **`README.md`** links each context doc under a short callout, same as the
  existing link to `domain-model.md`.

## Per-context doc template

Each `<context>-model.md` covers these sections, in this order:

1. **Scope + subdomain classification** — Core / Supporting / Generic, and why
   this is being split off as its own bounded context.
2. **Ubiquitous language** — a table of terms, plus an *explicitly rejected
   terms* subsection recording what was considered and dropped, and why. This
   is the section most worth keeping honest: a rejected-terms list is where
   the actual modeling arguments get preserved for whoever reads this next.
3. **Entities & Aggregates** — fields, behavior, aggregate root boundaries.
4. **State machines** (if any) — a `mermaid stateDiagram-v2`, plus a "states
   considered and demoted" subsection distinguishing real business states from
   implementation-detail states (concurrency guards, retry markers, etc.).
5. **Target layering** — the folder tree above, filled in with this context's
   actual filenames and a one-line purpose comment per file.
6. **Relationship to other contexts** — stated as a rule the *other* context
   must follow to integrate with this one, not the reverse.
7. **Non-goals** — fields or concepts explicitly deferred, so a future
   contributor doesn't "helpfully" add them back in.
