# PWA Push Demo

A live version of this app is available https://pwa-test.fly.dev/

Minimal demo: an installable PWA client that registers a username and subscribes to
push notifications, an admin dashboard that can send a push to a specific user, and
one Express server backing both. Storage is in-memory only — restarting the server
clears registered users/subscriptions, which is fine for this throwaway demo.

- Client app: `/` — register a username, grant notification permission, install to
  home screen.
- Admin dashboard: `/admin` — pick a registered user, send them a push.


---

> [!info]
> Read the [domain model](domain-model.md) to learn more about the pilot app's data model.

## Run locally

```bash
npm install
npm start
```

Open `http://localhost:3000` in a desktop browser to register/subscribe (localhost
counts as a secure context, so push works there without HTTPS). Open
`http://localhost:3000/admin` in another tab to send a push to that user.

To test **installing on a phone** and receiving pushes with the app closed, you need
a real HTTPS URL reachable from the phone — see Deploy below.

## VAPID keys

Push requires a VAPID keypair (identifies this server to the browser's push service).
One is already generated and committed to `.env` for local dev convenience. To
regenerate:

```bash
npx web-push generate-vapid-keys
```

Put the output into `.env` (see `.env.example` for the shape):

```
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:you@example.com
```

## Deploy (Fly.io)

Fly runs this as a persistent container (required here, since user data lives in
memory — serverless/edge platforms would reset it on every request and won't work
for this demo). `flyctl` is already installed at `~/.fly/bin/flyctl` (add it to your
PATH: `export PATH="$HOME/.fly/bin:$PATH"`).

1. **Log in** (interactive browser OAuth — run this yourself):
   ```bash
   flyctl auth login
   ```
2. **Launch the app** (reads the `Dockerfile`, asks for an app name + region, creates
   the app on your account, and generates `fly.toml`). Say no to a Postgres/Redis
   database when asked — this demo doesn't need one:
   ```bash
   flyctl launch --no-deploy
   ```
3. **Set secrets** (never commit real VAPID keys — `.env` is gitignored and is only
   used for local dev):
   ```bash
   flyctl secrets set \
     VAPID_PUBLIC_KEY="$(grep VAPID_PUBLIC_KEY .env | cut -d= -f2)" \
     VAPID_PRIVATE_KEY="$(grep VAPID_PRIVATE_KEY .env | cut -d= -f2)" \
     VAPID_SUBJECT="mailto:you@example.com"
   ```
4. **Deploy**:
   ```bash
   flyctl deploy
   ```
5. Fly gives you a `https://<app-name>.fly.dev` URL — HTTPS by default, which is what
   makes it installable and push-capable on a phone.
6. `fly.toml` (generated in step 2) sets `internal_port = 8080` to match the
   Dockerfile. If Fly's free allowance auto-stops the machine after inactivity, the
   next request wakes it up but wipes in-memory users — you'll need to re-register
   on the client after a cold start.

## Phone test checklist

Android/Chrome:

1. Open the deployed URL on the phone.
2. Register a username → grant notification permission when prompted.
3. Browser menu → "Add to Home Screen" / "Install app".
4. Open `/admin` from a desktop browser, select the phone's username, send a push.
5. Confirm the notification appears even with the installed app fully closed (proves
   the service worker's `push` event handler is what's firing it, not the foreground
   page).

iPhone/iPad (Safari, iOS 16.4+):

Apple only allows the notification permission prompt — and push in general — for web
apps running standalone from the Home Screen; a regular Safari tab silently ignores
`Notification.requestPermission()`. So the order is reversed from Android:

1. Open the deployed URL in Safari and register a username (the page detects it isn't
   installed yet and tells you to install first, without prompting for permission).
2. Share → "Add to Home Screen".
3. Open the app from the Home Screen icon, enter the same username, submit again — this
   time permission is requested and push is subscribed.
4. Send a push from `/admin` and confirm it arrives with the app closed.

Known iOS quirks worth knowing about if push stops arriving after it initially worked:
iOS doesn't fire `pushsubscriptionchange` the way other browsers do, and subscriptions
have been reported to silently expire outside of any user action (no official Apple
documentation on timing). The client re-verifies and re-subscribes automatically every
time the installed app is opened as a workaround — reopening the app is the fix if a
subscription goes stale.
