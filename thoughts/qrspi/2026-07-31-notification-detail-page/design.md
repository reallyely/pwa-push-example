# Design Discussion

## Current State

- **Payload shape is decided solely by the application layer.** `deliverNotification()` builds `{ title, body, icon }` (`src/notification-delivery/application/deliver-notification.ts:34-38`) from the domain entity, dropping `id`, `recipientId`, `status`, timestamps. Domain (`domain/notification.ts`), the `PushGateway` port (`application/ports.ts:27-30`), and `WebPushGateway` (`infrastructure/web-push-gateway.ts:20-35`) are all shape-agnostic — they forward an opaque string.
- **`sw.js`'s `push` handler** (`public/client/sw.js:14-23`) reads exactly `data.title`/`data.body`/`data.icon` and calls `showNotification(title, options)` with `options = { body, icon, badge }` — **no `data` key**, so `event.notification.data` is always `null`.
- **`notificationclick`** (`sw.js:25-35`) never reads `event.notification.data`. It focuses the first open window client unconditionally (no URL comparison, no `navigate()` call) or falls back to `clients.openWindow('/')` — always root, never derived from the notification.
- **Static HTML serving is directory-index only.** `server.ts:79-80` mounts `express.static` for `public/client` (at `/`) and `public/admin` (at `/admin`); there is no `res.sendFile`/`res.render` anywhere. All `http-routes.ts` handlers are JSON-only.
- **No single-notification read path exists.** `list-notifications.ts` (`application/list-notifications.ts:13-29`) only returns filtered/sorted arrays of raw `Notification` entities. `findById` exists on `NotificationRepository` (`application/ports.ts:12`, impl `infrastructure/json-notification-repository.ts:76-79`) but today is only used internally for load-then-mutate flows (`deliver-notification.ts:22`, `cancel-scheduled-notification.ts:14`) — never exposed through a use case + presenter + route for reading.
- **Presenting happens in the interface layer.** `toNotificationView()` (`interface/notification-presenter.ts:29-40`) maps a `Notification` entity to the wire shape `{ id, username, title, body, icon?, sendAt, sentAt, status }`, called from `http-routes.ts` after list use cases run (`http-routes.ts:100-103`, `136-139`).
- **No id-in-URL precedent on the frontend.** Neither `public/client/app.js` nor `public/admin/app.js` reads `location`/`URLSearchParams`; both scripts are plain classic `<script>` tags with no build step, using `document.createElement`+`textContent` for rendering and a local `setStatus()` helper for error surfacing into a `#status` element.
- **Test coverage is domain-only** — three `node:test` files, all under `src/notification-delivery/domain/`. No precedent for testing application/interface layers, HTTP routes, or `public/` scripts.

## Desired End State

Clicking a notification opens (or focuses+navigates) a page that displays that specific notification's `title`/`body`/`icon` — no other behavior on that page.

Concretely:
1. The push payload additionally carries the notification's id.
2. `sw.js` threads that id through `showNotification`'s `data` option.
3. `notificationclick` builds a target URL from that id, and either navigates an existing focused window to it or opens a new window there.
4. A new `GET /api/notifications/:id` endpoint returns the single notification's view (404 if missing).
5. A new static page `public/client/notification.html` (+ its own script) reads `?id=` from the URL, fetches from that endpoint, and renders the fields.

**Verification**: schedule + deliver a notification to a subscribed recipient, click the OS notification, confirm the browser lands on `/notification.html?id=<id>` showing that notification's title/body/icon (both when the client tab is already open and when it isn't). `npm test` continues to pass; new use case gets a `node:test` file following the existing domain-test conventions (`assert` from `node:assert/strict`).

## Patterns to Follow

- **Payload shape stays additive, decided in the application layer.** Follow `deliver-notification.ts:34-38`'s existing convention of the application layer being the one place that shapes the wire payload — add a `data: { notificationId: notification.id }` key alongside the existing `title`/`body`/`icon`, don't touch the port or infrastructure layers (`application/ports.ts:27-30`, `infrastructure/web-push-gateway.ts:20-35` stay string-opaque, unchanged).
- **Single-record use case + NOT_FOUND convention**: mirror `cancel-scheduled-notification.ts:12-21` — `findById`, throw `notificationDeliveryError('no such notification', 'NOT_FOUND')` (`application/errors.ts`) if null, otherwise proceed. `sendError` (`interface/http-errors.ts:3-14`) already maps `NOT_FOUND` → HTTP 404, so the route handler needs no new error-mapping logic — just wrap in `try/catch` like every other route in `http-routes.ts`.
- **Reuse the existing presenter.** `toNotificationView` (`notification-presenter.ts:29-40`) already produces the exact per-notification shape the new page needs; don't write a second mapping function.
- **Composition root wiring**: add the new use case the same way every other one is wired in `server.ts` — import `make*` factory (`server.ts:10-18`), instantiate with injected repository (`server.ts:52-74`), pass the resulting function into `makeHttpRoutes({...})` (`server.ts:82-96`) and `HttpRoutesConfig` (`http-routes.ts:9-27`). Never pass repositories directly to the interface layer.
- **Frontend conventions**: new page's script follows `public/client/app.js`'s existing style — plain classic `<script>` at end of `<body>`, raw `fetch()` (no wrapper), `document.createElement`+`textContent` for rendering (not `innerHTML`), and the same `setStatus()`-into-`#status`-element pattern for errors. This will be the **first** script in the repo to read from the URL (`URLSearchParams`) — no existing pattern to match there, but nothing else in the surrounding conventions changes.
- **Bad pattern, don't extend it**: `sw.js`'s `push` handler currently adds a `badge` field that exists nowhere upstream (`sw.js:20`) — a small inconsistency already in the codebase. Don't add further speculative fields to `showNotification`'s `options` beyond what's needed (`data`); keep the payload additive and minimal.

## Design Decisions

1. **URL scheme — query string, not a new HTML route**: the detail page is `public/client/notification.html?id=<id>`, served for free by the existing `express.static("/", "public/client")` mount (`server.ts:79`). No new server-side HTML-serving route is introduced — every existing route stays JSON-only, and static mounts keep running before `makeHttpRoutes` (`server.ts:82`) with no reordering needed.
2. **`notificationclick` — navigate-then-fallback**: if `clients.matchAll({ type: 'window' })` finds a client, call `client.navigate(targetUrl)` then `client.focus()`; if none, `clients.openWindow(targetUrl)`. `targetUrl` is built from `event.notification.data.notificationId` as `` `/notification.html?id=${notificationId}` ``. This is a larger change to the handler than today's unconditional-focus loop, but it's required to satisfy "direct the user to a specific page" even when a tab is already open.
3. **Payload/data field — nested `data.notificationId`**: `deliverNotification` adds `data: { notificationId: notification.id }` to its JSON payload (additive, `title`/`body`/`icon` unchanged). `sw.js`'s `push` handler passes `data: data.data` into `showNotification`'s `options`, so the browser's own `Notification.data` field is the single source `notificationclick` reads from — no extra translation step.
4. **New read path — `get-notification.ts` use case + `GET /api/notifications/:id`**: mirrors `list-notifications.ts`'s shape (returns the raw `Notification` entity, not a DTO — presenting stays the interface layer's job). Throws `NOT_FOUND` via the same `notificationDeliveryError` convention as `cancel-scheduled-notification.ts`. Route added to `http-routes.ts` alongside the existing `/api/notifications` and `/api/scheduled` GETs, response `toNotificationView(notification)` (single object, not an array).
5. **New client page is data-only, no interactivity**: `notification.html` + `notification.js` render title/body/icon (and reuse `NotificationView`'s other fields — `status`, `sendAt`, `sentAt` — for completeness since the presenter already returns them) with no buttons, forms, or actions, matching the task's explicit "no other behavior for now."

## What We're NOT Doing

- No changes to the `Notification` domain entity, `PushGateway` port, or `WebPushGateway` infrastructure — payload shaping stays entirely in `deliver-notification.ts`.
- No new domain concept (e.g. a `NotificationId` value object) — `id` stays a plain string, consistent with today (research.md Q5).
- No admin-side changes — `public/admin/app.js` and its flows are untouched.
- No path-based routing (`/notification/:id`) or server-rendered HTML (`res.render`/templating engine) — query-string + static file only (Decision 1).
- No editing/canceling/resending actions on the new detail page — display only.
- No changes to how `clients.matchAll` selects *which* window to reuse when multiple are open — still "first client in the list," now navigated rather than just focused.
- No retrofitting a shared `public/shared/` fetch/DOM helper module — the new script follows the existing per-page-independent convention (`client/app.js`/`admin/app.js` duplicate their own `setStatus`), consistent with research.md Q6's finding that no shared module exists today.

## Open Risks

- **`client.navigate()` browser support / cross-origin restriction**: `navigate()` requires the target URL to be same-origin, which holds here, but it's worth confirming during implementation that the focused client is actually a controlled client (not, e.g., an out-of-scope tab) before calling it.
- **No existing test precedent for `http-routes.ts`, application-layer use cases, or `sw.js`** (research.md Q7) — the new `get-notification.ts` use case will follow the domain layer's `node:test`/`assert` conventions as the closest available model, but there's no existing HTTP-route or service-worker test to match for the parts of this change that touch those layers; those may end up under-tested relative to the domain layer.
- **`showNotification`'s `data` option shape**: need to confirm during implementation that Chrome/the PWA's service worker correctly round-trips a nested object (`{ notificationId }`) through `options.data` into `event.notification.data` — expected per spec, but worth a manual check given no existing usage in this codebase to copy.
