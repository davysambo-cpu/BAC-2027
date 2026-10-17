# BAC-2027

Plateforme PWA d'accompagnement et de révision destinée, dans son MVP, aux élèves de Série D au Burkina Faso.

BAC-2027 doit permettre aux élèves de rassembler progressivement leurs cours, organiser leurs révisions, réaliser des quiz et suivre leur progression, y compris avec une connexion instable.

## Avancement

| Partie | Statut |
|---|---|
| 1 — Cadrage et cahier des charges | ✅ Terminée |
| 2 — Expérience utilisateur et design | ✅ Terminée |
| 3 — Architecture et fondations techniques | ✅ Terminée |
| 4 — Comptes utilisateurs et profils | ✅ Terminée |
| 5 — Matières et contenus pédagogiques | 🟨 Corpus sourcé administrable et enrichissement factuel opérationnels ; premières fiches réelles à valider |
| 6 à 8 | ⬜ À faire |

Le statut détaillé et les prochaines actions se trouvent dans [`PLAN_PROJET.md`](./PLAN_PROJET.md).

## Documentation

- [Plan directeur en 8 parties](./PLAN_PROJET.md)
- [Cahier des charges approuvé](./CAHIER_DES_CHARGES.md)
- [Conception UX/UI approuvée](./CONCEPTION_UX_UI.md)
- [Architecture technique](./ARCHITECTURE_TECHNIQUE.md)
- [Comptes et profils — Partie 4](./docs/COMPTES_ET_PROFILS.md)
- [Analyse des sources pédagogiques reçues pour la Partie 5](./docs/ANALYSE_SOURCES_PARTIE_5.md)
- [Contenus pédagogiques et bilans quotidiens — Partie 5](./docs/PARTIE_5_CONTENUS_PEDAGOGIQUES.md)
- [Guide de développement](./docs/DEVELOPPEMENT.md)
- [Décisions d'architecture](./docs/adr/)
- [Prototype UX/UI autonome](./prototype/README.md)

## Architecture

Le projet utilise un monorepo TypeScript :

```text
apps/web             PWA React et Vite
apps/api             API Fastify et schéma PostgreSQL/Drizzle
packages/contracts   Contrats Zod partagés
prototype            Prototype UX/UI approuvé
```

Les données hors ligne sont préparées dans IndexedDB avec Dexie. La base structurée utilise PostgreSQL en production et PGlite pour le développement local sans dépendance externe. Les médias utilisent le système de fichiers local en développement et un stockage objet compatible S3 privé, obligatoire en production.

## Prérequis

- Node.js 22.12 ou plus récent ;
- npm 10 ou plus récent ;
- PostgreSQL 17 uniquement pour reproduire la cible de production (PGlite suffit par défaut en développement).

## Installation

```bash
cp .env.example .env
npm ci
```

## Développement

Lancer le web et l'API ensemble :

```bash
npm run dev
```

Services :

- application web : `http://localhost:5173` ;
- API : `http://localhost:3000` ;
- santé de l'API : `http://localhost:3000/api/health`.

Le frontend appelle toujours l'API avec des URL relatives comme `/api/health`. Vite assure le proxy en développement.

Pour amorcer le premier administrateur local :

```bash
ADMIN_USERNAME=admin \
ADMIN_DISPLAY_NAME="Administration BAC-2027" \
ADMIN_PASSWORD="choisir-un-mot-de-passe-unique" \
npm run admin:create
```

Les parcours réels sont ensuite disponibles sur `/connexion`, `/activation`, `/recuperation`, `/profil` et `/admin`.

## Contrôles de qualité

```bash
npm run check
```

Cette commande exécute :

- vérification du formatage ;
- ESLint ;
- vérification TypeScript ;
- tests automatisés ;
- builds de production du web et de l'API.

## Base de données

Générer une migration après une modification du schéma :

```bash
npm run db:generate
```

PGlite applique automatiquement les migrations au démarrage en développement et dans les tests. Pour PostgreSQL, configurer `DATABASE_DRIVER=postgres`, puis exécuter :

```bash
npm run db:migrate
```

Importer ou actualiser idempotemment le catalogue pédagogique initial fourni pour la Partie 5 :

```bash
npm run catalogue:import
```

L'import conserve 203 entrées avec leur provenance ; 191 sont visibles dans le catalogue élève et 12 explicitement attribuées à une autre série restent masquées.

Voir [`docs/DEVELOPPEMENT.md`](./docs/DEVELOPPEMENT.md) et [`docs/COMPTES_ET_PROFILS.md`](./docs/COMPTES_ET_PROFILS.md) pour les instructions détaillées.

## Prototype UX/UI

Le prototype validé de la Partie 2 reste indépendant de l'application réelle :

```bash
python3 -m http.server 4173 --bind 0.0.0.0 --directory prototype
```

Identifiants simulés : `awa07` / `bac2027`. Aucune donnée du prototype n'est persistée sur un serveur.
