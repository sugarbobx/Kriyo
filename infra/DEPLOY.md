# Déploiement VPS — Kriyo (Django + DRF / React + Vite)

Remplace l'ancien `VPS_LOG_COMMANDS.txt` (racine), obsolète : il ciblait le
service `kriyo` / Prisma / Supabase SDK de la stack Next.js abandonnée. La
stack actuelle est orchestrée par `infra/docker-compose.yml` (services
`backend` et `nginx`).

## 1. Variables d'environnement (`backend/.env`, non versionné)

Copier `backend/.env.example` et renseigner au minimum :

- `SECRET_KEY` — valeur aléatoire forte, différente de celle du dev local.
- `DEBUG=False`
- `ALLOWED_HOSTS` — domaine réel (ex: `kriyo.example.com`).
- `CSRF_TRUSTED_ORIGINS` — `https://kriyo.example.com`.
- `DATABASE_URL` — Postgres de production (Supabase utilisé uniquement comme
  hébergement Postgres, pas de SDK/auth Supabase côté backend).

Tant qu'aucun certificat TLS n'est en place devant nginx, laisser
`SECURE_SSL_REDIRECT` / `SESSION_COOKIE_SECURE` / `CSRF_COOKIE_SECURE` /
`SECURE_HSTS_SECONDS` absents (ils défaillent alors sur `not DEBUG`, donc déjà
`True` dès que `DEBUG=False` pour les trois premiers — seul HSTS reste à 0
par défaut, à activer explicitement une fois le TLS réellement en place).

## 2. Build & démarrage

```
docker compose -f infra/docker-compose.yml up -d --build
```

Le conteneur `backend` exécute automatiquement au démarrage (voir
`backend/Dockerfile`) : `manage.py migrate --noinput`, puis
`manage.py collectstatic --noinput`, puis lance Gunicorn. Rien à faire
manuellement pour les migrations/static.

## 3. Logs

```
docker compose -f infra/docker-compose.yml logs -f backend
docker compose -f infra/docker-compose.yml logs -f nginx
```

Vérifier dans les logs `backend` que `migrate` et `collectstatic` se sont
bien exécutés sans erreur au premier démarrage.

## 4. Vérification santé

```
curl -f http://<host>/api/health/
```

Doit renvoyer `{"status": "ok"}`.

## 5. Activer le TLS (une fois un domaine réel pointé sur le VPS)

1. Obtenir un certificat (certbot, ou un load balancer externe qui termine le TLS).
2. Monter le certificat dans le conteneur nginx (volume, ex. `/etc/letsencrypt`).
3. Dans `infra/nginx/nginx.conf`, décommenter le bloc `server { listen 443 ssl; ... }`
   et le bloc de redirection 80→443 (déjà présents en commentaire), en
   remplaçant `kriyo.example.com` par le vrai domaine.
4. Dans `backend/.env`, définir `SECURE_SSL_REDIRECT=True`,
   `SESSION_COOKIE_SECURE=True`, `CSRF_COOKIE_SECURE=True`,
   `SECURE_HSTS_SECONDS=31536000` (voir `backend/.env.example`).
5. Rebuild/redémarrer : `docker compose -f infra/docker-compose.yml up -d --build`.

`infra/docker-compose.yml` publie déjà les ports 80 et 443 sur l'hôte.

## 6. Base de données

Pas de conteneur Postgres dans `infra/docker-compose.yml` — `DATABASE_URL`
doit pointer vers une instance Postgres externe déjà provisionnée (Supabase
ou autre hébergeur). Aucune sauvegarde automatique n'est configurée ici :
gérer les backups côté hébergeur Postgres.

## 7. Restes de l'ancienne stack (Next.js/Prisma/Supabase)

Ces fichiers/dossiers à la racine ne sont plus utilisés par la stack actuelle
et ne sont PAS supprimés par ce changement (nettoyage à faire séparément si
souhaité) :

- `prisma/`, `supabase/`, `.next/`
- `docker/` (ancien `docker-compose.yml` + `Dockerfile` ciblant le service `kriyo`)
- `src/` (racine), `middleware.ts`, `next.config.mjs`
- `package.json` / `package-lock.json` (racine)
- `VPS_LOG_COMMANDS.txt` (supprimé par ce changement, remplacé par ce fichier)

Ne pas confondre `docker/docker-compose.yml` (mort) avec
`infra/docker-compose.yml` (stack actuelle) lors d'un déploiement.
