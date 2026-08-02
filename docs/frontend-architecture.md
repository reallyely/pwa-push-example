# Frontend Architecture — how the Angular SPA grows

This document is [`docs/architecture.md`](architecture.md)'s sibling for the
frontend side: same standing-rule role, scoped to `frontend/`. It
cross-references `docs/architecture.md` for anything that document already
covers (the `domain/` package, its promotion rule, the npm-workspaces shape)
rather than repeating it here.

## Language & runtime

`frontend/` is an Angular **`^22.1.0`** (`frontend/package.json`) single-page
app:

- **Standalone** — no `NgModule` anywhere; every component declares its own
  `imports` array.
- **Zoneless** — `app.config.ts` calls `provideBrowserGlobalErrorListeners()`,
  not `provideZoneChangeDetection()`; there's no `zone.js` in the dependency
  list. Change detection runs off signal reads, not zone patching.
- **Signals** — reactive state throughout (`signal()`/`computed()`), not
  RxJS `BehaviorSubject`s or `@Input()`/`@Output()` decorators. `input()`/
  `output()` (the signal-based APIs) replace the old decorators.
- **`@if`/`@for`** — the newer built-in template control-flow syntax, not
  `*ngIf`/`*ngFor`.
- **No SSR.** This app is a plain SPA, matching the model the old
  `public/client/`+`public/admin/` static sites already used: `backend/
  main.ts` serves the built `index.html` + assets and falls back to
  `index.html` for any unmatched client-side route (see
  `docs/architecture.md`'s "Language & runtime" section for the exact
  wiring). There's no server-rendering concern to add on top of that.
- Built via the Angular CLI's `application` builder (`ng build`), which uses
  **esbuild** under the hood — no separate bundler config in this repo.

## UI component library

`frontend/` uses **PrimeNG `^22.0.0`** (the only PrimeNG major aligned with
Angular `^22.1.0`) for interactive controls — `p-inputtext`/`p-password`,
`p-select`, `p-checkbox`, `p-datepicker`, `p-button`, `p-table`, `p-card`,
`p-tag`, `p-message` — across `identity/interface/login-form` and every
`notification-delivery/interface/` form/table/card. Theming is the **Aura**
preset from `@primeuix/themes`, wired via `providePrimeNG({ theme: { preset:
Aura }, ... })` in `app.config.ts`; `primeicons/primeicons.css` is imported
globally in `styles.css`.

**Licensing.** As of PrimeNG 22, the library verifies a signed license key at
app-init and renders a visible "Invalid PrimeUI License" banner if none is
configured or it's expired — this applies even to the previously-MIT core
components, not just the paid Pro tier. `app.config.ts`'s `providePrimeNG`
call carries a **free Community license key** (qualifies under PrimeTek's
Community terms: primeui.dev/licenses/community), valid **2026-08-02 →
2027-08-02**. Renew before expiry at the same URL and swap the `license`
string in `app.config.ts` — there's no build-time/env-var indirection for it
today, matching the fact `frontend/` has no other env-var mechanism (it's a
plain static SPA bundle, see "Language & runtime" above).

**Two different `public/` directories — don't confuse them.** The repo root
used to have a top-level `public/` (the old hand-rolled `public/client/` +
`public/admin/` static sites) — that directory is deleted; this rewrite
replaced it entirely. `frontend/public/` is a completely different thing:
it's the Angular CLI's own static-asset convention (`angular.json`'s
`assets: [{ glob: '**/*', input: 'public' }]`), copied byte-for-byte into
the build output root. Today it holds `manifest.webmanifest`, the hand-rolled
`sw.js` (see below), `favicon.ico`, and `icons/icon-{192,512}.png`.

## The service worker decision

`frontend/public/sw.js` is a hand-rolled, plain static service worker —
deliberately **not** `@angular/service-worker`. `push`/`notificationclick`/
`pushsubscriptionchange` need to stay under this app's own control (custom
notification rendering, navigating an existing client to `/notification/:id`
on click, re-subscribing on `pushsubscriptionchange`); Angular's
`ngsw-worker.js` is a single generated file with no hook point for custom
push handling, so it can't do any of that. Angular's CLI copies `sw.js` into
the build root verbatim (it's a `frontend/public/` asset) — it is never
bundled/processed by esbuild, so unlike the rest of `frontend/src/` it can't
`import` the app's own TypeScript helpers and keeps its own inline copy of
`urlBase64ToUint8Array` (see the file's header comment). Its only behavioral
difference from the old `public/client/sw.js` is the `notificationclick`
target: `/notification/:id` (an Angular route) instead of the old
`/notification.html?id=`.

## Path aliases

`tsconfig.json` declares one path alias: `@app/*` → `src/app/*`. Any import
that would otherwise climb out of its own directory (`../`, `../../`) uses
this alias instead — e.g. `notification-delivery/infrastructure/`'s adapters
import their own context's ports as `@app/notification-delivery/application/ports`,
and `shell/`'s pages reach into `identity/`/`notification-delivery/` as
`@app/identity/application/auth.store`. This mirrors the existing
`domain/identity` / `domain/notification-delivery` package-import style
(`domain/`'s `package.json` `exports`, see `docs/architecture.md`) so every
cross-context or cross-layer import states which context and layer it comes
from at a glance, rather than requiring the reader to count `../` segments.
Imports that stay within the same directory (`./ports`, `./client-login.page`)
are left as plain relative imports — the directory is already unambiguous.

Angular's esbuild-based builder needs `baseUrl` set alongside `paths` to
resolve the alias (unlike plain `tsc`, which supports path-mapping without a
`baseUrl` since TypeScript 4.1); `ignoreDeprecations: "6.0"` silences the
resulting `TS5101` (`baseUrl` deprecated, removed in TypeScript 7.0) until
the toolchain offers a baseUrl-free way to satisfy the builder.

## Folder architecture

```
frontend/
  public/                          # Angular CLI's static-asset root, copied verbatim into
                                    # the build (see "Two different public/ directories" above)
    manifest.webmanifest
    sw.js                          # hand-rolled service worker — see "The service worker decision"
    favicon.ico
    icons/icon-192.png, icon-512.png
  src/
    index.html                     # shell HTML: <app-root>, manifest link, theme-color, apple-touch-icon
    main.ts                        # bootstrapApplication(App, appConfig)
    styles.css                     # global styles
    app/
      app.ts, app.html, app.css    # root component: <h1> + <router-outlet>, nothing else
      app.config.ts                # composition root's providers array — see "Dependency rule" below
      app.routes.ts                # '' -> shell/client (lazy), 'admin' -> shell/admin (lazy)

      identity/                    # bounded context — mirrors docs/identity-model.md
        application/
          ports.ts                 # AuthGateway (abstract class) + AuthenticatedUser response model
          auth.store.ts            # AuthStore — plain class, currentUser signal, login/register/
                                    # logout/refresh, `ready` promise guards need. Constructed via
                                    # app.config.ts's useFactory (see "Dependency rule")
        infrastructure/
          http-auth-gateway.ts     # @Injectable() HttpAuthGateway implements AuthGateway via
                                    # HttpClient, withCredentials: true
        interface/
          login-form.ts/.html/.css # reusable form (login + register), parameterized by
                                    # allowedRegisterRoles — shared by both client and admin areas
          session.guard.ts         # sessionGuard(loginPath) — functional CanActivateFn
          roles.guard.ts           # rolesGuard(allowed, redirectTo) — functional CanActivateFn

      notification-delivery/       # bounded context — mirrors docs/notification-delivery-model.md
        application/
          ports.ts                 # RecipientGateway, NotificationGateway, PushSubscriptionPort
                                    # (abstract classes) + NotificationView/RecipientView/
                                    # Send-/ScheduleNotificationRequest response/request models
          enable-push-notifications.ts  # EnablePushNotifications — plain class, orchestrates
                                    # permission -> register SW -> subscribe -> RecipientGateway;
                                    # `status` signal (idle/unsupported/needs-install/
                                    # requesting-permission/subscribing/enabled/denied/error);
                                    # also owns the silent resubscribe-on-open behavior
          admin-notifications.store.ts  # AdminNotificationsStore — plain class, scheduled/history
                                    # signals + send/schedule/cancel, each followed by the matching
                                    # list reload
        infrastructure/
          http-recipient-gateway.ts     # @Injectable() implements RecipientGateway via HttpClient
          http-notification-gateway.ts  # @Injectable() implements NotificationGateway via HttpClient
          browser-push-gateway.ts       # @Injectable() implements PushSubscriptionPort via
                                    # navigator.serviceWorker/Notification/PushManager
        interface/
          enable-notifications-card.ts/.html/.css   # reusable card: status message + Enable button
          notification-detail-page.ts/.html/.css    # routed page, `id` bound from the route's
                                    # :id param via withComponentInputBinding()
          send-notification-form.ts/.html/.css      # admin: user picker + title/body/icon +
                                    # schedule-for-later toggle
          scheduled-table.ts/.html/.css             # admin: pending list, emits `cancel`
          notification-history-table.ts/.html/.css  # admin: read-only sent/failed/canceled list

      training/                     # bounded context — mirrors docs/domain-model.md's
                                    # "Question — implemented slice" section
        application/
          ports.ts                 # QuestionGateway (abstract class) + QuestionView/
                                    # CreateQuestionRequest/AnswerFormatRequest/AnswerFormatView
          questions.store.ts       # QuestionsStore — plain class, `questions` signal,
                                    # load()/create() (create reloads the list after saving,
                                    # same reload-after-mutation pattern AdminNotificationsStore uses)
        infrastructure/
          http-question-gateway.ts # @Injectable() implements QuestionGateway via HttpClient
        interface/
          question-form.ts/.html/.css  # researcher authoring form: prompt + answer-format
                                    # picker (FreeInput/Likert/Choice), conditional scale-point/
                                    # option list editors, a client-side `<name>` parameter
                                    # preview (mirrors domain/training's parameterNames parsing
                                    # for immediate feedback, not a shared import — there's no
                                    # Question instance to call the real getter on yet)
          question-list.ts/.html/.css  # read-only table: prompt, answer-format summary, parameters

      shell/                       # NOT a bounded context — see "shell/ is not a bounded
                                    # context" below
        client/
          client.routes.ts         # CLIENT_ROUTES
          client-login.page.ts     # wraps LoginForm, Participant-only registration
          client-home.page.ts/.html # account info + <app-enable-notifications-card>
        admin/
          admin.routes.ts          # ADMIN_ROUTES
          admin-login.page.ts      # wraps LoginForm, Researcher|Trainer registration
          admin-dashboard.page.ts/.html  # send form + scheduled table + history table;
                                    # links to /admin/questions for Researchers only
          user-picker.ts           # mergeUserPickerOptions() — merges identity's user list
                                    # with notification-delivery's recipient list
          questions.page.ts/.html/.css  # wraps <app-question-form> + <app-question-list>,
                                    # Researcher-only route

      infrastructure/              # generic technical helpers, zero domain knowledge — mirrors
                                    # docs/architecture.md's backend/infrastructure/'s role
        browser-environment.ts     # isIOS() / isStandalone()
        url-base64.ts              # urlBase64ToUint8Array()
```

## Dependency rule

Mirrors [`docs/architecture.md`](architecture.md)'s dependency rule:

- **`interface/` → `application/` → `domain/*`.** Each context's `interface/`
  components depend on its own `application/` ports/stores; `application/`
  imports shared entities/value objects from `domain/identity` /
  `domain/notification-delivery` by package name, exactly like `backend/`
  does (see `docs/architecture.md`'s "The `domain/` package" section — the
  same package, the same promotion rule, no frontend-specific variant of
  either).
- **`infrastructure/` → `application/`'s `ports.ts`.** Each adapter
  (`http-auth-gateway.ts`, `browser-push-gateway.ts`, etc.) implements an
  abstract class from its own context's `ports.ts` and is the only ring of
  that context allowed to import `HttpClient`, `navigator`, or any other
  DOM/fetch global.
- **`application/` stays framework-free**, with one deliberate, narrow
  exception this frontend settled on during implementation: `application/`
  classes may import `signal`/`computed`/`Signal` from `@angular/core` and
  `Observable` from `rxjs` — reactive value primitives, not decorators or DI
  — but must otherwise stay plain: constructible with `new`, never
  `@Injectable`, never importing `@angular/common/http`, `@Component`, or
  the Router. `AuthStore`, `EnablePushNotifications`, and
  `AdminNotificationsStore` are all plain classes for this reason.
- **One context never reaches into another's `infrastructure/` or
  `interface/`.** Cross-context calls go through the target context's
  `application/` layer only.

### Reconciling "plain class" with "one shared instance": `useFactory` in `app.config.ts`

Angular's DI needs to hand out a single shared `AuthStore` (or
`EnablePushNotifications`, or `AdminNotificationsStore`) instance app-wide —
the login form, the guards, and every page reading `currentUser()` all need
to see the same state — but these classes are deliberately not
`@Injectable()`. `app.config.ts` resolves that with a factory provider:

```ts
{ provide: AuthGateway, useClass: HttpAuthGateway },
{ provide: AuthStore, useFactory: () => new AuthStore(inject(AuthGateway)) },
```

`inject()` called inside the factory still resolves through Angular's DI
container (so `HttpAuthGateway`'s own `HttpClient` dependency is satisfied
normally), but the class being constructed stays a plain, independently
`new`-able, unit-testable object. This is this frontend's direct analogue of
`backend/<context>.module.ts`'s own `useFactory` wiring
(`docs/architecture.md`'s "Folder architecture" section) — same reconciliation
of "framework-free application layer" with "one DI-managed instance",
applied on the Angular side. `app.config.ts` does this for every
`application/` store/orchestrator in both contexts: `AuthStore`,
`EnablePushNotifications`, `AdminNotificationsStore`. Ports (`AuthGateway`,
`RecipientGateway`, `NotificationGateway`, `PushSubscriptionPort`) get a
plain `useClass` binding to their `@Injectable()` `infrastructure/` adapter,
same as any other Angular DI interface-to-implementation wiring.

## `shell/` is not a bounded context

`shell/` has no `domain/`, no `ports.ts`, and no rules of its own — it's this
SPA's composition root, the exact analogue of `backend/main.ts` +
`backend/app.module.ts` (`docs/architecture.md`'s "Folder architecture"
section): wiring only, no business logic. `app.routes.ts` lazy-loads
`shell/client/client.routes.ts` and `shell/admin/admin.routes.ts`; those
files and the page components under them compose `identity/`'s and
`notification-delivery/`'s already-built pieces into each area's URL space.

The one thing `shell/`'s page components are allowed to do that a real
bounded context's own `interface/` isn't: depend on more than one context's
`application/` layer directly. `client-home.page.ts` injects identity's
`AuthStore` and renders notification-delivery's
`<app-enable-notifications-card>`. The clearer example is
`shell/admin/admin-dashboard.page.ts`, which injects identity's `AuthStore`
+ `AuthGateway` and notification-delivery's `AdminNotificationsStore` +
`RecipientGateway` directly, then hands the merged result to
`shell/admin/user-picker.ts`'s `mergeUserPickerOptions()` — a pure function
that merges identity's `{id, email, role}[]` user list with
notification-delivery's `{username, subscribed}[]` recipient list (matched
by `recipient.username === user.id`) into the single labeled option list the
admin dashboard's user `<select>` needs. That merge deliberately lives in
`shell/admin/`, not inside either context's `application/`, because neither
context should know about the other's data shape. This is the frontend
analogue of the backend's `RegisterUser` calling `RegisterRecipient`
directly (`docs/identity-model.md`'s "Relationship to other contexts") —
application-to-application, never into another context's `infrastructure/`
or `interface/`.

## Context-by-context content

### `identity/` (mirrors [`docs/identity-model.md`](identity-model.md))

- **`application/ports.ts`** — `AuthGateway` (abstract class): `register`,
  `login`, `logout`, `me`, `listUsers`, each returning an `Observable`. Also
  defines `AuthenticatedUser` (`{id, email, role}`), the Response Model for
  every `/api/auth/*` endpoint — deliberately not `domain/identity`'s `User`
  entity, which also carries `passwordHash`/`createdAt` and a `register()`
  factory the frontend never calls.
- **`application/auth.store.ts`** — `AuthStore`: a `currentUser:
  Signal<AuthenticatedUser | null>`, a `ready: Promise<...>` that resolves
  once the initial `me()` bootstrap check completes (guards `await` this so
  a hard refresh never misjudges an already-logged-in session as logged
  out), and `login()`/`register()`/`logout()`/`refresh()` methods that all
  update `currentUser` via `tap`.
- **`infrastructure/http-auth-gateway.ts`** — `HttpAuthGateway`, the only
  ring of this context that knows about `HttpClient`; every call sets
  `withCredentials: true` so the browser sends/receives the backend's
  httpOnly session cookie (the frontend never reads or stores a token
  itself).
- **`interface/login-form.ts`** — `LoginForm`, one reusable presentational
  component for both areas: an `allowedRegisterRoles` input controls whether
  the role picker shows (client area passes `[ROLES.PARTICIPANT]`, hidden;
  admin area passes `[ROLES.RESEARCHER, ROLES.TRAINER]`, shown), and it
  emits a `success` output with the `AuthenticatedUser` rather than
  navigating itself — the parent page decides where to go.
- **`interface/session.guard.ts`**, **`interface/roles.guard.ts`** —
  `sessionGuard(loginPath)` and `rolesGuard(allowed, redirectTo)`, functional
  `CanActivateFn`s, this frontend's analogue of the backend's
  `SessionAuthGuard`/`RolesGuard` (`docs/identity-model.md`'s "Gating a
  route"). Both `inject(AuthStore)`, which only resolves because
  `app.config.ts` registers `AuthStore` via the factory provider described
  above.

### `notification-delivery/` (mirrors [`docs/notification-delivery-model.md`](notification-delivery-model.md))

- **`application/ports.ts`** — `RecipientGateway` (`vapidPublicKey`,
  `subscribe`, `resubscribe`, `listUsers`), `NotificationGateway` (`get`,
  `send`, `schedule`, `cancel`, `list`, `listScheduled`), `PushSubscriptionPort`
  (`registerServiceWorker`, `permission`, `requestPermission`, `subscribe`,
  `isStandalone`, `isIOS` — the browser Push/Notification/ServiceWorker
  abstraction so `application/` never touches `navigator`/`window`
  directly). Also defines the Response/Request Models crossing this
  boundary: `NotificationView`, `RecipientView`,
  `SendNotificationRequest`/`ScheduleNotificationRequest`, and
  `NotificationWireStatus` (the lowercase `pending`/`sent`/`canceled`/
  `expired`/`failed` wire vocabulary — a presentation-layer translation of
  `domain/notification-delivery`'s capitalized `NotificationStatus`, modeled
  as its own type rather than reused, same "wire shape gets its own type at
  the boundary" discipline `AuthenticatedUser` established).
- **`application/enable-push-notifications.ts`** — `EnablePushNotifications`,
  the real orchestration use case (ported from the old
  `public/client/app.js`'s `enableNotifications()`/`subscribeAndSend()`):
  `enable()` walks unsupported-browser → `'unsupported'`, iOS-not-installed
  → `'needs-install'` (iOS/iPadOS only allows the permission prompt once
  running standalone from the Home Screen), else request permission → deny
  → `'denied'`, else subscribe → `'enabled'`. `syncIfAlreadyPermitted()`
  ports the old app.js's "self-heal on every open" IIFE — iOS never fires
  `pushsubscriptionchange` and subscriptions have been observed to go stale
  with no event to react to, so a returning, already-permitted user gets
  silently re-subscribed on every app open, swallowing failures rather than
  surfacing an error for a sync the user didn't initiate.
- **`application/admin-notifications.store.ts`** — `AdminNotificationsStore`:
  `scheduled`/`history` signals, and `send`/`schedule`/`cancel` methods that
  each call the gateway then reload the relevant list — the same
  reload-after-mutation orchestration `public/admin/app.js` used to perform
  by hand after every send/schedule/cancel.
- **`infrastructure/http-recipient-gateway.ts`**,
  **`infrastructure/http-notification-gateway.ts`** — `HttpClient` adapters,
  `withCredentials: true`, one-for-one with `recipients.controller.ts` /
  `notifications.controller.ts`'s request/response shapes.
- **`infrastructure/browser-push-gateway.ts`** — `BrowserPushGateway`, the
  only ring of this context that knows about
  `navigator.serviceWorker`/`Notification`/`PushManager`; registers
  `/sw.js` and maps the DOM lib's `PushSubscription.toJSON()` shape onto
  `domain/notification-delivery`'s `PushSubscriptionJSON` explicitly (not
  cast), the same Gateway/Adapter discipline `http-auth-gateway.ts`'s
  `toAuthenticatedUser()` established.
- **`interface/enable-notifications-card.ts`** — reusable card; injects
  `EnablePushNotifications`, calls `syncIfAlreadyPermitted()` on init, shows
  status copy matching the old `public/client/app.js`'s `setStatus()`
  strings so the UX didn't regress, and only offers an "Enable
  notifications" button from the states a retry actually makes sense from
  (`idle`/`denied`/`error`).
- **`interface/notification-detail-page.ts`** — routed page; `id` is bound
  from the route's `:id` path param via `provideRouter`'s
  `withComponentInputBinding()` rather than injecting `ActivatedRoute` by
  hand. Calls `NotificationGateway.get()` directly (no store) — a store
  wrapping one read with no other behavior would be exactly the hollow
  pass-through `docs/architecture.md`'s discipline warns against.
- **`interface/send-notification-form.ts`**, **`scheduled-table.ts`**,
  **`notification-history-table.ts`** — the admin dashboard's pieces,
  mirroring `public/admin/app.js`'s single `#send-form` (user select,
  title/body/icon, a "schedule for later" toggle that swaps the submit
  label and reveals a `datetime-local` input) and its two tables
  (`scheduled-table` emits `cancel` for the page to act on;
  `notification-history-table` is pure read-only display).

### `training/` (mirrors [`docs/domain-model.md`](domain-model.md)'s "Question — implemented slice")

- **`application/ports.ts`** — `QuestionGateway` (abstract class): `create`,
  `list`. Also defines `QuestionView` (Response Model — `id`, `prompt`,
  `answerFormat`, `parameterNames`, `isParameterized`, one-for-one with
  `backend/training/interface/question-presenter.ts`'s `QuestionView`) and
  `CreateQuestionRequest`/`AnswerFormatRequest`, the discriminated-union wire
  shape (`{kind:'FreeInput'}` / `{kind:'Likert', scale}` /
  `{kind:'Choice', options, allowMultiple}`) one-for-one with
  `create-question.ts`'s own `AnswerFormatRequest`.
- **`application/questions.store.ts`** — `QuestionsStore`: a `questions`
  signal, `load()`, and `create()` (reloads the list after saving, same
  reload-after-mutation shape `AdminNotificationsStore` uses).
- **`infrastructure/http-question-gateway.ts`** — `HttpQuestionGateway`,
  `HttpClient` adapter, `withCredentials: true`.
- **`interface/question-form.ts`** — the researcher's authoring form: prompt
  textarea, an answer-format `p-select` (Free input / Likert scale /
  Choice), and conditional list editors — Likert reveals an ordered
  add/remove list of scale-point labels, Choice reveals an add/remove list
  of options plus an "allow selecting more than one" checkbox. Runs its own
  small `<name>` placeholder regex over the live prompt text to show a
  "Parameters detected: …" hint as the researcher types — a client-side
  mirror of `domain/training`'s `Question#parameterNames` parsing rather
  than a shared import, since there's no `Question` instance to call the
  real getter on until the form is submitted.
- **`interface/question-list.ts`** — read-only table: prompt, an
  answer-format summary tag (e.g. "Likert (5-point)", "Choice (3 options,
  multi-select)"), and any detected parameters.

## Routing

```
app.routes.ts:
  ''      -> loadChildren shell/client/client.routes.ts   (lazy)
  'admin' -> loadChildren shell/admin/admin.routes.ts      (lazy)

shell/client/client.routes.ts (CLIENT_ROUTES):
  'login'             -> ClientLoginPage                                    (no guard)
  ''                  -> ClientHomePage             [sessionGuard('/login')]
  'notification/:id'  -> NotificationDetailPage     [sessionGuard('/login')]

shell/admin/admin.routes.ts (ADMIN_ROUTES):
  'login'     -> AdminLoginPage                                             (no guard)
  ''          -> AdminDashboardPage   [sessionGuard('/admin/login'),
                                        rolesGuard([Researcher, Trainer], '/admin/login')]
  'questions' -> QuestionsPage        [sessionGuard('/admin/login'),
                                        rolesGuard([Researcher], '/admin/login')]
```

`questions` is Researcher-only (unlike the shared `''` dashboard route) —
matches `domain-model.md`'s "Question — implemented slice" backend gating
(`@Roles('Researcher')` on `questions.controller.ts`), since Question
authoring isn't a Trainer capability.

An unauthenticated visit to a guarded route redirects to that area's own
`login` route; a logged-in Participant hitting `/admin` fails `rolesGuard`
and redirects the same way. Both guards are combined in `admin`'s
`canActivate` array the same way the backend combines
`@UseGuards(SessionAuthGuard, RolesGuard)`
(`docs/identity-model.md`'s "Gating a route").

**`/notification/:id` is a path param**, not `?id=` like the old
`public/client/notification.html`. The only other place that mattered was
`frontend/public/sw.js`'s `notificationclick` handler, which now navigates
to `` `/notification/${notificationId}` `` instead of
`` `/notification.html?id=${notificationId}` `` — see "The service worker
decision" above.

## Dev workflow

`frontend/proxy.conf.json`:

```json
{ "/api": { "target": "http://localhost:3000", "secure": false } }
```

`angular.json`'s `serve.configurations.development` (the default `ng serve`
configuration) sets `proxyConfig: "proxy.conf.json"`, so running `ng serve`
(port 4200) transparently proxies any `/api/*` request to the NestJS dev
server on port 3000 — the browser only ever sees one origin (`4200`), with
no CORS configuration needed anywhere. This matches production too: there,
`backend/main.ts` serves the built Angular app itself, so the browser only
ever sees the backend's origin there as well. Two-terminal dev flow: `npm
start` (root, backend on :3000) in one terminal, `npm start
--workspace=frontend` (or `cd frontend && ng serve`) in another (:4200).
