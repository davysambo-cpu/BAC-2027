# Déploiement pilote BAC-2027

Le pilote partagé utilise deux ressources dédiées et ne modifie aucun autre projet du compte :

- Vercel sert la PWA et l'API Fastify sous le même domaine ;
- Supabase fournit PostgreSQL 17 ;
- la branche de validation reste `arena/906418dd-bac-2027`.

## Construction

`vercel.json` exécute dans cet ordre :

1. les migrations Drizzle ;
2. l'import idempotent du catalogue pédagogique initial ;
3. l'amorçage facultatif du compte de recette ;
4. le build Vite de la PWA.

L'API est adaptée à une fonction serverless par `api/[...path].ts`. Une seule connexion PostgreSQL est demandée par instance afin de respecter les limites du pooler Supabase.

## Variables protégées

Les valeurs suivantes doivent être configurées dans Vercel sans être ajoutées au dépôt :

- `DATABASE_DRIVER=postgres` ;
- `DATABASE_URL` vers le pooler PostgreSQL du projet pilote ;
- `DATABASE_MAX_CONNECTIONS=1` ;
- `AUTH_TOKEN_SECRET` aléatoire d'au moins 32 caractères ;
- `PILOT_MODE=true` ;
- `PILOT_SEED_DATA=true` uniquement pour l'environnement de recette ;
- `PILOT_STUDENT_PASSWORD` comme secret de déploiement ;
- `MEDIA_STORAGE_DIR=/tmp/bac-2027-media` pour le pilote ;
- les durées de session et `REVISION_TARGET_MONTH=2027-07`.

## Limite volontaire du pilote

Le planning, les comptes, le catalogue, les bilans textuels et les révisions sont persistants dans PostgreSQL. En revanche, tant qu'un stockage S3 privé n'est pas configuré, les photos et audios envoyés au déploiement pilote utilisent un espace temporaire serverless et peuvent disparaître après une nouvelle instance.

Cette exception exige `PILOT_MODE=true`. Elle est interdite pour la production finale, qui conserve l'obligation d'un stockage objet compatible S3 privé.

## Compte de recette

`npm run pilot:seed` est sans effet lorsque `PILOT_SEED_DATA=false`. Lorsqu'il est activé, il crée ou actualise le compte `recette6` et ajoute quinze séances de démonstration avec des identifiants idempotents. Le mot de passe provient exclusivement du gestionnaire de secrets Vercel.

## Vérifications après déploiement

- `GET /api/health` renvoie `status: ok` ;
- la connexion de `recette6` réussit en appareil personnel et partagé ;
- `/planning` affiche les groupes temporels et permet le CRUD ;
- une mutation hors ligne est rejouée après reconnexion ;
- une actualisation directe de `/planning` retourne bien la PWA ;
- aucune variable privée n'est présente dans le bundle navigateur.
