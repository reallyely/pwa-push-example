# Task

Update the notification delivery flow so that the push payload carries data
the PWA can use to direct the user to a specific page when they click the
notification (instead of always focusing/opening the root page). That target
page should, for now, simply display the notification's own data (title,
description, etc.) — no other behavior.

This touches the payload construction in the notification-delivery bounded
context (`application/deliver-notification.ts`), the service worker's
`notificationclick` handling (`public/client/sw.js`), and requires a new
client-facing page/route capable of rendering a single notification's data.
