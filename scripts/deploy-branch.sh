#!/usr/bin/env bash
# Deploys the current git branch to its own Fly.io app using fly.branch.toml
# (no persistent volume — see fly.branch.toml for why).
#
# App name is derived from the branch name: pwa-test-<branch>
set -euo pipefail

branch=$(git rev-parse --abbrev-ref HEAD)
app="pwa-test-$(echo "$branch" | tr '[:upper:]' '[:lower:]' | tr -c 'a-z0-9-' '-' | sed 's/-\+/-/g; s/^-//; s/-$//')"

if [ "$branch" = "main" ]; then
  echo "Refusing to branch-deploy main — use the normal 'flyctl deploy' with fly.toml instead." >&2
  exit 1
fi

echo "Branch: $branch"
echo "Fly app: $app"

if ! flyctl apps list | awk '{print $1}' | grep -qx "$app"; then
  echo "App $app does not exist yet, creating it..."
  flyctl apps create "$app"
fi

if [ -f .env ]; then
  echo "Pushing secrets from .env (excluding PORT — the Dockerfile bakes PORT=8080 for Fly)..."
  grep -Ev '^\s*(#|$)|^PORT=' .env | flyctl secrets import --app "$app"
else
  echo "No .env file found — skipping secrets import." >&2
  echo "App will fail to start without VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT set." >&2
fi

flyctl deploy --config fly.branch.toml --app "$app"

echo
echo "Deployed. URL: https://$app.fly.dev"
