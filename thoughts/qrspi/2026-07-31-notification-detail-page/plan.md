# Implementation Plan

## Overview

Clicking a push notification should navigate the user to a page showing that
specific notification's own data (title/body/icon/status/timestamps), instead
of always focusing/opening the root page — built bottom-up: read API first,
then a static detail page that consumes it by URL, then the push-payload/
service-worker wiring that drives a real notification click to that page.

## Phase 1: Single-notification read API

### Changes

#### 1. New use case

**File**: `src/notification-delivery/application/get-notification.ts`
**Action**: create

Mirrors `cancel-scheduled-notification.ts`'s shape exactly, but returns the
entity instead of mutating it:

```ts
import type { NotificationRepository } from './ports.ts';
import type { Notification } from '#notification-delivery/domain/notification.ts';
import { notificationDeliveryError } from './errors.ts';

interface Deps {
  notificationRepository: NotificationRepository;
}

interface GetNotificationRequest {
  notificationId: string;
}

export function makeGetNotification({ notificationRepository }: Deps) {
  return async function getNotification({ notificationId }: GetNotificationRequest): Promise<Notification> {
    const notification = await notificationRepository.findById(notificationId);
    if (!notification) {
      throw notificationDeliveryError('no such notification', 'NOT_FOUND');
    }
    return notification;
  };
}
```

#### 2. Use-case test

**File**: `src/notification-delivery/application/get-notification.test.ts`
**Action**: create

No existing application-layer test to copy conventions from (research.md Q7)
— follow the domain layer's `node:test`/`assert` style, with a minimal
in-memory fake repository local to this file (only `findById` is exercised,
so the other `NotificationRepository` members are stubbed to throw if
accidentally called):

```ts
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { makeGetNotification } from './get-notification.ts';
import { Notification } from '#notification-delivery/domain/notification.ts';
import type { NotificationRepository } from './ports.ts';

function fakeRepository(notification: Notification | null): NotificationRepository {
  return {
    async findById() { return notification; },
    async findAll() { throw new Error('not used in this test'); },
    async save() { throw new Error('not used in this test'); },
    async claimDueNotifications() { throw new Error('not used in this test'); },
  };
}

function scheduledNotification(overrides = {}) {
  return Notification.schedule({
    id: 'n1',
    recipientId: 'alice',
    title: 'Hello',
    description: 'World',
    scheduledDateTime: new Date(Date.now() + 60_000),
    ...overrides,
  });
}

describe('getNotification', () => {
  test('returns the notification when found', async () => {
    const notification = scheduledNotification();
    const getNotification = makeGetNotification({ notificationRepository: fakeRepository(notification) });

    const result = await getNotification({ notificationId: 'n1' });

    assert.equal(result, notification);
  });

  test('throws NOT_FOUND when no notification has that id', async () => {
    const getNotification = makeGetNotification({ notificationRepository: fakeRepository(null) });

    await assert.rejects(
      () => getNotification({ notificationId: 'missing' }),
      (err: any) => err.code === 'NOT_FOUND',
    );
  });
});
```

#### 3. Wire the route

**File**: `src/notification-delivery/interface/http-routes.ts`
**Action**: modify

- Add an import for `Notification` is already present (`:4`); no new type
  import needed beyond the config field below.
- In `HttpRoutesConfig` (`:9-27`), add after `listNotifications` (`:26`):
  ```ts
  getNotification: (request: { notificationId: string }) => Promise<Notification>;
  ```
- Add `getNotification` to the destructured params of `makeHttpRoutes`
  (`:29-41`), alongside `listNotifications`.
- Add a new route after the existing `GET /api/notifications` handler
  (after `:103`, before the `POST /api/schedule` handler at `:105`):
  ```ts
  router.get('/api/notifications/:id', async (req: any, res: any) => {
    try {
      const notification = await getNotification({ notificationId: req.params.id });
      res.json(toNotificationView(notification));
    } catch (err) {
      sendError(res, err as NotificationDeliveryError);
    }
  });
  ```
  (`sendError` already maps `NOT_FOUND` → 404 via `ERROR_STATUS_BY_CODE` in
  `http-errors.ts:4`, so no new error-mapping logic is needed.)

  Note: Express 5's router matches `/api/notifications/:id` and the existing
  `/api/notifications` (no trailing segment) as distinct routes — no
  ordering conflict with the list route at `:100`.

#### 4. Composition root

**File**: `server.ts`
**Action**: modify

- Add an import after `makeListNotifications` (`:18`):
  ```ts
  import { makeGetNotification } from "#notification-delivery/application/get-notification.ts";
  ```
- Instantiate after `listNotifications` (`:74`):
  ```ts
  const getNotification = makeGetNotification({ notificationRepository });
  ```
- Pass it into `makeHttpRoutes({...})` (`:82-96`), alongside
  `listNotifications`:
  ```ts
  getNotification,
  ```

### Verification

#### Automated
- [x] `npm test` passes, including new `get-notification.test.ts`

#### Manual
- [x] With the server running (`npm start`), `curl localhost:3000/api/notifications/<existing-id>` (grab an id from `curl localhost:3000/api/notifications`) returns `200` with the `NotificationView` shape (`id, username, title, body, icon?, sendAt, sentAt, status`)
- [x] `curl -i localhost:3000/api/notifications/bogus-id` returns `404` with body `{"error":"no such notification"}`

---

## Phase 2: Detail page (static, id-in-URL)

### Changes

#### 1. Detail page markup

**File**: `public/client/notification.html`
**Action**: create

Same shell as `index.html` (`<meta>`/manifest/stylesheet), with elements for
each `NotificationView` field plus a `#status` element for error surfacing,
matching `client/app.js`'s `setStatus` pattern:

```html
<!doctype html>
<html lang="en">
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Notification — PWA Push Demo</title>
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <meta name="theme-color" content="#4f46e5" />
        <link rel="stylesheet" href="/style.css" />
    </head>
    <body>
        <main>
            <h1 id="title">Notification</h1>
            <img id="icon" alt="" width="48" height="48" hidden />
            <p id="body"></p>
            <dl>
                <dt>Status</dt>
                <dd id="notification-status"></dd>
                <dt>Send at</dt>
                <dd id="send-at"></dd>
                <dt>Sent at</dt>
                <dd id="sent-at"></dd>
            </dl>

            <p id="status"></p>
        </main>
        <script src="/notification.js"></script>
    </body>
</html>
```

(`id="notification-status"` avoids colliding with the `#status` error/loading
element, which follows the existing `app.js` naming convention exactly.)

#### 2. Detail page script

**File**: `public/client/notification.js`
**Action**: create

Plain classic script, raw `fetch`, `createElement`/`textContent` rendering,
no build step — matching `app.js`'s conventions exactly (research.md Q6).
First script in the repo to read `URLSearchParams` (design.md Decision/
Pattern note — no existing precedent to match beyond this):

```js
const statusEl = document.getElementById('status');

function setStatus(message) {
  statusEl.textContent = message;
}

function render(notification) {
  document.getElementById('title').textContent = notification.title;
  document.getElementById('body').textContent = notification.body;

  const iconEl = document.getElementById('icon');
  if (notification.icon) {
    iconEl.src = notification.icon;
    iconEl.hidden = false;
  }

  document.getElementById('notification-status').textContent = notification.status;
  document.getElementById('send-at').textContent = notification.sendAt;
  document.getElementById('sent-at').textContent = notification.sentAt || '—';
}

async function load() {
  const id = new URLSearchParams(location.search).get('id');
  if (!id) {
    setStatus('No notification id given.');
    return;
  }

  setStatus('Loading...');
  const res = await fetch(`/api/notifications/${id}`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    setStatus(`Failed to load notification: ${data.error || res.statusText}`);
    return;
  }

  const notification = await res.json();
  render(notification);
  setStatus('');
}

load().catch((err) => {
  console.error(err);
  setStatus(`Something went wrong: ${err.message}`);
});
```

No form, no buttons, no service-worker registration — display only, per
design.md's "no other behavior for now."

### Verification

#### Automated
- [x] `npm test` still passes (no new automated coverage for this phase — research.md Q7: no precedent for testing `public/` scripts)

#### Manual
- [x] With the server running, visit `/notification.html?id=<id-from-phase-1>` and confirm title/body render, icon shows if present, and status/sendAt/sentAt render (verified `notification.html`/`notification.js` serve 200 and `/api/notifications/<id>` returns the expected shape; browser extension unavailable in this environment to visually confirm DOM rendering, but the render logic is a direct 1:1 field mapping reviewed against the JS source)
- [x] Visit `/notification.html?id=bogus-id` and confirm the `#status` element shows an error message (not a blank/broken page) (confirmed API returns `{"error":"no such notification"}` which `notification.js`'s error branch surfaces via `setStatus`)
- [x] Visit `/notification.html` (no `id` query param) and confirm the `#status` element shows "No notification id given." instead of attempting a fetch (confirmed by code inspection — `load()` returns early before `fetch` when `id` is falsy)

---

## Phase 3: Push payload + service worker wiring

### Changes

#### 1. Payload gains the notification id

**File**: `src/notification-delivery/application/deliver-notification.ts`
**Action**: modify

Change the payload build at `:34-38` — additive only, `title`/`body`/`icon`
unchanged, port/infrastructure untouched:

```ts
const payload = JSON.stringify({
  title: notification.title,
  body: notification.description,
  icon: notification.icon || undefined,
  data: { notificationId: notification.id },
});
```

#### 2. Service worker: thread `data` through `showNotification`

**File**: `public/client/sw.js`
**Action**: modify

In the `push` handler (`:14-23`), add `data` to `options` so it round-trips
into `event.notification.data`:

```js
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Notification';
  const options = {
    body: data.body || '',
    icon: data.icon || '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: data.data,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});
```

#### 3. Service worker: navigate-then-fallback on click

**File**: `public/client/sw.js`
**Action**: modify

Replace the unconditional-focus loop at `:25-35` (design.md Decision 2):

```js
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const notificationId = event.notification.data && event.notification.data.notificationId;
  const targetUrl = `/notification.html?id=${notificationId}`;

  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if ('navigate' in client && 'focus' in client) {
          return client.navigate(targetUrl).then(() => client.focus());
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })
  );
});
```

(`client.navigate()` is same-origin here, consistent with design.md's Open
Risks note — confirm during manual verification below that the focused
client is a controlled, in-scope client.)

### Verification

#### Automated
- [x] `npm test` continues to pass (no new automated coverage for this phase — design.md Open Risks: no test precedent for `sw.js` or `deliver-notification.ts`'s send path)

#### Manual
- [ ] With a client tab already open and registered/subscribed, schedule + let a notification deliver to that recipient (or use `POST /api/send`), click the OS notification, and confirm the existing tab navigates to `/notification.html?id=<id>` and is focused, showing the correct title/body/icon
- [ ] Repeat with no client tab open, and confirm a new window opens directly at `/notification.html?id=<id>` with the same content
- [ ] If push/OS-level notification testing is not available in the current environment, say so explicitly rather than asserting it works from code review alone (structure.md Testing Checkpoints)

---

## Testing Checkpoints (cross-phase)

- **After Phase 1**: `GET /api/notifications/:id` works via curl — 200 with correct `NotificationView` shape for a real id, 404 for a missing one. `npm test` green, including `get-notification.test.ts`.
- **After Phase 2**: `/notification.html?id=<id>` is browsable directly (typed URL, no push involved) and renders correctly for valid, invalid, and missing ids. Phase 1's endpoint is the only new dependency.
- **After Phase 3**: end-to-end — an actual push notification, when clicked, lands the user on the Phase 2 page pre-filled with the right notification's data, in both the "tab already open" and "no tab open" cases.
