# Kriyo — Journal de developpement

Journal des modifications et remarques du proprietaire du projet, consigne au
fil de l'eau. Ce fichier est versionne (git) et partage entre la machine
locale et le VPS de production — c'est le pont entre les deux sessions
Claude qui travaillent sur ce repo.

## Protocole — a lire avant toute action

### 1. Determiner l'environnement d'execution

Avant d'executer une tache marquee `[SERVER]`, verifier sur QUELLE machine
cette session tourne :

- **LOCAL** (poste de dev Windows) si le repertoire de travail ressemble a
  `C:\xampp\htdocs\Kriyo\Kriyo` (ou `/c/xampp/htdocs/Kriyo/Kriyo` sous
  Git Bash) — OS Windows.
- **SERVER** (VPS production) si TOUTES ces conditions sont vraies :
  - OS Linux
  - repertoire de travail sous `/home/ubuntu/kriyo`
  - le fichier `/etc/systemd/system/kriyo-backend.service` existe
  (commande de verif rapide : `test -f /etc/systemd/system/kriyo-backend.service && echo SERVER || echo LOCAL`)

Si l'environnement ne peut pas etre determine avec certitude, NE PAS executer
les taches `[SERVER]` — demander confirmation a l'utilisateur.

### 2. Portee des taches

Chaque entree ci-dessous porte un tag :

- `[LOCAL]` — a faire uniquement sur le poste de dev (code, config repo, etc.)
- `[SERVER]` — a faire uniquement sur le VPS (deploiement, systemctl, nginx,
  migrations en prod, variables d'env `.env` du serveur, certificats, etc.)
- `[BOTH]` — a faire des deux cotes (rare — generalement juste "pull" suffit
  cote serveur puisque le code vient du repo)

Et un statut : `TODO` / `EN_COURS` / `BLOQUE` / `DONE`.

### 3. Synchronisation — regle absolue

- Toute entree ajoutee en session LOCAL doit etre **committee et pushee**
  immediatement pour etre visible cote SERVER (`git pull`).
- Toute tache `[SERVER]` executee doit etre **marquee DONE avec un resume du
  resultat reel obtenu**, puis **committee et pushee** depuis le VPS, pour
  que la session LOCAL la voie au prochain pull.
- Ne jamais executer une tache deja `DONE`. Si le resultat semble incorrect,
  ouvrir une nouvelle entree plutot que de rouvrir l'ancienne.

### 4. Reference architecture

Le schema d'architecture de reference (fonctionnel + technique + UX + UI,
avec tous les liens inter-couches) est `Kriyo_Global.txt`, tenu a jour sur
le poste local dans `Documents/Jayman/IT/Projects/Kriyo App/`. Il n'est pas
dans ce repo — s'y referer pour toute decision de design/flow avant de
proposer une implementation qui en devierait.

---

## Journal

<!--
Format d'une entree :

### [SCOPE] AAAA-MM-JJ — Titre court
Statut: TODO | EN_COURS | BLOQUE | DONE

Demande / remarque :
(ce que l'utilisateur a dit, reformule clairement)

Resultat attendu :
(critere de succes explicite et verifiable — ce que l'agent qui execute doit
obtenir, pas juste "faire le changement")

Notes d'execution : (rempli par l'agent qui traite la tache, au moment ou il
passe le statut a DONE — ce qui a ete fait reellement, ecarts eventuels)
-->

### [LOCAL] 2026-10-04 — Batch de 8 corrections UI/UX + logique (gate, comptes, tracking, PWA)
Statut: DONE

Demande / remarque :
Retour utilisateur sur capture d'ecran apres test de l'app :
1. Changement de langue pas effectif sur certains libelles (titre Security Gate, PSYCH, TECH).
2. PSYCH -> "Etat Psychologique", TECH -> "Analyse Technique".
3. Repondre "Oui" a toutes les questions donne toujours 100% -- questions mal
   formulees (aucune n'est inversee), donc un utilisateur qui repond "Oui"
   partout sans reflechir max le score a chaque fois.
4. Un critere deja complete reste cliquable et rouvre le quiz (devrait ouvrir
   un rapport des questions/reponses a la place).
5. A l'ajout d'un compte, l'utilisateur doit pouvoir renseigner le capital
   initial ET la balance actuelle.
6. Un compte nouvellement ajoute ne doit pas etre selectionne automatiquement
   pour le suivi.
7. VR / EP / VP a ecrire en toutes lettres (VR = Valeur Reelle, EP =
   Experience Percue, VP = Valeur Percue), et chaque section doit s'afficher
   l'une apres l'autre (pas en liste simultanee).
8. Le calcul du PnL journalier n'est pas correct -- "Resultat journalise"
   devrait afficher le cumul des trades clotures du jour, pas juste le
   dernier trade clos.
9. L'application ne fonctionne plus en PWA -- a reinstaller.

Resultat attendu :
1-2. `dict.gate.title` = "Sas de Securite" en FR (reste "Security Gate" en
   EN) ; `dict.gate.psych`/`tech` = "Etat Psychologique"/"Analyse Technique"
   en FR, "Psychological State"/"Technical Analysis" en EN. Visible immediatement
   cote FR sans besoin de rebuild backend (fichier frontend uniquement).
3. Une question par critere (5 au total) est reverse-phrasee en base
   (`Question.positive_answer=False`), le scoring compare la reponse brute a
   `positive_answer` au lieu de supposer "Oui"=bon partout. Repondre "Oui" a
   tout donne desormais 5/6 sur chacun des 5 criteres (jamais 100% en mode
   "yes-sayer"). Necessite les migrations `gate.0003`/`gate.0004` appliquees.
4. Cliquer un critere deja repondu ouvre un nouvel ecran "Recapitulatif"
   (GET `/api/gate/criteria/:key/review/`) listant les 6 questions et la
   reponse enregistree (Oui/Non), au lieu de relancer le quiz. Necessite
   `gate.0003` (positive_answer n'est pas affiche mais la route depend du
   meme etat de migration).
5. `TradingAccount.current_balance` (nouveau champ, distinct de `capital`)
   saisi a la creation du compte, affiche dans la liste des comptes
   ("capital -> balance actuelle"). Necessite la migration `performance.0003`
   (backfill: comptes existants -> current_balance = capital).
6. Performance.tsx n'auto-selectionne plus les comptes au chargement
   (`selectedIds` demarre vide) -- l'utilisateur choisit explicitement quels
   comptes suivre.
7. Groupes VR/EP/VP affiches un a la fois avec navigation
   "Section precedente"/"Section suivante", libelles complets affiches au
   lieu du sigle brut.
8. Nouvelle carte "PnL du jour" sur l'ecran Tracking, calculee comme la somme
   des `pnl` de tous les trades clotures aujourd'hui (comparaison sur la date
   locale du navigateur) -- toujours visible des qu'au moins un trade a ete
   cloture aujourd'hui, independamment de la derniere action de cloture.
9. `vite-plugin-pwa` installe et configure (manifest + service worker
   auto-genere, `/api/` et `/admin/` explicitement exclus du cache -- jamais
   servis depuis le cache). Icones generees dans `frontend/public/icons/`
   (source SVG + script `frontend/scripts/generate-pwa-icons.mjs`, a
   relancer si le branding change). Verifie par `npm run build` (genere
   `dist/sw.js` + `dist/manifest.webmanifest`) -- l'installation PWA reelle
   (prompt navigateur, mode standalone) reste a verifier manuellement en
   prod une fois servi en HTTPS (les PWA n'installent pas sur HTTP sauf
   localhost).

Notes d'execution :
Backend : migrations `gate.0003_question_positive_answer`,
`gate.0004_reverse_phrase_one_question_per_criterion`,
`performance.0003_tradingaccount_current_balance` appliquees et testees en
local (59/59 tests backend passent, y compris nouveaux tests de polarite
et de revue de critere). Frontend : `npm run build` passe sans erreur
TypeScript, PWA generee. Tout est committe sur `main` -- cote serveur il
reste uniquement a deployer (voir entree ci-dessous).

---

### [SERVER] 2026-10-04 — Deployer le batch de 8 corrections (migrations + rebuild frontend)
Statut: DONE

Demande / remarque :
Le commit du batch ci-dessus (prefixe "fix: 8 corrections UI/UX...") contient
3 nouvelles migrations Django (2 sur `gate`, 1 sur `performance`) et des
changements frontend (nouveau build PWA, nouveaux champs de formulaire). Rien
de tout cela n'est visible en production tant que le VPS n'a pas pull + migre
+ rebuild.

Resultat attendu :
Executer `~/kriyo/deploy/kriyo-deploy.sh` (gere deja : git pull --ff-only,
pip install, `manage.py migrate --noinput`, `collectstatic`, restart
`kriyo-backend`, `npm ci && npm run build`, rsync vers `/var/www/kriyo`,
health check). A la fin :
- `curl -fsS http://127.0.0.1:8000/api/health/` renvoie `{"status":"ok"}`
- `curl -o /dev/null -w "%{http_code}" http://127.0.0.1/` renvoie `200`
- Les 3 migrations (`gate.0003`, `gate.0004`, `performance.0003`) apparaissent
  dans `python manage.py showmigrations gate performance` comme appliquees
  (`[X]`)
- `/var/www/kriyo/manifest.webmanifest` et `/var/www/kriyo/sw.js` existent
  (confirme que le build PWA a bien ete publie)

Notes d'execution :
Execute le 2026-10-04 sur le VPS (verif environnement : `SERVER`), commit
deploye `df7bb2b`. Sauvegarde prealable de la base :
`~/kriyo-backups/db.sqlite3.2026-10-04_1131-before-df7bb2b`.
`~/kriyo/deploy/kriyo-deploy.sh` termine sans erreur. Resultat des 4
verifications :
- Health API : `{"status":"ok"}` -- OK
- Frontend `http://127.0.0.1/` : `200` -- OK
- `showmigrations gate performance` : `[X] gate.0003_question_positive_answer`,
  `[X] gate.0004_reverse_phrase_one_question_per_criterion`,
  `[X] performance.0003_tradingaccount_current_balance` -- OK
- `/var/www/kriyo/manifest.webmanifest` (526 o) et `/var/www/kriyo/sw.js`
  (1483 o) presents, servis en 200 depuis l'IP publique -- OK

Verifications supplementaires : 59/59 tests backend passent sur le VPS ;
5 questions sur 30 en base ont `positive_answer=False` (1 par critere, comme
attendu).

Ecart corrige au passage : nginx servait `manifest.webmanifest` en
`application/octet-stream` (type absent de `mime.types`). Ajout d'un bloc
`location = /manifest.webmanifest` avec `application/manifest+json` dans
`deploy/nginx/kriyo.conf`, installe et recharge sur le VPS.

Remarque pour LOCAL (non bloquant) : dans `frontend/vite.config.ts`, la regle
workbox `runtimeCaching` `urlPattern: /^\/api\//` ne matche jamais (workbox
teste une RegExp contre l'URL complete `http://.../api/...`, pas le chemin).
Sans effet aujourd'hui (rien d'autre ne met `/api/` en cache, et
`navigateFallbackDenylist` est correct), mais a remplacer par
`({ url }) => url.pathname.startsWith('/api/')` pour que la regle fasse ce
qu'elle annonce. **Corrige le 2026-10-04 cote LOCAL, voir entree ci-dessous.**

---

**Mise a jour 2026-10-04 (meme jour, apres coup)** : une 4eme migration
(`accounts.0002_seed_admin_user`) et un dashboard admin ont ete ajoutes
depuis (voir entree ci-dessous) -- `kriyo-deploy.sh` les couvre
automatiquement, pas de commande supplementaire. Ajouter aux verifications :
`python manage.py showmigrations accounts` doit montrer `accounts.0002` `[X]`.

---

### [LOCAL] 2026-10-04 — Dashboard de metriques dans /admin + compte admin
Statut: DONE

Demande / remarque :
Interface admin accessible via http://3.217.155.20/admin, avec login
jznguetsa@afriksys.com / (mot de passe fourni par l'utilisateur, en clair, a
sa demande explicite apres avoir ete prevenu du risque). Doit montrer :
nombre d'utilisateurs inscrits, nombre d'utilisateurs connectes, et autres
metriques pertinentes.

Resultat attendu :
- Compte superuser cree via migration de donnees
  `accounts/migrations/0002_seed_admin_user.py` (idempotente --
  `update_or_create` sur l'email, hash via `make_password`, pas de
  `set_password()` qui ne fonctionne pas sur les modeles historiques des
  migrations). **ATTENTION SECURITE** : le mot de passe est en clair dans ce
  fichier de migration, committe sur GitHub -- accepte sciemment par
  l'utilisateur. Si ce choix est reconsidere plus tard : changer le mot de
  passe via `manage.py changepassword jznguetsa@afriksys.com` sur le VPS
  (hors git) et purger/reecrire l'historique git si le repo est public.
- Page `/admin/` (Django admin existant, inchange sinon) affiche en haut un
  panneau de stats avant la liste des apps : utilisateurs inscrits (total +
  nouveaux aujourd'hui/7j/30j), connectes actuellement (sessions Django non
  expirees, requete reelle sur `django_session`, pas une approximation),
  actifs aujourd'hui (Security Gate lance), taux de passage et score moyen
  du Security Gate, comptes de trading (total + repartition par profil de
  risque), trades (total + repartition par statut), PnL cumule plateforme,
  engagement accepte aujourd'hui.
- Implementation : `backend/core/admin.py` (fonction `_compute_dashboard_stats`
  + monkeypatch de `admin.site.index`), `backend/templates/admin/index.html`
  (override du template admin par defaut, necessite `TEMPLATES[0]['DIRS']`
  pointant vers `backend/templates/` dans `config/settings.py` -- sinon le
  template de `django.contrib.admin` gagne car il est liste avant `core`
  dans `INSTALLED_APPS`).

Notes d'execution :
Teste en local : login via `/admin/login/` avec les identifiants fournis ->
302 (succes), `/admin/` -> 200, dashboard affiche "Utilisateurs inscrits
(total) 6" (comptes de test locaux), aucune trace d'erreur serveur. Suite de
tests complete (59/59) toujours verte apres l'ajout. Migration
`accounts.0002_seed_admin_user` incluse dans le batch de deploiement
ci-dessus (meme commit/push), pas d'entree serveur separee necessaire.
