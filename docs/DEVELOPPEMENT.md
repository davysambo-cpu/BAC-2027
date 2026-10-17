# Guide de développement — BAC-2027

## Prérequis

- Node.js `22.12` ou plus récent ;
- npm `10` ou plus récent ;
- PostgreSQL 17 seulement pour reproduire la cible de production ;
- Docker Compose facultatif pour lancer PostgreSQL localement.

PGlite est utilisé par défaut : aucune base externe n'est nécessaire pour lancer l'application, appliquer les migrations ou exécuter les tests.

## Installation

```bash
cp .env.example .env
npm ci
```

Lors de la toute première installation avant la création du lockfile, utiliser `npm install`. Les installations suivantes doivent utiliser `npm ci`.

## Lancer les services

### Ensemble

```bash
npm run dev
```

### Séparément

```bash
npm run dev:api
npm run dev:web
```

- Web : `http://localhost:5173`
- API : `http://localhost:3000`
- Santé API : `http://localhost:3000/api/health`

Le navigateur appelle `/api/...` sur le serveur Vite. Vite redirige ces appels vers l'API ; le code frontend ne doit jamais utiliser `localhost` directement.

## Bases de données

### PGlite par défaut

`DATABASE_DRIVER=pglite` conserve la base dans `.data/pglite`, un dossier ignoré par Git. Le démarrage de l'API crée le dossier et applique automatiquement toutes les migrations. Utiliser `PGLITE_DATA_DIR=memory://` dans un test isolé.

### PostgreSQL local facultatif

Définir `DATABASE_DRIVER=postgres`. Avec Docker Compose :

```bash
docker compose up -d postgres
docker compose ps
```

Sans Docker, utiliser une instance PostgreSQL existante et modifier uniquement `DATABASE_URL` dans `.env`.

## Base de données

Créer une migration après une modification du schéma :

```bash
npm run db:generate
```

PGlite applique automatiquement les migrations au démarrage. Avec PostgreSQL, les appliquer explicitement :

```bash
DATABASE_DRIVER=postgres npm run db:migrate
```

Créer le premier compte administrateur :

```bash
ADMIN_USERNAME=admin \
ADMIN_DISPLAY_NAME="Administration BAC-2027" \
ADMIN_PASSWORD="choisir-un-mot-de-passe-long-et-unique" \
npm run admin:create
```

La commande refuse de modifier un compte existant. Ne jamais enregistrer le mot de passe dans un fichier versionné.

Charger les données de démonstration non officielles :

```bash
SEED_DEMO_DATA=true npm run db:seed
```

Le seed est interdit en production. Les matières de démonstration portent explicitement le préfixe `DEMO-` et ne sont jamais exposées comme catalogue Série D.

Importer le catalogue pédagogique initial de la Partie 5 :

```bash
npm run catalogue:import
```

Cette commande lit le manifeste vérifié dans `docs/sources/`, conserve la provenance et les empreintes des neuf PDF, puis réalise un import idempotent. Elle crée sept matières, neuf sources et 203 entrées : 191 sont visibles par l'élève de Série D et 12 explicitement étiquetées pour une autre série sont conservées uniquement pour l'administration. Les données restent marquées `owner_provided` tant qu'une validation pédagogique ou institutionnelle ne les fait pas changer de statut.

## Stockage des médias privés

En développement, `MEDIA_STORAGE_DRIVER=filesystem` écrit les photos et audios dans `.data/uploads`, dossier ignoré par Git. Les métadonnées et le condensat SHA-256 restent en base. Le client crée d'abord le bilan, puis envoie chaque média à la route authentifiée prévue à cet effet ; une copie personnelle en attente reste dans IndexedDB jusqu'à confirmation.

En production, la validation de configuration exige `MEDIA_STORAGE_DRIVER=s3`. Il faut alors fournir `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` et, pour un service compatible autre qu'AWS, `S3_ENDPOINT`. Le conteneur doit rester privé : les téléchargements passent par l'API après contrôle de propriété. `S3_FORCE_PATH_STYLE=true` peut être nécessaire avec certains fournisseurs compatibles.

Les limites du pilote sont configurables : deux photos de 5 Mo et un audio de 10 Mo par bilan, dans le quota global de 250 Mo par élève. Le serveur détecte le type par signature binaire ; changer uniquement l'extension ou le MIME déclaré ne permet pas de contourner le contrôle.

## Enrichissement pédagogique

Le serveur utilise `CuratedCorpusEnrichmentProvider`, qui cherche une fiche publiée pour le thème exact du bilan. Sans fiche, il délègue à `LocalOutlineEnrichmentProvider` : ce repli déterministe et gratuit organise le bilan, les points compris et les questions sans effectuer de vérification factuelle.

Les fiches sont administrées depuis `/admin`. Une fiche contient sa provenance, un extrait justificatif et des sections pédagogiques structurées. Les champs multilignes utilisent une entrée par ligne ; les définitions suivent `terme | explication` et les règles de correction `expression littérale | correction | explication`. Une fiche publiée est utilisée immédiatement pour les nouvelles générations. Un brouillon élève déjà créé peut demander une actualisation ; une nouvelle génération n'est persistée que si le fournisseur ou la version de la fiche a changé.

Le corpus reste vide après l'installation et le seed : aucune connaissance ne doit être publiée automatiquement. Les niveaux `curated` et `institutional` sont attribués par l'administration après vérification. Les créations, publications, mises à jour et archivages sont journalisés dans `admin_audit_logs`.

Routes privées concernées :

- `GET /api/v1/admin/catalogue` : vue complète des 203 entrées, réservée à l'administration ;
- `GET /api/v1/admin/knowledge-cards` : couverture et versions actuelles ;
- `POST /api/v1/admin/knowledge-cards` : création ;
- `PUT /api/v1/admin/knowledge-cards/:cardId` : modification, publication ou archivage ;
- `POST /api/v1/daily-reports/:reportId/enrichment` avec `{ "force": true }` : recherche explicite d'une fiche nouvelle ou actualisée.

Les mutations du corpus exigent `X-BAC-Knowledge-Write: 1`. L'actualisation d'un brouillon exige l'en-tête d'enrichissement existant.

L'interface `EnrichmentProvider` permettra aussi de raccorder un moteur de recherche ou un modèle de génération. Toute implémentation doit renvoyer le contrat structuré, conserver ses métadonnées et associer chaque correction à un extrait exact de l'original ainsi qu'à au moins une citation. Un fournisseur externe pourra préparer un brouillon de fiche, mais la publication restera une action administrative.

## Carnet personnel de révision

Le programme visible fournit 191 thèmes de contrôle. `GET /api/v1/revision/topics` agrège, pour l'élève connecté, les bilans, les cours personnels validés et le journal `topic_revision_reviews`. `POST /api/v1/revision/topics/:catalogueItemId/reviews` ajoute une auto-évaluation privée et exige `X-BAC-Revision: 1`. Le corps contient un UUID client `id`, le niveau, la note facultative et `performedAt`. Réenvoyer le même UUID avec le même propriétaire renvoie le passage existant sans nouvelle insertion.

Les rappels initiaux sont calculés à partir de `performedAt` :

- `difficult` : 1 jour ;
- `fragile` : 3 jours ;
- `comfortable` : 7 jours ;
- `mastered` : 21 jours.

Sur un appareil personnel, la vue agrégée est cachée dans IndexedDB et une auto-évaluation sans réseau est conservée comme opération `topicRevisionReview` dans l'outbox. L'aperçu local est mis à jour immédiatement ; `syncPendingTopicRevisionReviews` rejoue les opérations à la reconnexion et les marque comme synchronisées après la réponse de l'API. Ce stockage persistant est désactivé sur un appareil partagé. `REVISION_TARGET_MONTH=2027-07` configure l'horizon affiché ; ce mois ne doit pas être présenté comme une date officielle précise de l'examen.

## Contrôles de qualité

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
```

Tout exécuter :

```bash
npm run check
```

Corriger le formatage :

```bash
npm run format
```

## Structure

- `apps/web` : PWA React ;
- `apps/api` : API Fastify et schéma Drizzle ;
- `packages/contracts` : schémas Zod partagés ;
- `apps/api/drizzle` : migrations SQL ;
- `prototype` : prototype UX/UI approuvé, indépendant du produit final.

## Variables d'environnement

Copier `.env.example` vers `.env`. Ne jamais modifier l'exemple avec un secret réel et ne jamais versionner `.env`.

Les variables privées ne doivent pas être préfixées par `VITE_`. Tout nom commençant par `VITE_` peut être envoyé au navigateur.

En production, la validation refuse de démarrer si `DATABASE_DRIVER` n'est pas `postgres` ou si `AUTH_TOKEN_SECRET` conserve la valeur de développement. Le secret doit contenir au moins 32 caractères aléatoires et être fourni par le gestionnaire de secrets du déploiement.

Les durées configurables de la Partie 4 sont `INVITATION_TTL_HOURS`, `RESET_CODE_TTL_MINUTES`, `PERSONAL_SESSION_TTL_DAYS` et `SHARED_SESSION_TTL_HOURS`. L'horizon du carnet est `REVISION_TARGET_MONTH` au format `AAAA-MM`.

## Résolution des problèmes

### L'interface indique que l'API est indisponible

1. vérifier que `npm run dev:api` fonctionne ;
2. ouvrir `/api/health` via le serveur web ;
3. vérifier `API_PORT` et `API_PROXY_TARGET` ;
4. ne pas mettre d'URL `localhost` dans le code du navigateur.

### La connexion réussit, puis le profil répond qu'il faut se reconnecter

Dans un aperçu HTTPS intégré à une iframe tierce, démarrer temporairement avec :

```bash
EMBEDDED_PREVIEW_MODE=true npm run dev
```

Cette option crée un cookie `Secure`, `SameSite=None` et partitionné. Si l'iframe bloque malgré tout les cookies, le client utilise un jeton de session gardé uniquement en mémoire jusqu'au rechargement. La validation de configuration interdit ce mode en production. Ne pas l'activer pour le développement normal ni pour un déploiement web/API sous la même origine.

### Une migration ne s'applique pas

1. vérifier `DATABASE_URL` ;
2. vérifier que PostgreSQL est disponible ;
3. ne jamais modifier une migration déjà appliquée en production ;
4. créer une nouvelle migration corrective.

### Le mode PWA semble ancien

Le service worker de production peut conserver une version précédente. Fermer les onglets, actualiser l'application et accepter la mise à jour lorsqu'elle sera proposée. En développement, le service worker PWA est désactivé.
