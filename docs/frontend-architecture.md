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
`notification-delivery/interface/` form/table/card, plus **`p-menubar`** for
`shell/admin/admin-shell.page.ts`'s persistent nav bar (a `MenuItem[]`
built with `routerLink`s rather than `url`s, so it navigates through
Angular's router instead of a full page load). Theming is the **Aura**
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
                                    # Send-/ScheduleNotificationRequest response/request models.
                                    # RecipientGateway#listUsers and NotificationGateway#send/
                                    # schedule/cancel/list/listScheduled back the admin
                                    # send/history/scheduled UI that shell/admin/ used to compose
                                    # (removed as a POC — see notification-detail-page.ts below for
                                    # the one caller NotificationGateway has left, #get); the
                                    # backend routes and these port methods stay, unused by any
                                    # frontend UI today, rather than reshaping a contract still
                                    # backed by live endpoints
          enable-push-notifications.ts  # EnablePushNotifications — plain class, orchestrates
                                    # permission -> register SW -> subscribe -> RecipientGateway;
                                    # `status` signal (idle/unsupported/needs-install/
                                    # requesting-permission/subscribing/enabled/denied/error);
                                    # also owns the silent resubscribe-on-open behavior
        infrastructure/
          http-recipient-gateway.ts     # @Injectable() implements RecipientGateway via HttpClient
          http-notification-gateway.ts  # @Injectable() implements NotificationGateway via HttpClient
          browser-push-gateway.ts       # @Injectable() implements PushSubscriptionPort via
                                    # navigator.serviceWorker/Notification/PushManager
        interface/
          enable-notifications-card.ts/.html/.css   # reusable card: status message + Enable button
          notification-detail-page.ts/.html/.css    # routed page, `id` bound from the route's
                                    # :id param via withComponentInputBinding()

      training/                     # bounded context — mirrors docs/domain-model.md's
                                    # Question/Training/Enrollment & blackout window/Survey/
                                    # Survey Response "implemented slice" sections
        application/
          ports.ts                 # QuestionGateway + TrainingGateway (as before), plus
                                    # EnrollmentGateway, SurveyGateway, SurveyResponseGateway
                                    # (abstract classes) and their View/Request types
          questions.store.ts       # QuestionsStore — plain class, `questions` signal,
                                    # load()/create() (create reloads the list after saving)
          trainings.store.ts       # TrainingsStore — identical shape to QuestionsStore:
                                    # `trainings` signal, load()/create() (create reloads the
                                    # list after saving)
          enrollment.store.ts      # EnrollmentStore — `trainingIds`/`blackoutWindows` signals,
                                    # load(), enroll() (reloads after)
          surveys.store.ts         # SurveysStore — identical shape to TrainingsStore:
                                    # `surveys` signal, load()/create()
          survey-response.store.ts # SurveyResponseStore — `current` signal (the in-progress
                                    # response), open()/recordResourceAccess()/submit(), each
                                    # updating `current` from the gateway's response
        infrastructure/
          http-question-gateway.ts # @Injectable() implements QuestionGateway via HttpClient
          http-training-gateway.ts # @Injectable() implements TrainingGateway via HttpClient
          http-enrollment-gateway.ts       # @Injectable() implements EnrollmentGateway
          http-survey-gateway.ts           # @Injectable() implements SurveyGateway
          http-survey-response-gateway.ts  # @Injectable() implements SurveyResponseGateway
        interface/
          question-form.ts/.html/.css  # researcher authoring form: prompt + answer-format
                                    # picker (FreeInput/Likert/Choice), conditional scale-point/
                                    # option list editors, a client-side `<name>` parameter
                                    # preview (mirrors domain/training's parameterNames parsing
                                    # for immediate feedback, not a shared import — there's no
                                    # Question instance to call the real getter on yet)
          question-list.ts/.html/.css  # read-only table: prompt, answer-format summary, parameters
          training-form.ts/.html/.css  # researcher scheduling form: a PrimeNG p-datepicker
                                    # ([showTime]="true") for dateTime + a p-select for
                                    # trainerId, options passed in via a required
                                    # `trainerOptions` input (the trainer list itself is
                                    # composed one layer up, by shell/admin/trainings.page.ts)
          training-list.ts/.html/.css  # read-only p-table: dateTime (formatted via DatePipe)
                                    # and the matching trainer's email, resolved by looking up
                                    # trainerId in the same trainerOptions input rather than a
                                    # second HTTP call
          survey-form.ts/.html/.css    # researcher authoring form: `trainingOptions`/
                                    # `questionOptions` inputs (composed one layer up, same
                                    # pattern as training-form's trainerOptions), a p-datepicker
                                    # for sendDate, a question picker that reveals per-parameter
                                    # inputs for a parameterized Question before adding it to the
                                    # assignment list, and an add/remove resource-URL list
          survey-list.ts/.html/.css    # read-only p-table: sendDate, resolved training label via
                                    # trainingOptions, question/resource counts, a "View results"
                                    # link per row
          survey-fill.ts/.html/.css    # participant-facing: opens a SurveyResponse on init,
                                    # renders each SurveyQuestion's real rendered prompt (calls
                                    # domain/training's actual Question.renderPrompt, unlike
                                    # question-form's client-side preview mirror, since a real
                                    # Question + real parameterValues both exist here), an answer
                                    # input matching each Question's AnswerFormat, resource links
                                    # that call recordResourceAccess() on click, and Submit
          survey-results.ts/.html/.css # researcher-facing: p-table of a survey's responses
                                    # (who/when/status) with a per-row expand toggle showing raw
                                    # answers — no aggregation/charting

      shell/                       # NOT a bounded context — see "shell/ is not a bounded
                                    # context" below
        client/
          client.routes.ts         # CLIENT_ROUTES
          client-login.page.ts     # wraps LoginForm, Participant-only registration
          client-home.page.ts/.html # account info + <app-enable-notifications-card> +
                                    # a "Register for a Training" link to /register
          register.page.ts/.html/.css   # lists open Trainings (TrainingsStore) with an Enroll
                                    # button per row, tagging rows already in
                                    # EnrollmentStore.trainingIds() — any authenticated session
          survey.page.ts/.html/.css     # wraps <app-survey-fill>, `:surveyId` bound via
                                    # withComponentInputBinding() (mirrors
                                    # notification-detail-page.ts's pattern)
        admin/
          admin.routes.ts          # ADMIN_ROUTES: 'login' (no guard) + a '' parent route
                                    # rendering AdminShellPage, guarded once
                                    # (sessionGuard + rolesGuard([Researcher, Trainer])) for the
                                    # whole subtree, with dashboard/questions/trainings/surveys/
                                    # surveys/:id/results as its children — Researcher-only
                                    # children add their own rolesGuard([Researcher]) on top
          admin-shell.page.ts/.html/.css  # persistent layout: a semantic <nav> wrapping a
                                    # PrimeNG <p-menubar>, `<router-outlet>` below it for the
                                    # child route. `navItems` is a computed MenuItem[] —
                                    # Dashboard always, Questions/Trainings/Surveys appended only
                                    # when AuthStore.currentUser()?.role === Researcher — plus an
                                    # `end`-template account readout (email + role) and a Log out
                                    # button, so every admin page shares one nav/logout instead of
                                    # each page repeating them
          admin-login.page.ts      # wraps LoginForm, Researcher|Trainer registration
          admin-dashboard.page.ts/.html  # the '' child route: a one-line welcome readout from
                                    # AuthStore — navigation and logout now live in
                                    # admin-shell.page.ts, not repeated here
          questions.page.ts/.html/.css  # wraps <app-question-form> + <app-question-list>,
                                    # Researcher-only route
          trainings.page.ts/.html/.css  # wraps <app-training-form> + <app-training-list>;
                                    # injects TrainersStore directly for `trainerOptions` —
                                    # Researcher-only route
          surveys.page.ts/.html/.css    # wraps <app-survey-form> + <app-survey-list>; fetches
                                    # TrainingsStore + QuestionsStore and hands them down as
                                    # `trainingOptions`/`questionOptions` — Researcher-only route
          survey-results.page.ts/.html/.css  # `:id` bound via withComponentInputBinding(),
                                    # loads that survey's responses and wraps
                                    # <app-survey-results> — Researcher-only route, keeps its own
                                    # "Back to surveys" link since it isn't itself a nav destination

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
  the Router. `AuthStore` and `EnablePushNotifications` are both plain
  classes for this reason.
- **One context never reaches into another's `infrastructure/` or
  `interface/`.** Cross-context calls go through the target context's
  `application/` layer only.

### Reconciling "plain class" with "one shared instance": `useFactory` in `app.config.ts`

Angular's DI needs to hand out a single shared `AuthStore` (or
`EnablePushNotifications`) instance app-wide — the login form, the guards,
and every page reading `currentUser()` all need to see the same state — but
these classes are deliberately not
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
`EnablePushNotifications`. Ports (`AuthGateway`, `RecipientGateway`,
`NotificationGateway`, `PushSubscriptionPort`) get a plain `useClass`
binding to their `@Injectable()` `infrastructure/` adapter, same as any
other Angular DI interface-to-implementation wiring.

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
`<app-enable-notifications-card>` — application-to-application, never into
another context's `infrastructure/` or `interface/`, the frontend analogue
of the backend's `RegisterUser` calling `RegisterRecipient` directly
(`docs/identity-model.md`'s "Relationship to other contexts").

`shell/admin/admin-shell.page.ts` is a narrower, single-context case of the
same "shell composes, contexts don't" rule: it injects only identity's
`AuthStore` (to decide which nav items a Researcher vs. a Trainer sees, and
to log out) and renders the `<router-outlet>` its child routes fill in — it
doesn't reach into `training/` or `notification-delivery/` at all, since
building a nav bar and reading `currentUser()` doesn't require it.

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
  `RecipientGateway#listUsers` and `NotificationGateway#send`/`schedule`/
  `cancel`/`list`/`listScheduled` back the admin send/history/scheduled UI
  `shell/admin/` used to compose — removed as a POC (see
  `interface/notification-detail-page.ts` below for the one caller
  `NotificationGateway` has left, `#get`). The backend routes and these port
  methods stay; they're just unused by any frontend UI today.
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
  signal, `load()`, and `create()` (reloads the list after saving).
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

`training/` also carries the `Training` slice
(mirrors [`docs/domain-model.md`](domain-model.md)'s "Training — implemented
slice"):

- **`application/ports.ts`** (Training additions) — `TrainingGateway`
  (abstract class): `create`, `list` — same two methods `QuestionGateway`
  has (no `get`, matching what the UI uses). Also defines `TrainingView`
  (`id`, `title`, `description` optional, `dateTime` as an ISO string,
  `trainerId`) and `CreateTrainingRequest` (`title`, `description` optional,
  `dateTime`, `trainerId`), one-for-one with
  `backend/training/interface/training-presenter.ts`'s `TrainingView` and
  `create-training.ts`'s request shape.
- **`application/trainings.store.ts`** — `TrainingsStore`: identical shape
  to `QuestionsStore` — a `trainings` signal, `load()`, and `create()`
  (reloads the list after saving).
- **`infrastructure/http-training-gateway.ts`** — `HttpTrainingGateway`,
  `HttpClient` adapter, `withCredentials: true`, one-for-one with
  `trainings.controller.ts`'s routes.
- **`interface/training-form.ts`** — the researcher's scheduling form: a
  `p-inputtext` for `title` (required) and a `pTextarea` for the optional
  `description`, a PrimeNG `p-datepicker` (`[showTime]="true"`, 24-hour) for
  `dateTime`, and a `p-select` for `trainerId` populated from a required
  `trainerOptions` input rather than fetched by this component itself —
  disabled with a "No trainers registered yet" placeholder when that list is
  empty.
- **`interface/training-list.ts`** — read-only `p-table`: `title`,
  `dateTime` (formatted via `DatePipe`'s `medium` format) and the trainer's
  name, resolved by looking up `trainerId` against the same
  `trainerOptions` input rather than a second network call.

`training/` also carries the `Trainer` slice (mirrors
[`docs/domain-model.md`](domain-model.md)'s "Trainer — implemented slice"):

- **`application/ports.ts`** (Trainer additions) — `TrainerGateway`
  (abstract class): `create`, `list` — same two methods `QuestionGateway`
  has. Also defines `TrainerView` (`id`, `name`) and `CreateTrainerRequest`
  (`name`), one-for-one with `backend/training/interface/trainer-presenter.ts`'s
  `TrainerView` and `create-trainer.ts`'s request shape.
- **`application/trainers.store.ts`** — `TrainersStore`: identical shape to
  `QuestionsStore` — a `trainers` signal, `load()`, and `create()` (reloads
  the list after saving).
- **`infrastructure/http-trainer-gateway.ts`** — `HttpTrainerGateway`,
  `HttpClient` adapter, `withCredentials: true`, one-for-one with
  `trainers.controller.ts`'s routes.
- **`interface/trainer-form.ts`** — the researcher's authoring form: a
  single required `p-inputtext` for `name` and a submit button, with the
  same status-message handling `training-form.ts` uses, just for one field.
- **`interface/trainer-list.ts`** — read-only `p-table` of `name`, mirrors
  `question-list.ts`.

`frontend/src/app/shell/admin/trainings.page.ts` composes this slice
alongside `Training`'s own: it injects `TrainersStore` (dropping the
`AuthGateway` injection it previously used to filter `listUsers()` down to
`ROLES.TRAINER`), calls `store.load()` in `ngOnInit`, and derives
`trainerOptions` as `computed(() => this.trainersStore.trainers().map(t =>
({label: t.name, value: t.id})))`. `trainings.page.html` adds
`<app-trainer-form />` and `<app-trainer-list [trainers]="trainersStore.trainers()" />`
above the existing training form/list — same page, no new route, same
"shell composes, contexts don't" pattern the rest of this page already
follows.

`training/` also carries the `Enrollment & blackout window` slice
(mirrors [`docs/domain-model.md`](domain-model.md)'s "Enrollment & blackout
window — implemented slice"):

- **`application/ports.ts`** (Enrollment additions) — `EnrollmentGateway`
  (abstract class): `enroll(trainingId)`, `me()`. Also defines
  `BlackoutWindowView` (`dayOfWeek`, `startTime`, `endTime`) and
  `EnrollmentView` (`trainingIds`, `blackoutWindows`), one-for-one with
  `enrollment.controller.ts`'s `GET /enrollments/me` response.
- **`application/enrollment.store.ts`** — `EnrollmentStore`: `trainingIds`/
  `blackoutWindows` signals, `load()`, and `enroll()` (reloads after).
- **`infrastructure/http-enrollment-gateway.ts`** — `HttpEnrollmentGateway`,
  `HttpClient` adapter, `withCredentials: true`.
- **`shell/client/register.page.ts`** — the Participant's own enrollment
  page (not under `training/interface/` since it composes two contexts'
  worth of concerns — Trainings to browse and Enrollment to act on — the
  same "shell composes, contexts don't" split `admin-dashboard.page.ts`
  already established): lists open Trainings via `TrainingsStore`, tags
  rows already enrolled via `EnrollmentStore`, and enrolls on click.

`training/` also carries the `Survey` slice (mirrors
[`docs/domain-model.md`](domain-model.md)'s "Survey — implemented slice"):

- **`application/ports.ts`** (Survey additions) — `SurveyGateway` (abstract
  class): `create`, `list` — same two methods `TrainingGateway` has. Also
  defines `SurveyQuestionView` (`questionId`, `parameterValues`),
  `ResourceView` (`id`, `url`), `SurveyView` (`id`, `trainingId`, `sendDate`
  as an ISO string, `questions`, `resources`), and `CreateSurveyRequest`
  (`trainingId`, `sendDate`, `questionAssignments`, `resources`), one-for-one
  with `backend/training/interface/survey-presenter.ts`'s `SurveyView` and
  `create-survey.ts`'s request shape.
- **`application/surveys.store.ts`** — `SurveysStore`: identical shape to
  `TrainingsStore` — a `surveys` signal, `load()`, and `create()`.
- **`infrastructure/http-survey-gateway.ts`** — `HttpSurveyGateway`,
  `HttpClient` adapter, `withCredentials: true`.
- **`interface/survey-form.ts`** — the researcher's authoring form:
  `trainingOptions`/`questionOptions` inputs (composed one layer up by
  `shell/admin/surveys.page.ts`, same pattern `training-form.ts`'s
  `trainerOptions` uses), a `p-datepicker` for `sendDate`, a question picker
  that reveals a per-parameter text input for each of the selected
  Question's declared parameters before it's added to the assignment list,
  and an add/remove resource-URL list (mirrors `question-form.ts`'s
  add/remove scale-point/option editors).
- **`interface/survey-list.ts`** — read-only `p-table`: `sendDate`, the
  resolved training label (looked up in `trainingOptions`, same pattern
  `training-list.ts` uses for `trainerId`), question/resource counts, and a
  "View results" link per row to `/admin/surveys/:id/results`.

`training/` also carries the `Survey Response` slice (mirrors
[`docs/domain-model.md`](domain-model.md)'s "Survey Response — implemented
slice"):

- **`application/ports.ts`** (Survey Response additions) —
  `SurveyResponseGateway` (abstract class): `open(surveyId)`,
  `recordResourceAccess(surveyResponseId, resourceId)`,
  `submit(surveyResponseId, answers)`, `get(surveyResponseId)`,
  `listForSurvey(surveyId)`. Also defines `AnswerView` (`questionId`,
  `value: string | string[]`), `ResourceAccessView` (`resourceId`,
  `accessedTime`), and `SurveyResponseView`, one-for-one with
  `survey-response-presenter.ts`'s `SurveyResponseView`.
- **`application/survey-response.store.ts`** — `SurveyResponseStore`: a
  single `current: Signal<SurveyResponseView | null>` (the one response the
  Participant is actively filling out) rather than a list, since
  `survey-fill.ts` only ever cares about one response at a time; `open()`,
  `recordResourceAccess()`, and `submit()` each update `current` from the
  gateway's response.
- **`infrastructure/http-survey-response-gateway.ts`** —
  `HttpSurveyResponseGateway`, `HttpClient` adapter, `withCredentials: true`.
- **`interface/survey-fill.ts`** — the Participant's fill-out form: opens a
  response for `surveyId` on init, resolves each of the Survey's
  `SurveyQuestion`s against `QuestionsStore` to get the underlying
  `Question`, and — unlike `question-form.ts`'s client-side `<name>`-regex
  *preview* (there's no real `Question` instance to call the getter on at
  authoring time) — calls `domain/training`'s actual
  `Question.create(...).renderPrompt(parameterValues)` here, since a real
  `Question` and real bound `parameterValues` both exist by the time a
  Participant is answering. Renders a `FreeInput`/`Likert`/`Choice` input per
  question (reusing the same `AnswerFormat`-driven branching
  `question-form.ts` established for authoring, now for answering), resource
  links that call `recordResourceAccess()` on click, and a Submit button
  disabled once the response's `status` is already `Finished`.
- **`interface/survey-results.ts`** — the researcher's read-only view: a
  `p-table` of a survey's responses (participant `userId`, opened/finished
  time, status) with a per-row expand toggle revealing the raw `answers`
  array — intentionally no charting or aggregation.

## Routing

```
app.routes.ts:
  ''      -> loadChildren shell/client/client.routes.ts   (lazy)
  'admin' -> loadChildren shell/admin/admin.routes.ts      (lazy)

shell/client/client.routes.ts (CLIENT_ROUTES):
  'login'             -> ClientLoginPage                                    (no guard)
  ''                  -> ClientHomePage             [sessionGuard('/login')]
  'register'          -> RegisterPage               [sessionGuard('/login')]
  'survey/:surveyId'  -> SurveyPage                 [sessionGuard('/login')]
  'notification/:id'  -> NotificationDetailPage     [sessionGuard('/login')]

shell/admin/admin.routes.ts (ADMIN_ROUTES):
  'login' -> AdminLoginPage                                                 (no guard)
  ''      -> AdminShellPage  [sessionGuard('/admin/login'),
                               rolesGuard([Researcher, Trainer], '/admin/login')]
    children:
      ''          -> AdminDashboardPage
      'questions' -> QuestionsPage        [rolesGuard([Researcher], '/admin/login')]
      'trainings' -> TrainingsPage        [rolesGuard([Researcher], '/admin/login')]
      'surveys'   -> SurveysPage          [rolesGuard([Researcher], '/admin/login')]
      'surveys/:id/results' -> SurveyResultsPage  [rolesGuard([Researcher], '/admin/login')]
```

`sessionGuard`/the shared `rolesGuard([Researcher, Trainer])` sit once on the
`''` parent (`AdminShellPage`) rather than repeated on every child — Angular's
router runs a route's `canActivate` on every navigation that matches that
segment, including into its children, so the parent guard still protects each
child on its own. Researcher-only children layer their own narrower
`rolesGuard([Researcher])` on top.

`questions` is Researcher-only (unlike the shared `''` dashboard route) —
matches `domain-model.md`'s "Question — implemented slice" backend gating
(`@Roles('Researcher')` on `questions.controller.ts`), since Question
authoring isn't a Trainer capability.

`trainings` is likewise Researcher-only, matching `domain-model.md`'s
"Training — implemented slice" backend gating (`@Roles('Researcher')` on
`trainings.controller.ts`) — scheduling a Training isn't a Trainer
capability either, even though a Trainer may be the one referenced by a
given Training's `trainerId`. `trainings.controller.ts`'s `list`/`byId`
routes dropped their class-level `@Roles('Researcher')` alongside the
Enrollment slice, though — a Participant needs to browse Trainings from
`/register` to enroll in one, so only `create` stays Researcher-gated.

`surveys` and `surveys/:id/results` are likewise Researcher-only, matching
`domain-model.md`'s "Survey — implemented slice" backend gating
(`@Roles('Researcher')` on `surveys.controller.ts`'s `create` and
`survey-responses.controller.ts`'s `GET /surveys/:id/responses`).

`register` and `survey/:surveyId` carry no `rolesGuard` — every session
reaching the client area is already a Participant by construction (the
client login form only ever registers `ROLES.PARTICIPANT`, per
`client-login.page.ts`), so gating write *actions* server-side
(`@Roles('Participant')` on `enrollment.controller.ts`'s `POST /enrollments`
and `survey-responses.controller.ts`'s `open`/`resource-access`/`submit`) is
what actually matters, the same posture `trainings`/`surveys`' read routes
take on the admin side.

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
