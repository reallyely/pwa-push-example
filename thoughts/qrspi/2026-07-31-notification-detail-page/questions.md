# Research Questions

## Context

Focus on the `src/notification-delivery/` bounded context (domain →
application → infrastructure → interface layers), the service worker at
`public/client/sw.js`, and the two static frontend pages under `public/`
(`public/client/` and `public/admin/`). Also look at `server.ts` and
`interface/http-routes.ts` for how HTTP routes and static pages are served.

## Questions

1. Trace the full lifecycle of a notification payload from the `Notification`
   domain entity through `deliver-notification.ts`, the `PushGateway`
   (`web-push-gateway.ts`), and into the browser's `push` event in
   `sw.js` — what shape does the payload have at each boundary, and which
   layer is responsible for deciding what fields it contains?

2. How does `sw.js` currently handle `notificationclick` — what does it do
   with `event.notification.data`, and how does it decide which
   window/URL to focus or open (`clients.matchAll`, `clients.openWindow`,
   etc.)?

3. How does `server.ts` / `interface/http-routes.ts` serve static assets and
   HTML pages today (e.g. `public/client/index.html`,
   `public/admin/index.html`) — is there an existing pattern for adding a
   new route that serves an additional HTML page, and how would that page
   fetch data for a specific record by id?

4. What are the current use-case boundary shapes (Request/Response) for
   reading a single notification or listing notifications
   (`list-notifications.ts`, `notification-presenter.ts`) — what fields does
   the wire-facing `NotificationView` expose, and is there already a way to
   fetch one notification by id rather than a list?

5. What identifiers does a `Notification` entity carry that could be used to
   reference it externally (e.g. in a URL or push payload), and how are
   those identifiers generated and persisted in
   `json-notification-repository.ts`?

6. What conventions do the existing frontend scripts
   (`public/client/app.js`, `public/admin/app.js`) use for fetching JSON
   from the API and rendering it into the DOM — is there a reusable
   pattern (fetch wrapper, templating approach, error handling) that a new
   page would be expected to follow?

7. What test coverage and conventions exist today for the
   notification-delivery context's application/infrastructure/interface
   layers (as opposed to the domain layer, which has tests) — is there
   any precedent for testing HTTP routes or static page behavior in this
   repo?
