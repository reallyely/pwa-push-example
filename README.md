# PWA Push Demo

A live version of this app is available https://pwa-test.fly.dev/

Minimal demo: an installable PWA client where a Participant registers with an
email/password and subscribes to push notifications, an admin dashboard where a
Researcher/Trainer can send a push to a specific user, and one NestJS server (serving
a built Angular SPA) backing both. Registered users/subscriptions are persisted to
SQLite on disk (see [Persistence](#persistence) below), so they survive server
restarts and redeploys.

- Client app: `/` — register (email/password, Participant role), grant notification
  permission, install to home screen.
- Admin dashboard: `/admin` — register/log in as a Researcher or Trainer, pick a
  registered user, send them a push immediately or schedule one for a future
  date/time (see [Scheduled notifications](#scheduled-notifications)).


---

> [!info]
> Read the [domain model](docs/domain-model.md) to learn more about the pilot app's data model.

> [!info]
> Read the [notification delivery model](docs/notification-delivery-model.md) to learn more
> about the push-notification bounded context.

> [!info]
> Read [architecture.md](docs/architecture.md) for how new capability gets added to this app —
> the folder architecture and per-bounded-context doc template every new context follows.

> [!info]
> Read [frontend-architecture.md](docs/frontend-architecture.md) for the Angular SPA's own
> folder architecture and layering rules.

## Run locally

```bash
npm install
npm start
```

This builds and serves everything — backend and the Angular app — through the NestJS
server on port 3000. Open `http://localhost:3000` in a desktop browser to
register/subscribe (localhost counts as a secure context, so push works there without
HTTPS). Open `http://localhost:3000/admin` in another tab to send a push to that user.

For active frontend development, run two dev servers instead so Angular's build
watches and rebuilds on save:

```bash
npm start                       # terminal 1 — backend, :3000
npm start --workspace=frontend  # terminal 2 — Angular dev server, :4200
```

Open `http://localhost:4200` — `frontend/proxy.conf.json` transparently proxies
`/api/*` requests to the backend on :3000, so the browser only ever sees one origin
and no CORS configuration is needed (see
[frontend-architecture.md](docs/frontend-architecture.md#dev-workflow)).

To test **installing on a phone** and receiving pushes with the app closed, you need
a real HTTPS URL reachable from the phone — see Deploy below.

## Persistence

Registered users and their push subscriptions are stored in `users.json` inside a
data directory (`./data` locally, configurable via the `DATA_DIR` env var — Fly sets
this to `/data`, a mounted volume). The file is rewritten on every registration,
subscribe, resubscribe, and subscription-expiry event, and reloaded on startup, so
data survives process restarts and redeploys. It's a plain JSON file rather than a
database — fine for this demo's scale (a handful of users); a real deployment with
concurrent writers would want an actual database.

The local `./data` directory is gitignored — delete it any time to reset to a clean
slate.

## Scheduled notifications

The admin dashboard's "Schedule for later" checkbox lets you pick a future date/time
instead of sending immediately. Scheduled entries are stored in `scheduled.json`
(same `DATA_DIR` as the other data files) with a `pending` status until they're sent,
canceled, or fail.

The tricky part: `fly.toml` sets `auto_stop_machines = 'stop'` / `min_machines_running
= 0`, so Fly stops this app's machine when it's been idle, and only restarts it when a
new HTTP request comes in. A plain in-process `setTimeout` can't fire while the machine
is stopped — and Fly's own machine scheduling only supports recurring hourly/daily/
monthly buckets, not an arbitrary one-off timestamp a user picked in the UI. So instead:

- `GET /api/cron/tick` checks for any `pending` scheduled notification whose time has
  come and sends it (via the same code path as an immediate send). It's meant to be
  hit by an external scheduler roughly once a minute — any HTTP request wakes a
  stopped Fly machine, which is what actually lets a scheduled send fire on time.
- [`.github/workflows/cron.yml`](.github/workflows/cron.yml) is that external
  scheduler: a GitHub Actions workflow on a `* * * * *` cron that curls
  `/api/cron/tick` every minute. To enable it on your fork/repo:
  1. Repo → Settings → Secrets and variables → Actions → **Variables** tab → add
     `APP_URL` = your deployed app's base URL (e.g. `https://pwa-test.fly.dev`).
  2. Optionally set the `CRON_SECRET` **secret** (Secrets tab) to a random string and
     also set it as a Fly secret (`flyctl secrets set CRON_SECRET=...`) — the endpoint
     then rejects tick requests missing a matching `x-cron-secret` header. If unset,
     the endpoint is open, which is fine for this demo but worth locking down before
     using this pattern for anything sensitive.
  3. GitHub Actions cron is best-effort and can lag a few minutes under load, so
     scheduled sends fire on a roughly-1-minute precision, not to the second.
- On every boot the server also runs a catch-up sweep immediately, so anything that
  came due while the machine happened to be stopped (e.g. the cron ping itself is what
  wakes it) gets sent right away rather than waiting for the next tick.

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

Fly runs this as a persistent container (required here, since user data is stored on
local disk — serverless/edge platforms would reset it on every request and won't work
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
3. **Create the data volume** (one-time; `fly.toml` mounts it at `/data`, which is
   where registered users/subscriptions persist — see [Persistence](#persistence)).
   Use the same region as `primary_region` in `fly.toml`:
   ```bash
   flyctl volumes create pwa_data --region iad --size 1
   ```
4. **Set secrets** (never commit real VAPID keys — `.env` is gitignored and is only
   used for local dev):
   ```bash
   flyctl secrets set \
     VAPID_PUBLIC_KEY="$(grep VAPID_PUBLIC_KEY .env | cut -d= -f2)" \
     VAPID_PRIVATE_KEY="$(grep VAPID_PRIVATE_KEY .env | cut -d= -f2)" \
     VAPID_SUBJECT="mailto:you@example.com"
   ```
5. **Deploy**:
   ```bash
   flyctl deploy
   ```
6. Fly gives you a `https://<app-name>.fly.dev` URL — HTTPS by default, which is what
   makes it installable and push-capable on a phone.
7. `fly.toml` sets `internal_port = 8080` to match the Dockerfile. If Fly's free
   allowance auto-stops the machine after inactivity, the next request wakes it up —
   registered users are unaffected since they're read from the mounted volume, not
   memory.
8. To make scheduled notifications actually fire while the machine can be asleep, set
   up the GitHub Actions cron pinger — see
   [Scheduled notifications](#scheduled-notifications).

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
