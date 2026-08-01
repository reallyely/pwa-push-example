# Research Findings

## Q1: Trace the full lifecycle of a notification payload from the `Notification` domain entity through `deliver-notification.ts`, the `PushGateway` (`web-push-gateway.ts`), and into the browser's `push` event in `sw.js` — what shape does the payload have at each boundary, and which layer is responsible for deciding what fields it contains?

### Findings

- **Domain entity** — `Notification` (`src/notification-delivery/domain/notification.ts:29-38`) carries: `id, recipientId, title, description, scheduledDateTime, icon, status, sentDateTime, failureReason`. Created only via `Notification.schedule()` (`notification.ts:65-87`); mutated via `markSent`, `markFailed`, `cancel` (`notification.ts:89-104`). The entity defines no wire/serialization shape itself.
- **Application layer decides the wire shape.** `deliverNotification()` (`src/notification-delivery/application/deliver-notification.ts:20-53`):
  - Loads notification by id (`:22`) and recipient by `recipientId` (`:27`).
  - If no recipient/subscription, marks `notification.markFailed('no-active-subscription')` and returns early (`:28-32`) — no push attempted.
  - Builds payload at `:34-38`:
    ```js
    const payload = JSON.stringify({
      title: notification.title,
      body: notification.description,   // renamed field
      icon: notification.icon || undefined,
    });
    ```
    This is the one place the field rename (`description` → `body`) and field subsetting happens. `id`, `recipientId`, `status`, `sentDateTime`, `failureReason`, `scheduledDateTime` are all dropped.
  - Calls `pushGateway.send(recipient.pushSubscription, payload)` (`:40`) with the recipient's `PushSubscriptionJSON` (`{ endpoint, keys: { p256dh, auth }, expirationTime? }`, `domain/recipient.ts:6-10`).
  - Maps `PushGatewayResult` back to `markSent`/`markFailed` and persists (`:42-51`).
- **Port** — `PushGateway.send(pushSubscription, payload: string): Promise<PushGatewayResult>` (`src/notification-delivery/application/ports.ts:27-30`) is typed as an opaque string; the interface itself has no knowledge of `title`/`body`/`icon`.
- **Infrastructure** — `WebPushGateway.send()` (`src/notification-delivery/infrastructure/web-push-gateway.ts:20-35`) forwards the string unchanged to `webpush.sendNotification(pushSubscription, payload, { urgency: 'high' })` (`:25`) — no payload transformation, only transport options and error-code mapping (404/410 → `subscription-expired`, else `send-failed`, `:29-33`).
- **Service worker** — `push` handler (`public/client/sw.js:14-23`) parses `event.data.json()` (`:15`) and reads exactly `data.title`, `data.body`, `data.icon` (matching the application-layer shape), applying its own defaults (`'Notification'`, `''`, `/icons/icon-192.png`). It also adds a `badge` field (`:20`) that exists nowhere upstream.
- **Conclusion**: the **application layer** (`deliver-notification.ts`) is the sole layer that decides push payload shape/fields. Domain, port, and infrastructure are shape-agnostic; the service worker is a fixed consumer of exactly `{title, body, icon}`.

## Q2: How does `sw.js` currently handle `notificationclick` — what does it do with `event.notification.data`, and how does it decide which window/URL to focus or open?

### Findings

- Listener at `public/client/sw.js:25-35`:
  ```js
  self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
      self.clients.matchAll({ type: 'window' }).then((clientList) => {
        for (const client of clientList) {
          if ('focus' in client) return client.focus();
        }
        if (self.clients.openWindow) return self.clients.openWindow('/');
      })
    );
  });
  ```
- `event.notification.data` is **never read** anywhere in this handler (`sw.js:25-35`).
- `clients.matchAll({ type: 'window' })` (`:28`) is called with no `url` filter. The loop (`:29-31`) focuses the **first** window-type client that has a `focus` method — no comparison against any target URL. `client.navigate()` is never called.
- Falls back to `self.clients.openWindow('/')` (`:32`) — always the root path, not derived from notification data — only if no client was focused.
- `event.notification.close()` (`:26`) runs synchronously before `event.waitUntil()` (`:27`) wraps the async chain.
- Upstream, the `push` handler (`sw.js:14-23`) builds `showNotification(title, options)` where `options = { body, icon, badge }` (`:17-21`) — **no `data` key is set**. This is consistent with `notificationclick` never reading `event.notification.data`: any notification shown by this handler has `event.notification.data === null` by default.

## Q3: How does `server.ts` / `interface/http-routes.ts` serve static assets and HTML pages today — is there an existing pattern for adding a new route that serves an additional HTML page, and how would that page fetch data for a specific record by id?

### Findings

- **Framework**: Express 5 (`package.json:18`). App runs directly via `node --experimental-strip-types server.ts` (`package.json:7`) — no build step, ESM (`"type": "module"`).
- **Static serving** — two `express.static` mounts in `server.ts`:
  - `server.ts:79`: `app.use("/", express.static(path.join(__dirname, "public/client")));`
  - `server.ts:80`: `app.use("/admin", express.static(path.join(__dirname, "public/admin")));`
  - No manual `res.sendFile`/`fs.readFile` handlers anywhere; `index.html` resolution for `/` and `/admin/` is Express's default directory-index behavior. These mounts run **before** `makeHttpRoutes` is mounted (`server.ts:82-96`).
- **API routes** — all defined in `src/notification-delivery/interface/http-routes.ts` via `express.Router()`, mounted at app root with `app.use(makeHttpRoutes({...}))` (`server.ts:82-96`). Full list (`http-routes.ts:45-155`): `GET /api/vapid-public-key`, `POST /api/register`, `POST /api/subscribe`, `POST /api/resubscribe`, `GET /api/users`, `POST /api/send`, `GET /api/notifications`, `POST /api/schedule`, `GET /api/scheduled`, `DELETE /api/scheduled/:id`, `GET /api/cron/tick`. All handlers respond with `res.json(...)` / `res.status(...).json(...)` / `.end()` — **none render or return HTML**, and there is no view engine configured (`http-routes.ts`, `server.ts`).
- **No existing pattern for serving an additional server-rendered HTML page.** All HTML delivery today is via static-file resolution only (`express.static`), not a route handler. There is no `res.sendFile`/`res.render` call anywhere in `server.ts` or `http-routes.ts`.
- **Only URL-parameter route**: `DELETE /api/scheduled/:id` (`http-routes.ts:141-148`) reads `req.params.id`, calls `cancelScheduledNotification({ notificationId: req.params.id })`, and responds `204` with no body on success, or delegates to `sendError` (`http-errors.ts:10-14`, mapping `NotificationDeliveryError.code` → HTTP status via `ERROR_STATUS_BY_CODE`) on failure. There is **no GET-by-id route** — `GET /api/notifications` and `GET /api/scheduled` both return full lists.
- **Wiring pattern**: `server.ts` instantiates infrastructure adapters (`:43-49`), constructs application use cases via `make*` factories injecting those adapters (`:52-74`), then calls `makeHttpRoutes({...})` (`:82-96`) passing only use-case functions (never repositories directly) plus `vapidPublicKey`/`cronSecret` — matching the `HttpRoutesConfig` type (`http-routes.ts:9-27`) where every route dependency is typed as an async use-case function.

## Q4: What are the current use-case boundary shapes for reading a single notification or listing notifications — what fields does `NotificationView` expose, and is there already a way to fetch one notification by id?

### Findings

- **`list-notifications.ts`** (`src/notification-delivery/application/list-notifications.ts`):
  - Request: `{ view: 'scheduled' | 'history' }` (internal, unexported interface, `:9-11`).
  - Response: `Promise<Notification[]>` — an array of **domain entities**, not a DTO (`:14`). Re-declared in `http-routes.ts:26` as the same shape.
  - Obtains data via `notificationRepository.findAll()` (`:15`), then filters/sorts in-memory: `view === 'scheduled'` → `status === SCHEDULED`, sorted ascending by `scheduledDateTime`; else (`'history'`) → `status !== SCHEDULED`, sorted descending by `sentDateTime || scheduledDateTime` (`:16-27`).
- **`NotificationView`** (`src/notification-delivery/interface/notification-presenter.ts:4-13`):
  ```ts
  interface NotificationView {
    id: string;
    username: string;
    title: string;
    body: string;
    icon?: string;
    sendAt: string;
    sentAt: string | null;
    status: string;
  }
  ```
  Produced by `toNotificationView(notification): NotificationView` (`:29-40`): `id`←`id`, `username`←`recipientId`, `title`←`title`, `body`←`description`, `icon`←`icon || undefined`, `sendAt`←`scheduledDateTime.toISOString()`, `sentAt`←`sentDateTime?.toISOString() ?? null`, `status`←`toWireStatus(notification)` (`:15-24`, mapping domain status → `'pending'|'sent'|'canceled'|'failed'|'expired'`, with `'expired'` derived from `failureReason === 'subscription-expired'`).
- **No single-notification-by-id use case or presenter call exists.** Grep across `src/notification-delivery/` for `get-notification|find-notification|show-notification` found nothing. `findById` exists only on the `NotificationRepository` port (`ports.ts:12`) and its implementation (`json-notification-repository.ts:76-79`), used internally by `cancel-scheduled-notification.ts:14` and `deliver-notification.ts:22` to load-then-mutate — never to return a view to an external caller. `toNotificationView` is only ever invoked via `.map(toNotificationView)` over an array, at `http-routes.ts:102` and `:138`. There is no `GET /api/notifications/:id` route.
- **Presenting happens in the interface layer**, not the application layer: `list-notifications.ts` returns raw entities and never imports the presenter; `http-routes.ts` imports `toNotificationView` (`:5`) and applies it after calling the injected `listNotifications` use case (`:100-103`, `:136-139`).

## Q5: What identifiers does a `Notification` entity carry, and how are they generated and persisted?

### Findings

- **`id: string`** — plain string field (not a wrapped value object). Declared in `NotificationProps` (`domain/notification.ts:5`), `ScheduleProps` (`:17`), class field (`:30`), assigned in constructor (`:51`).
- **Generation**: not done by the entity. `Notification.schedule()` requires `id` to be passed in (`:65`). The application use case `schedule-notification.ts` takes an injected `generateId: () => string` dependency (`:8`) and calls it at `:36`. The concrete implementation lives in the composition root:
  ```js
  // server.ts:38-40
  function generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }
  ```
  Timestamp + random base-36 fragment — not a UUID, not DB-assigned.
- **Persistence shape** (`src/notification-delivery/infrastructure/json-notification-repository.ts`): notifications are stored as a **flat array** `records: NotificationRecord[]` (`:54`), read/written whole via `store.readJsonFile`/`writeJsonFile` (`:62-64`, `:109-111`). Lookup and save both use linear scans (`findById` at `:76-79` uses `Array.find(r => r.id === id)`; `save` at `:85-95` uses `findIndex`). This differs from `JsonRecipientRepository`, which uses a `Map<string, RecipientRecord>` keyed by `username` (`json-recipient-repository.ts:17,20,42-44`).
- **`findById(id): Promise<Notification | null>`** exists and works today (`json-notification-repository.ts:76-79`), part of the `NotificationRepository` port (`ports.ts:12`).
- **Other externally-referenceable identifiers**:
  - `recipientId: string` on `Notification` (`domain/notification.ts:6,31`) — in practice the recipient's `username` (confirmed via `recipientRepository.findByUsername(recipientId)` in `deliver-notification.ts:27` and `schedule-notification.ts:31`, and HTTP layer mapping `username`→`recipientId` at `http-routes.ts:86,116`).
  - `Recipient.username: string` — primary key of the recipient store (`json-recipient-repository.ts:17,20,23-25,42`; `domain/recipient.ts:13,18,25`).
  - `PushSubscriptionJSON.endpoint: string` on `Recipient.pushSubscription` — used as a lookup key via `RecipientRepository.findByEndpoint` (`ports.ts:6`, impl `json-recipient-repository.ts:28-35`), and passed externally as `oldEndpoint` in `/api/resubscribe` (`http-routes.ts:70-71`).
  - No separate correlation id or `NotificationId` value object exists anywhere in the domain layer.

## Q6: What conventions do `public/client/app.js` and `public/admin/app.js` use for fetching JSON and rendering the DOM — is there a reusable pattern a new page would be expected to follow?

### Findings

- **No build step**: no bundler/TS-compiler config for `public/`; both `index.html` files load scripts as plain classic (non-module) `<script src="...">` tags (`public/client/index.html:37`, `public/admin/index.html:90`), placed at the end of `<body>`.
- **Fetch convention**: raw inline `fetch()` calls everywhere; **no shared wrapper function** in either file. Status-check (`res.ok`) handling is inconsistent — some calls check it (`client/app.js:52-59` register; `admin/app.js:49-56` cancel; `admin/app.js:119-129`, `:140-151` schedule/send submits), others don't (`client/app.js:33`, `:43-47`; `admin/app.js:28`, `:60`, `:90` — GET list fetches assume success).
- **Error surfacing**: not thrown-and-logged alone — always written into the DOM via a local `setStatus()` helper that sets `textContent` on a `#status` element (`client/app.js:14-16`; `admin/app.js:11-13`), invoked from `catch` blocks (`client/app.js:96-101`; `admin/app.js:117-134`, `:139-154`) with messages like `` `Something went wrong: ${err.message}` `` or `` `Failed: ${data.error}` ``.
- **Rendering**: `document.createElement` + `.textContent`/`.value` assignment, not `innerHTML` templating — except two static empty-state rows using `innerHTML` for a fixed string (`admin/app.js:31-33`, `:63-65`). Typical per-row pattern (`admin/app.js:36-45`, `:68-86`, `:93-104`): build a `<tr>`, iterate a `cells` array building `<td>` via `createElement`+`textContent`, append to a container previously cleared with `container.innerHTML = ''` (`:29`, `:61`, `:91`).
- **No shared module**: no `public/shared/` or `public/common/` directory exists; `client/app.js` and `admin/app.js` are fully independent, each redeclaring its own `setStatus`/status-element pattern.
- **Bootstrap**: no `DOMContentLoaded` listeners in either file — they rely on script placement at end of `<body>`. `client/app.js` attaches a form `submit` listener (`:92`) plus a top-level self-invoking async IIFE (`:109-122`) for silent resubscribe-on-load. `admin/app.js` calls three bootstrap functions at the bottom unconditionally: `loadUsers(); loadScheduled(); loadNotifications();` (`:159-161`).
- **URL parameters**: neither script reads query string or path segments (`grep` for `location.`/`URLSearchParams` returns no matches in `public/`). `client/app.js` gets its "record" identity (username) from a form input / `localStorage` (`:8,11,60,94,110`); `admin/app.js` fetches a full list and lets the user pick from a `<select>` (`:2`, `:90`). **There is no existing precedent in this codebase for a page reading an id from the URL to fetch a single record.**

## Q7: What test coverage and conventions exist for the notification-delivery context's application/infrastructure/interface layers, and any precedent for testing HTTP routes or static pages?

### Findings

- **Only three test files exist in the entire repo**, all in `src/notification-delivery/domain/`:
  - `notification.test.ts` — covers `Notification.schedule`, `markSent`, `markFailed`, `cancel`, `isDue`.
  - `recipient.test.ts` — covers construction, `subscribeToPush`, `clearSubscription`.
  - `notification-status.test.ts` — covers `ALL`/`isValid`.
- **Application layer** (`deliver-notification.ts`, `list-notifications.ts`, `schedule-notification.ts`, etc.): **no test files**.
- **Infrastructure layer** (`web-push-gateway.ts`, `json-notification-repository.ts`, `json-recipient-repository.ts`): **no test files**.
- **Interface layer** (`http-routes.ts`, `http-errors.ts`, `notification-presenter.ts`) and root `server.ts`: **no test files** — no precedent for testing HTTP routes in this repo.
- **`public/` (sw.js, app.js files)**: **no test files** — no precedent for testing service-worker or static-page behavior.
- **Test runner**: Node's built-in test runner, `node --experimental-strip-types --test` (`package.json:9`, run via `npm test`). Each existing test file imports `test`/`describe` from `node:test` and `assert` from `node:assert/strict`. No separate config file (no Jest/Vitest/Mocha config); TS runs directly via `--experimental-strip-types`, matching `imports` aliases in `package.json` (`#store`, `#notification-delivery/*`).

## Cross-Cutting Observations

- **Layering is consistent and enforced by convention, not tooling**: domain entities never define wire shapes; the application layer (`deliver-notification.ts`'s payload build, `list-notifications.ts`'s raw entity return) and interface layer (`notification-presenter.ts`'s `toNotificationView`) each own a distinct transformation step. Ports (`PushGateway`, `NotificationRepository`) are shape-agnostic.
- **List-only, no single-record read path exists anywhere in the notification-delivery context** — not in the repository-facing use case, not in the presenter's call sites, not in the HTTP routes. `findById` exists at the repository/port level but has never been exposed through a use case+presenter+route chain for read purposes (only for internal load-then-mutate flows).
- **No id-in-URL precedent on the frontend** (`public/client/app.js`, `public/admin/app.js` both avoid `location`/`URLSearchParams` entirely) and only one id-in-URL precedent on the backend (`DELETE /api/scheduled/:id`, which returns no body).
- **All existing HTTP routes are JSON-only**; there is no established pattern in this codebase for a route that returns HTML with server-injected data, or for adding a new static HTML page beyond what `express.static` already resolves.
- **Test coverage is domain-only.** Any new work touching application/infrastructure/interface layers or `public/` frontend/service-worker code would have no existing peer test file to model beyond the domain-layer `node:test`/`assert` convention.

## Open Areas

- Not investigated: how `public/client/index.html` / `public/admin/index.html` structure their `<head>`/manifest/service-worker registration beyond what was needed to confirm script loading (not in scope of the questions asked).
- Not investigated: concrete migration/versioning behavior of `migrate-legacy-notification-files.ts` (infrastructure layer) — noted to exist but not traced, as it wasn't part of any question.
