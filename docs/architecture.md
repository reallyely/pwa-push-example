# Architecture — how this application grows

This document is the standing rule for how new capability gets added to this
app. [`notification-delivery-model.md`](docs/notification-delivery-model.md) is
the first bounded context written to this standard, and is implemented. Write
new bounded contexts to match it.

## Language & runtime

Backend code is TypeScript, run directly with `node --experimental-strip-types`
— no build step, no `typescript` package, no `tsconfig.json`. Node only
*erases* type syntax; it doesn't transform code, so avoid constructs that
require real transformation:

- No `enum` — use a `const`-object + derived union type instead (see
  `notification-status.ts` for the pattern).
- No `namespace`.
- No constructor parameter properties (`constructor(private x: T)`) — declare
  the field and assign it in the constructor body instead.

Interfaces, type aliases, generics, `private`/`public`/`readonly` modifiers on
already-declared members, and `import type`/`export type` are all pure
erasure and fine anywhere, including inside otherwise-CommonJS files.

Relative `require()`/`import` specifiers must include the literal `.ts`
extension — Node does not auto-resolve it the way it does for `.js`:
`require('../domain/recipient.ts')`, not `require('../domain/recipient')`.

The browser-side code under `public/` stays plain JavaScript — there's no
type-stripping runtime in a browser, and adding a bundler/build step to get
one there would contradict "no build step."

## Folder architecture

```
src/
  <bounded-context>/              # one per bounded context, e.g. notification-delivery/
    domain/                       # entities, value objects — zero framework/library imports
    application/
      ports.ts                    # repository/gateway interfaces, defined here (not domain/)
      <use-case>.ts                 # one file per operation
    infrastructure/                # adapters implementing application/ports.ts
    interface/                     # controllers — thin, translate delivery mechanism <-> use case
  shared-kernel/                   # only created the day two contexts provably need the
                                    # same domain concept — do not scaffold this speculatively
  infrastructure/                  # generic technical infrastructure with zero domain knowledge —
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
- **`server.ts` (or its equivalent) is composition root only.** It constructs
  infrastructure adapters, injects them into use cases, mounts each context's
  `interface/` routes, and starts listening. It contains no business logic of
  its own.

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
