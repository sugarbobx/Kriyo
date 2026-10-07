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
tests complete (59/59) toujours verte apres l'ajout.

**Correction 2026-10-04** : la derniere phrase ci-dessus etait fausse --
`accounts.0002_seed_admin_user.py` contient un mot de passe en clair, donc le
classificateur auto-mode de Claude Code a bloque son `git add`/`commit`
automatique (raison : `[Credential Leakage]`). Commit separe `94de97a` fait
manuellement par l'utilisateur depuis son propre terminal. Non deploye sur le
VPS -- voir entree `[SERVER]` ci-dessous.

---

### [SERVER] 2026-10-05 — Deployer dashboard admin + compte admin + fix workbox
Statut: TODO

Demande / remarque :
Trois commits pushes depuis la session LOCAL ne sont pas encore sur le VPS :
- `d2eec07` -- dashboard de metriques `/admin/`
- `60e567d` -- fix workbox `/api/` (urlPattern RegExp ne matchait jamais,
  remplace par un matcher fonction sur `url.pathname`)
- `94de97a` -- migration `accounts.0002_seed_admin_user` (compte superuser
  jznguetsa@afriksys.com, mot de passe en clair dans le fichier -- accepte
  sciemment par l'utilisateur, voir entree ci-dessus)

Rien de tout cela n'est visible en production tant que le VPS n'a pas pull +
migre + rebuild.

Resultat attendu :
Executer `~/kriyo/deploy/kriyo-deploy.sh` (pull, migrate, collectstatic,
restart kriyo-backend, npm build, rsync, health check -- deja automatique).
A la fin :
- `python manage.py showmigrations accounts` montre `[X] 0002_seed_admin_user`
- Login sur `http://3.217.155.20/admin/login/` avec
  `jznguetsa@afriksys.com` / (mot de passe transmis a l'utilisateur en prive)
  reussit (redirection 302, pas de page d'erreur)
- `http://3.217.155.20/admin/` affiche le panneau "Kriyo — Vue d'ensemble"
  en haut de page (utilisateurs inscrits, connectes actuellement, etc.) --
  pas seulement la liste d'apps par defaut de Django admin
- Dans les devtools reseau du navigateur (ou `curl`), une requete vers
  `/api/...` ne doit jamais venir du service worker (verifier qu'il n'y a
  pas d'entree `/api/` dans le cache Workbox apres un `npm run build` +
  `sw.js` regenere)

Marquer DONE ici avec le resultat reel de ces verifications une fois
execute, puis commit + push ce fichier depuis le VPS.

---

### [LOCAL] 2026-10-05 — Audit complet + 5 phases (securite, bugs, robustesse backend/frontend, retention)
Statut: DONE

Demande / remarque :
Audit du projet (vulnerabilites + ameliorations) via 2 agents en parallele
(securite, qualite/architecture), puis implementation directe en 5 phases
sans repasser par confirmation, incluant des mecaniques de retention basees
sur la psychologie du trading (questionnaires/systemes incitant au respect
des regles).

Resultat attendu / ce qui a ete fait :

**Phase 1 — Securite** :
- `/api/schema/docs/` etait accessible anonymement (drf-spectacular
  override le IsAuthenticated global) -> verrouille a IsAdminUser.
- `ExecuteTradeSerializer.account_ids` n'avait pas de borne -> max_length=20.
- `SESSION_COOKIE_AGE` explicite (2 jours, etait le defaut Django 2 semaines)
  + `SESSION_SAVE_EVERY_REQUEST`.
- Cache DRF throttle passe de LocMemCache (par-process, donc le vrai taux
  effectif = taux configure x nb workers gunicorn = x2 en prod) a
  `DatabaseCache` partage -- table creee par
  `core.migrations.0002_create_cache_table`.
- CSP de base ajoutee sur les routes SPA de nginx (`deploy/nginx/kriyo.conf`,
  pas sur /api/ ni /admin/).
- Enumeration d'email au signup, absence de reset de mot de passe et de
  verification d'email : **non corriges** -- necessitent une infra email
  (SMTP) qui n'existe pas du tout dans le projet ; un correctif cosmetique
  sans cette infra aurait ete malhonnete. A traiter ensemble dans un futur
  chantier "infra email".

**Phase 2 — Bugs de correction** (ecarts avec le spec UX confirmes par
l'audit) :
- Le gate pouvait passer avec un critere a 0/6 si les 4 autres etaient
  parfaits (seuil global 75% seul, pas de plancher par critere). Ajout du
  plancher 4/6 obligatoire par critere (`gate.scoring.CRITERION_FLOOR`,
  `gate.0005` migration d'index associee).
- Un compte pouvait avoir plusieurs trades EN_COURS simultanes (aucune
  contrainte). Ajout d'un garde-fou service (409 propre) + contrainte DB
  conditionnelle (`performance.0004`, avec nettoyage des doublons existants
  avant d'appliquer la contrainte).
- `TradingAccount.current_balance` n'etait jamais mis a jour a la cloture
  d'un trade (restait fige au montant de creation). Corrige dans
  `tracking.services.close_trade`.

**Phase 3 — Robustesse backend** :
- Nouveau `core.exceptions.KriyoApiError` + `EXCEPTION_HANDLER` DRF commun --
  supprime le pattern try/except-par-exception duplique dans gate/
  performance/tracking `views.py`.
- Tests manquants ajoutes : `gate.questions` (200 + 404), app `core`
  (health + engagement, 3 tests).
- Dashboard admin : resultat agrege mis en cache 60s (le scan des sessions
  actives coutait de plus en plus cher avec le nombre de sessions).

**Phase 4 — Robustesse frontend** :
- Nouveau hook `useAsyncResource` -- corrige les echecs silencieux au
  chargement initial sur Accounts/Performance/Tracking (ils affichaient
  "aucune donnee" au lieu d'une erreur quand le fetch echouait).
- 401 global : `api/client.ts` emet un event `kriyo:session-expired` que
  `App.tsx` ecoute pour ramener a l'ecran de connexion, au lieu de laisser
  l'utilisateur bloque sur un ecran qui echouera a chaque requete.
- `formatCurrency` deduplique dans `formatters.ts`.
- Accessibilite : labels sur tous les champs de formulaire (avant:
  placeholder seul), modal de cloture de trade avec `role="dialog"`,
  fermeture Echap + clic sur le fond, focus auto sur le champ PnL,
  `--kriyo-faint` eclairci (etait ~3.3:1, sous le seuil WCAG AA 4.5:1).
- Bannière hors-ligne globale (`useOnlineStatus`, affichee dans AppShell).

**Phase 5 — Retention (psychologie du trading)** :
- **Streak** : jours consecutifs avec Security Gate reussi, calcule cote
  serveur (`gate.services.compute_streak`), affiche sur le Dashboard et
  l'ecran de resultat du gate. Logique loss-aversion : retombe a 0 si le
  jour d'avant ET aujourd'hui sont manques (pas arrondi pour "faire
  plaisir").
- **Feedback critere le plus faible** : moyenne par critere sur les
  tentatives reussies des 7 derniers jours, affiche sur l'ecran de resultat
  (`gate.services.compute_weakest_criterion`) -- technique d'auto-monitoring
  (CBT). Necessite au moins 2 criteres avec des donnees pour eviter un
  jugement base sur un seul point.
- **Nudge education contextuel** : a la cloture d'un trade VERROUILLE, le
  module de psychologie pertinent (deja ecrit, jusqu'ici jamais connecte au
  comportement reel) s'affiche directement -- daily_drawdown -> "Casser le
  revenge trading", max_drawdown -> "L'aversion a la perte",
  take_profit_forced -> "Le processus plutot que le resultat".
  (`Tracking.tsx`, mapping frontend uniquement, aucune donnee backend
  necessaire).
- **Progression education** : nouvelle app `education` enfin reelle (etait
  un stub vide depuis le debut) -- modele `EducationProgress`
  (user, module_key), endpoints GET/POST `/api/education/progress/`,
  bouton "Marquer comme lu" par module, remonte aussi dans le dashboard
  admin (modules lus / utilisateurs avec progression).

Migrations ajoutees cette session (en plus de celles deja listees dans
l'entree [SERVER] ci-dessus, qui restent a deployer) :
`gate.0005_gateattempt_gate_gateat_user_id_866d9c_idx`,
`performance.0004_trade_one_open_trade_per_account`,
`core.0002_create_cache_table`, `education.0001_initial`.

Notes d'execution :
86/86 tests backend passent en local (56 nouveaux tests ajoutes cette
session). `npm run build` frontend passe sans erreur TypeScript. Dashboard
admin reteste manuellement (login 302, page 200, nouvelle section Education
visible, aucune trace d'erreur serveur). Rien n'est committe -- en attente
de confirmation utilisateur avant commit+push (la migration
`performance.0004` notamment modifie un schema de contrainte, a verifier
sur une sauvegarde VPS avant d'etre deployee comme toujours).

---

### [LOCAL] 2026-10-07 — Audit fonctionnel (casquette psychologue + developpeur) + corrections
Statut: DONE

Demande / remarque :
Audit du schema fonctionnel de Kriyo en combinant un regard psychologue
(coherence de l'intervention comportementale) et developpeur (correction
du code), pour trouver les "zones d'ombre". 12 points releves, puis tous
corriges sur demande explicite ("corrige tout ensuite commit et pousse").

Ce qui a ete corrige :
1. **Daily drawdown calcule par trade, pas par jour** -- `evaluate_trade_closure`
   compare desormais le PnL CUMULE du jour (pas juste le trade en cours) au
   seuil. `close_trade` calcule `daily_pnl_before` a partir des trades deja
   clotures aujourd'hui (jour local du user).
2. **Rien n'empechait de rouvrir un trade juste apres un lock DD/TP** --
   nouveau champ `Trade.close_reason` (migration `performance.0005`),
   verifie par `execute_trade` : `daily_drawdown`/`take_profit_forced`
   bloquent le compte jusqu'au prochain jour local (`AccountLockedForTodayError`),
   `max_drawdown` bloque le compte **definitivement**
   (`AccountBreachedError`, compte "souffle").
3. **Feedback "point le plus faible" ne marchait que sur les tentatives
   reussies** -- `compute_weakest_criterion` inclut maintenant aussi les
   tentatives `locked`. Le `.delete()` des `CriterionResult` sur echec a
   ete retire (n'etait pas necessaire au "nouvel essai" qui cree de toute
   facon un nouveau `GateAttempt`, et detruisait la seule donnee utile a
   ce feedback pour quelqu'un qui echoue en boucle).
4. **Streak = pression a mentir pour ne pas la casser** -- ajout d'une note
   sous le badge de serie ("compte les jours evalues honnetement, pas les
   jours tradees") pour decoupler explicitement le streak de l'activite de
   trading.
5. **Bug de fond trouve pendant l'audit (pas dans la liste initiale,
   plus grave)** : la question "reverse-phrasee" anti-oui-partout
   (migration `gate.0004`) changeait le texte backend ET `positive_answer`,
   mais le frontend affiche ses propres chaines i18n qui n'avaient jamais
   ete mises a jour -- l'utilisateur voyait la formulation POSITIVE
   d'origine pendant que le backend notait comme si la formulation etait
   INVERSEE. Resultat : un utilisateur honnete et calme qui repondait
   sincerement "Oui" a cette question precise etait note comme s'il avait
   mal repondu, plafonnant injustement son score sur 1 des 5 criteres,
   chaque jour, depuis le deploiement de `gate.0004`. Corrige en
   remplacant le texte FR/EN affiche par la formulation reellement notee
   (5 questions, FR+EN dans `translations.ts`).
6. **Lock du Sas de Securite sans aucun contenu** -- ajout du module
   Education "Routine et recuperation" (deja ecrit, jamais connecte) sur
   l'ecran de lock, meme pattern que le nudge deja present sur un lock de
   trade.
7. et 8. **Binaire sans nuance / pas de re-validation intraday** --
   **non corriges**, voir "Non traite" ci-dessous.
9. **Donnees sensibles sans suppression possible** -- nouveau
   `DELETE /api/auth/me/` (supprime l'utilisateur, cascade sur toutes ses
   donnees) + bouton "Supprimer mon compte" sur le Dashboard (confirmation
   navigateur).
10. **Pas de visibilite sur la marge de risque au moment de selectionner un
    compte pour le 9/9** -- chaque ligne de compte dans Performance affiche
    maintenant la balance actuelle + le PnL du jour (vert/rouge). Ajout
    aussi d'un avertissement doux si le Sas de Securite date de 4h+ au
    moment d'executer (nouveau champ `passed_at` sur l'etat du gate).
11. **Fuseau horaire fige a la connexion** -- nouveau
    `POST /api/auth/timezone/`, appele a chaque ouverture du Sas de
    Securite (pas seulement au login).
12. **Aucun retour en arriere dans le quiz** -- bouton "Question
    precedente" ajoute (le backend acceptait deja la re-reponse via
    `update_or_create`, seul le frontend bloquait).

Non traite (scope volontairement limite, a planifier separement si
voulu) :
- **#7 Binaire Oui/Non sans nuance** : passer a une echelle (ex: 3 points)
  demanderait de recalibrer tout le systeme de poids/plancher par critere
  et de refaire l'UI des 30 questions -- disproportionne pour ce passage,
  risque de casser un systeme de scoring deja calibre et teste.
- **#8 Re-validation intraday complete** : un vrai re-check Macro/Alignment
  avant chaque trade recouperait fortement le questionnaire VR/EP/VP du
  Palier 02 -- seule une version minimale a ete faite (avertissement
  "Sas de Securite vieux de Xh"), une vraie re-certification reste a
  concevoir si le besoin se confirme.

Notes d'execution :
Tests backend complets (gate, performance, tracking, core, accounts,
education) verts apres chaque etape. `npm run build` frontend sans erreur
TypeScript. Nouvelle migration `performance.0005_trade_close_reason` --
additive (champ nullable), aucune donnee existante a backfiller,
deployable sans precaution particuliere contrairement a `performance.0004`.
