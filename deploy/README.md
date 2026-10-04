# Kriyo — VPS deployment without Docker

The production setup on the VPS: the Django + DRF API (`backend/`) and the
React + Vite frontend (`frontend/`), run as **one app** behind the host nginx.
No Docker is involved.

```
browser ──► nginx :80 ──┬── /api/ /admin/ /static/ ──► gunicorn 127.0.0.1:8000 (systemd: kriyo-backend)
                        └── everything else ─────────► /var/www/kriyo (React build)
```

| File | Installed at |
|---|---|
| `deploy/systemd/kriyo-backend.service` | `/etc/systemd/system/kriyo-backend.service` |
| `deploy/nginx/kriyo.conf` | `/etc/nginx/sites-available/kriyo` (+ symlink in `sites-enabled`) |
| `deploy/kriyo-deploy.sh` | run in place for every update |

## Updating (every deploy)

```
~/kriyo/deploy/kriyo-deploy.sh
```

It pulls `main`, installs dependencies, runs migrations and `collectstatic`,
restarts gunicorn, rebuilds the frontend, publishes it to `/var/www/kriyo`, then
runs a health check.

## First-time setup

Prerequisites: Python ≥ 3.12 (Django 6.1), Node ≥ 20, nginx, `python3-venv`, `rsync`.

```bash
cd ~/kriyo/backend
python3 -m venv venv                    # "venv/" is already gitignored
venv/bin/pip install -r requirements.txt
cp .env.example .env && chmod 600 .env  # then edit, see below
venv/bin/python manage.py migrate
venv/bin/python manage.py collectstatic --noinput
venv/bin/python manage.py createsuperuser

sudo cp ~/kriyo/deploy/systemd/kriyo-backend.service /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable --now kriyo-backend

sudo mkdir -p /var/www/kriyo && sudo chown "$USER": /var/www/kriyo
cd ~/kriyo/frontend && npm ci && npm run build && rsync -a --delete dist/ /var/www/kriyo/

sudo cp ~/kriyo/deploy/nginx/kriyo.conf /etc/nginx/sites-available/kriyo
sudo ln -sfn /etc/nginx/sites-available/kriyo /etc/nginx/sites-enabled/kriyo
sudo nginx -t && sudo systemctl reload nginx

curl http://127.0.0.1:8000/api/health/   # -> {"status": "ok"}
```

### `backend/.env` while the site is on plain HTTP (no domain yet)

With `DEBUG=False` the secure-cookie / SSL-redirect settings default to **on**,
which breaks login over plain HTTP. Until HTTPS is live, set them off explicitly:

```ini
SECRET_KEY=<python -c 'import secrets; print(secrets.token_urlsafe(50))'>
DEBUG=False
ALLOWED_HOSTS=<server IP>,localhost,127.0.0.1
CSRF_TRUSTED_ORIGINS=http://<server IP>
SECURE_SSL_REDIRECT=False
SESSION_COOKIE_SECURE=False
CSRF_COOKIE_SECURE=False
SECURE_HSTS_SECONDS=0
# SQLite for now; switch to Postgres (e.g. Supabase) before real users:
DATABASE_URL=sqlite:////home/ubuntu/kriyo/backend/db.sqlite3
```

### Switching to HTTPS later

1. Point the domain at the VPS, set `server_name` in the nginx site, then
   `sudo certbot --nginx -d <domain>`.
2. In `backend/.env`: add the domain to `ALLOWED_HOSTS`, use `https://<domain>`
   in `CSRF_TRUSTED_ORIGINS`, set the three `SECURE_*`/`*_COOKIE_SECURE` flags to
   `True` and `SECURE_HSTS_SECONDS=31536000`.
3. `sudo systemctl restart kriyo-backend`.

### Switching to Postgres

Set `DATABASE_URL=postgresql://…` in `backend/.env`, then
`venv/bin/python manage.py migrate` and restart `kriyo-backend`.
Data in `db.sqlite3` is **not** migrated automatically (use `dumpdata`/`loaddata`).

## Known limitation

DRF throttling (login/signup rate limits) uses Django's default in-process
cache, so each gunicorn worker counts separately: with 2 workers the effective
limit is about 2× the configured rate. Configure a shared cache (e.g. Redis or
`django.core.cache.backends.db.DatabaseCache`) to make it exact.
