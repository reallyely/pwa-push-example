# Structure Outline

## Approach

Build bottom-up from the most testable layer outward: a single-notification read path (API) first, then a static page that consumes it directly by URL (no push required to test), then the push-payload/service-worker wiring that drives the browser to that page from a real OS notification click. Each phase is independently useful and testable before the next depends on it.

## Phase 1: Single-notification read API

Add a `GET /api/notifications/:id` endpoint returning one notification's view, or 404. This is the new read path research.md confirmed doesn't exist (`findById` is only used internally today).

**Files**: `src/notification-delivery/application/get-notification.ts` (new), `src/notification-delivery/application/get-notification.test.ts` (new), `src/notification-delivery/interface/http-routes.ts`, `server.ts`

**Key changes**:
- `get-notification.ts`: `makeGetNotification({ notificationRepository }: Deps)` → returns `getNotification({ notificationId }: { notificationId: string }): Promise<Notification>`, mirroring `cancel-scheduled-notification.ts`'s `findById` + `notificationDeliveryError('no such notification', 'NOT_FOUND')` pattern.
- `http-routes.ts`: `HttpRoutesConfig` gains `getNotification: (request: { notificationId: string }) => Promise<Notification>;`. New route `router.get('/api/notifications/:id', ...)` — `try/catch`, `res.json(toNotificationView(await getNotification({ notificationId: req.params.id })))`, `sendError` on catch (NOT_FOUND → 404 is already wired in `http-errors.ts`).
- `server.ts`: `const getNotification = makeGetNotification({ notificationRepository });`, passed into `makeHttpRoutes({...})` alongside the existing use cases.

**Verify**: `npm test` passes (new `get-notification.test.ts` following the domain layer's `node:test`/`assert` conventions — covers found + not-found cases). Manual: `curl localhost:3000/api/notifications/<existing-id>` returns 200 with the `NotificationView` shape; `curl localhost:3000/api/notifications/bogus` returns 404 `{ error: 'no such notification' }`.

---

## Phase 2: Detail page (static, id-in-URL)

Add `notification.html` + `notification.js`, servable for free by the existing `express.static` mount. Reads `?id=` from the URL, fetches Phase 1's endpoint, renders title/body/icon/status/sendAt/sentAt. Testable by visiting the URL directly with a known id — no push flow needed yet.

**Files**: `public/client/notification.html` (new), `public/client/notification.js` (new)

**Key changes**:
- `notification.html`: same shell as `index.html` (`<meta>`, `<link rel="manifest">`, `<link rel="stylesheet" href="/style.css">`), a `<main>` with elements for title/body/icon/status/sendAt/sentAt and a `#status` element, `<script src="/notification.js">` at end of `<body>`.
- `notification.js`: `const id = new URLSearchParams(location.search).get('id')`; `fetch(`/api/notifications/${id}`)`; on `!res.ok` → `setStatus(...)` (same helper pattern as `app.js:14-16`); on success → render fields via `document.createElement`+`textContent` (no `innerHTML`), matching `app.js`/`admin/app.js` conventions. No form, no buttons, no service-worker registration.

**Verify**: No automated test (research.md Q7 — no precedent for testing `public/` scripts; not introducing one here). Manual: with the server running, visit `/notification.html?id=<id-from-phase-1>` and confirm title/body/icon render; visit with a missing/bogus id and confirm the status element shows an error instead of a blank/broken page.

---

## Phase 3: Push payload + service worker wiring

Thread the notification id through the push payload into `showNotification`'s `data`, and rewrite `notificationclick` to navigate to the Phase 2 page instead of unconditionally focusing/opening root. This is the slice that can't be exercised by an automated test — it requires a real push delivery and OS-level notification click (research.md Q7: no test precedent for `sw.js` or this application-layer send path).

**Files**: `src/notification-delivery/application/deliver-notification.ts`, `public/client/sw.js`

**Key changes**:
- `deliver-notification.ts:34-38`: payload gains `data: { notificationId: notification.id }` alongside existing `title`/`body`/`icon` (additive only — port/infrastructure untouched).
- `sw.js` `push` handler (`:14-23`): `options` gains `data: data.data` so `showNotification` round-trips it into `event.notification.data`.
- `sw.js` `notificationclick` (`:25-35`): replace the unconditional-focus loop —
  ```js
  const notificationId = event.notification.data && event.notification.data.notificationId;
  const targetUrl = `/notification.html?id=${notificationId}`;
  // clients.matchAll({type:'window'}) → if a client found: client.navigate(targetUrl) then client.focus()
  // else: clients.openWindow(targetUrl)
  ```

**Verify**: `npm test` continues to pass (no new automated coverage for this phase — flagged as an explicit gap, consistent with design.md's Open Risks). Manual, both required: (a) with a client tab already open, schedule+deliver a notification to a subscribed recipient, click the OS notification, confirm the existing tab navigates to `/notification.html?id=<id>` and is focused, showing correct title/body/icon; (b) with no client tab open, repeat and confirm a new window opens directly at that URL with the same content.

---

## Testing Checkpoints

- **After Phase 1**: `GET /api/notifications/:id` works via curl/Postman — 200 with correct `NotificationView` shape for a real id, 404 for a missing one. `npm test` green, including the new use-case test.
- **After Phase 2**: `/notification.html?id=<id>` is browsable directly (typed URL, no push involved) and renders correctly for both valid and invalid ids. Phase 1's endpoint is the only new dependency.
- **After Phase 3**: end-to-end — an actual push notification, when clicked, lands the user on the Phase 2 page pre-filled with the right notification's data, in both the "tab already open" and "no tab open" cases. This is the only phase requiring manual OS-level testing; if it's not verifiable in the current environment, say so explicitly rather than assuming it works from code review alone.
