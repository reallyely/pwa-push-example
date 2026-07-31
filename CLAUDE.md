# Contributing

Read [`architecture.md`](architecture.md) first — it's the standing rule for how
capability gets added to this app (folder layout, layering, no-build-step TypeScript
constraints). Then read the relevant bounded-context doc(s) in [`docs/`](docs/):

- [`docs/domain-model.md`](docs/domain-model.md) — Core Domain (Training / Survey /
  Participant / Question).
- [`docs/notification-delivery-model.md`](docs/notification-delivery-model.md) —
  Notification Delivery bounded context.

## Planning

Before writing code, plan it using the `/domain-driven-design` and
`/clean-architecture` skills — model the bounded context and ubiquitous language
first, then place code in the correct layer per `architecture.md`'s folder
architecture (`domain/` → `application/` → `infrastructure/`/`interface/`,
dependencies pointing inward only).

## After development

- Run `npm test` and ensure it passes.
- Update the affected `docs/<context>-model.md` (and `architecture.md` if the
  folder architecture or per-context template changed) so documentation matches
  the code you just wrote.
