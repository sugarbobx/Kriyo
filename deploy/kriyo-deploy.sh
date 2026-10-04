#!/usr/bin/env bash
# Kriyo — redeploy from GitHub main on the VPS (Django API + React SPA, no Docker).
#
# Usage:  ~/kriyo/deploy/kriyo-deploy.sh
#
# Assumes the one-time setup in deploy/README.md is done:
# backend/venv, backend/.env, the kriyo-backend systemd unit and the nginx site.
# Stops at the first error (set -e), so a failed build never gets published.
set -euo pipefail
APP=/home/ubuntu/kriyo

echo "==> Pull"
# --ff-only: refuse to deploy if the server copy has diverged from GitHub.
git -C "$APP" pull --ff-only origin main

echo "==> Backend"
cd "$APP/backend"
venv/bin/pip install -q -r requirements.txt
venv/bin/python manage.py migrate --noinput
venv/bin/python manage.py collectstatic --noinput -v 0
sudo systemctl restart kriyo-backend

echo "==> Frontend"
cd "$APP/frontend"
npm ci --no-audit --no-fund --loglevel=error
npm run build
# Publish where nginx can read it; --delete drops stale hashed assets.
rsync -a --delete dist/ /var/www/kriyo/

echo "==> Health"
sleep 2
curl -fsS http://127.0.0.1:8000/api/health/ && echo
curl -fsS -o /dev/null -w "frontend %{http_code}\n" http://127.0.0.1/
