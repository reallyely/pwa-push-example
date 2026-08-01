# Architecture — how this application grows

This document is the standing rule for how new capability gets added to this
app. [`notification-delivery-model.md`](docs/notification-delivery-model.md) is
the first bounded context written to this standard, and is implemented. Write
new bounded contexts to match it.

## Language & runtime

Backend code is TypeScript, compiled with `tsc` (`tsconfig.json` at the repo
root: `module`/`moduleResolution: NodeNext`, `target: ES2022`,
`experimentalDecorators`/`emitDecoratorMetadata: true`) to `dist/`, and run
with plain `node dist/main.js`. This build step exists for exactly one
reason: NestJS's dependency-injection container needs `emitDecoratorMetadata`
to read constructor parameter types at runtime, and that requires a real
compile — Node's `--experimental-strip-types` only erases type syntax
character-for-character, it never transforms code, so it can't produce
decorator metadata. Every bounded context depends on `tsc` for this reason;
none should reach for a heavier build tool (bundler, `@nestjs/cli`, etc.)
without a new reason forcing it.

Because a real compiler is now in the toolchain, the erasure-only
restrictions this section used to list (no `enum`, no `namespace`, no
constructor parameter properties) no longer apply — write whichever of these
reads best. `domain/` and `application/` (see below) still don't use them
just because they're available; they weren't rewritten when the restriction
lifted, since there was no benefit to the churn.

Relative and `#`-prefixed subpath import specifiers must reference the
extension the *compiled* file will have (`.js`), not the source file's own
extension (`.ts`) — `tsc` copies import strings into its output verbatim
rather than rewriting them, so a source file has to already say `.js` for the
compiled `.js` file to resolve it: `import { Recipient } from
'./recipient.js'`, even though the file on disk is `recipient.ts`. This is
the standard `NodeNext` module-resolution convention, not something specific
to this repo.

The browser-side code under `public/` stays plain JavaScript — no bundler
runs over it; the build step above only ever compiles `src/`.

## Folder architecture

```
src/
  main.ts                          # composition root entrypoint: bootstrap Nest, static
                                    # assets, listen. No business logic.
  app.module.ts                    # root Nest module: imports ConfigModule/ScheduleModule
                                    # and every bounded context's <context>.module.ts
  <bounded-context>/                # one per bounded context, e.g. notification-delivery/
    domain/                        # entities, value objects — zero framework/library imports,
                                    # including zero @nestjs/* imports
    application/
      ports.ts                     # repository/gateway interfaces + their DI Symbol tokens,
                                    # defined here (not domain/)
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

- **Ports live in `application/`, not `domain/`.** A repository or gateway
  interface is shaped by what this application needs to persist or deliver —
  that's a Use Case concern, not an Enterprise Business Rule an entity would
  carry regardless of the software. Keep `domain/` free of anything that only
  exists because of infrastructure.
- **`domain/` and `application/` never import `@nestjs/*` (or any other
  framework), full stop** — not even a `Symbol` token defined by Nest. This is
  stricter than the general Dependency Rule below: it's what keeps the DI
  framework choice from leaking into business logic. Use-case classes are
  plain, independently constructible and testable with `new`; NestJS's role
  is limited to *calling* them, via the `useFactory` wiring in each context's
  `<context>.module.ts`, and to the outer `infrastructure/`/`interface/`
  layers where framework awareness is expected.
- **Dependencies point inward only.** `infrastructure/` and `interface/` may
  import from `application/` and `domain/`. `application/` may import from
  `domain/`. Nothing in `domain/` or `application/` ever imports a name from
  `infrastructure/` or `interface/`.
- **One context never reaches into another context's `infrastructure/` or
  `interface/`.** Cross-context calls go through the target context's
  `application/` use cases only — that's the whole interface it exposes.
- **`src/infrastructure/` is not a bounded context and not `shared-kernel/`.**
  `shared-kernel/` holds a domain concept two contexts agree to share;
  `src/infrastructure/` holds purely technical adapters (file I/O, HTTP
  clients, etc.) that no context owns and every context may depend on. A file
  here must not import from any bounded context's `domain/` or
  `application/` — that dependency only ever runs the other way.
- **`src/main.ts` + `src/app.module.ts` + each context's `<context>.module.ts`
  together are the composition root.** Between them they construct
  infrastructure adapters, wire them into use cases, mount each context's
  controllers, and start listening. None of them contain business logic of
  their own — a `<context>.module.ts` is wiring (a `providers` array), not a
  place to put an `if`.

## Where documentation lives

- **One doc per bounded context, in `docs/`**, named `<context>-model.md`
  (e.g. `docs/notification-delivery-model.md`). Written *before* the code,
  since that's when the hard modeling decisions actually get made — not moved
  into `src/<context>/README.md` once code exists, so the doc isn't tied to a
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
