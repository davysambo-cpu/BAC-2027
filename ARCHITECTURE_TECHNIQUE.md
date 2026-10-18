# Architecture technique — BAC-2027

> **Version :** 1.0  
> **Date :** 15 octobre 2026  
> **Statut :** `✅ Approuvé`  
> **Partie du plan :** Partie 3 — Architecture et fondations techniques  
> **Références :** [CAHIER_DES_CHARGES.md](./CAHIER_DES_CHARGES.md) · [CONCEPTION_UX_UI.md](./CONCEPTION_UX_UI.md)

---

## 1. Décision d'architecture

BAC-2027 adopte une architecture **TypeScript modulaire**, organisée dans un monorepo :

- **Application web PWA :** React et Vite ;
- **API :** Fastify ;
- **Base de données serveur :** PostgreSQL ;
- **Accès aux données :** Drizzle ORM ;
- **Base locale du navigateur :** IndexedDB avec Dexie ;
- **Validation et contrats partagés :** Zod ;
- **Stockage des médias :** stockage objet compatible S3 ;
- **Tests :** Vitest, Testing Library et injection Fastify ;
- **Qualité :** TypeScript strict, ESLint et Prettier ;
- **Organisation :** npm workspaces.

Cette architecture a été choisie pour :

1. contrôler précisément le fonctionnement hors ligne ;
2. partager les types entre le navigateur et l'API ;
3. conserver une authentification par nom d'utilisateur ;
4. séparer les médias volumineux des données relationnelles ;
5. rester portable entre plusieurs hébergeurs ;
6. démarrer avec une infrastructure simple dans un budget contrôlé ;
7. pouvoir évoluer sans réécrire le MVP.

---

## 2. Contraintes confirmées

| Contrainte | Décision technique |
|---|---|
| Support principal | PWA responsive, mobile d'abord |
| Connexion instable | Données locales, file d'opérations et reprise de synchronisation |
| Accès sur invitation | Authentification gérée par l'API BAC-2027 |
| Identifiant | Nom d'utilisateur unique |
| Ressources privées | Autorisations vérifiées côté API et objets isolés par propriétaire |
| Médias multiples | Métadonnées dans PostgreSQL, fichiers dans un stockage objet |
| Taille du pilote | Inconnue ; architecture extensible sans surdimensionnement initial |
| Quota élève | Configurable ; valeur initiale prudente avant mesure du pilote |
| Budget mensuel | Environ 10 000 à 30 000 FCFA |
| Modèle économique | Aucun paiement dans le MVP |
| Langue | Français au lancement |
| Programme | Série D du Burkina Faso, matières officielles à valider avant la Partie 5 |

---

## 3. Versions initiales

Les versions ci-dessous correspondent aux versions stables vérifiées lors de l'initialisation du 15 octobre 2026. Le fichier `package-lock.json` conservera les versions réellement installées.

| Outil | Version initiale |
|---|---:|
| Node.js | `>= 22` |
| TypeScript | `6.0.3` |
| React / React DOM | `19.3.1` |
| Vite | `8.3.4` |
| Plugin React pour Vite | `6.1.2` |
| React Router | `7.18.4` |
| TanStack Query | `5.104.2` |
| Fastify | `5.12.7` |
| Drizzle ORM | `0.45.4` |
| Drizzle Kit | `0.31.11` |
| PostgreSQL client `postgres` | `3.4.9` |
| PGlite | `0.5.10` |
| Fastify Cookie | `11.1.3` |
| Argon2 | `0.45.1` |
| Dexie | `4.4.6` |
| Zod | `4.6.7` |
| vite-plugin-pwa | `2.0.0` |
| Vitest | `5.0.4` |
| ESLint | `10.12.0` |
| Prettier | `3.9.10` |

Les mises à jour majeures ne seront pas appliquées automatiquement sans vérification des migrations et des tests.

---

## 4. Organisation du dépôt

```text
BAC-2027/
├── apps/
│   ├── web/                    # PWA React/Vite
│   │   ├── public/             # Icônes et fichiers publics
│   │   └── src/
│   │       ├── app/            # Composition de l'application
│   │       ├── components/     # Composants d'interface
│   │       ├── features/       # Domaines fonctionnels futurs
│   │       ├── lib/            # API, configuration et utilitaires
│   │       ├── offline/        # IndexedDB, outbox et synchronisation
│   │       └── styles/         # Jetons et styles globaux
│   │
│   └── api/                    # API Fastify
│       ├── drizzle/            # Migrations SQL versionnées
│       └── src/
│           ├── config/         # Validation des variables d'environnement
│           ├── db/             # Client et schéma PostgreSQL
│           ├── modules/        # Modules fonctionnels futurs
│           ├── plugins/        # Plugins Fastify
│           └── routes/         # Routes HTTP
│
├── packages/
│   └── contracts/              # Schémas Zod et types partagés
│
├── docs/
│   └── adr/                    # Décisions d'architecture durables
│
├── prototype/                  # Prototype UX/UI approuvé, non productif
├── .github/workflows/          # Intégration continue
├── .env.example                # Configuration sans secret
├── compose.yaml                # PostgreSQL local facultatif
├── package.json                # Scripts du monorepo
└── package-lock.json           # Versions verrouillées
```

### Règles d'organisation

- Un domaine fonctionnel ne doit pas dépendre de l'interface d'un autre domaine.
- Les contrats échangés par le web et l'API vivent dans `packages/contracts`.
- Les secrets ne sont jamais placés dans les contrats ni dans le frontend.
- Le prototype reste une référence visuelle et n'est pas importé par l'application finale.
- Une dépendance n'est ajoutée que si elle simplifie un besoin identifié.

---

## 5. Vue logique

```text
┌──────────────────────────────────────────────────────────────┐
│ Appareil de l'élève                                          │
│                                                              │
│  React PWA ─────── IndexedDB / Dexie                         │
│      │                  │                                    │
│      │              Outbox locale                            │
│      │                  │                                    │
│      └──── Service de synchronisation ───────┐               │
└──────────────────────────────────────────────┼───────────────┘
                                               │ HTTPS / JSON
                                               │ /api/v1
┌──────────────────────────────────────────────▼───────────────┐
│ API Fastify                                                  │
│                                                              │
│  Authentification  Autorisations  Validation Zod             │
│         │                 │              │                    │
│         └──────── Modules métier ─────────┘                   │
│                          │                                   │
│             ┌────────────┴────────────┐                      │
│             │                         │                      │
│      PostgreSQL / Drizzle      Stockage objet S3             │
│      données et versions       documents et médias           │
└──────────────────────────────────────────────────────────────┘
```

Le navigateur appelle uniquement des URL relatives comme `/api/v1/...`. En développement, Vite redirige ces requêtes vers l'API. En production, un reverse proxy expose le web et l'API sous le même domaine.

---

## 6. Application web PWA

### Responsabilités

- afficher l'interface approuvée ;
- conserver localement les données nécessaires ;
- fonctionner après le chargement initial sans connexion ;
- enregistrer immédiatement les modifications locales ;
- synchroniser les opérations lorsque l'API redevient accessible ;
- afficher l'état réel de chaque opération ;
- ne jamais exposer un secret serveur.

### Bibliothèques principales

- React pour les composants ;
- React Router pour la navigation ;
- TanStack Query pour les lectures serveur et leur invalidation ;
- Dexie pour IndexedDB ;
- vite-plugin-pwa pour le manifeste et le service worker ;
- Zod pour valider les réponses et objets locaux.

### Source de vérité locale

Pour les fonctions hors ligne, l'interface lit d'abord IndexedDB. Une action de l'élève suit ce principe :

1. valider les données localement ;
2. enregistrer la nouvelle version dans IndexedDB ;
3. ajouter une opération dans l'outbox ;
4. mettre l'interface à jour ;
5. tenter la synchronisation ;
6. confirmer ou signaler une erreur sans supprimer la copie locale.

### Cache du service worker

Le service worker conserve :

- le squelette de l'application ;
- les fichiers JavaScript et CSS versionnés ;
- les icônes et ressources statiques ;
- une page de secours hors ligne.

Il ne met pas automatiquement en cache tous les médias. Les médias communs sont téléchargés explicitement par l'élève.

---

## 7. API Fastify

### Responsabilités

- authentifier l'utilisateur ;
- vérifier son rôle et la propriété de chaque donnée ;
- appliquer les règles métier ;
- valider les entrées et sorties ;
- enregistrer les changements de manière transactionnelle ;
- dédupliquer les opérations de synchronisation ;
- contrôler l'accès privé aux médias et abstraire leur stockage ;
- isoler les fournisseurs d'enrichissement et valider strictement leurs réponses ;
- journaliser les actions administratives sensibles.

### Conventions HTTP

- préfixe : `/api/v1` ;
- JSON pour les données métier ;
- identifiants UUID ;
- dates ISO 8601 en UTC ;
- codes HTTP standards ;
- erreur structurée avec code stable et message français ;
- pagination par curseur pour les flux synchronisés ;
- identifiant de requête dans chaque réponse ;
- opérations sensibles protégées contre les abus.

### Adaptateur d'enrichissement pédagogique

Le domaine dépend d'une interface `EnrichmentProvider`, jamais du SDK propriétaire d'un fournisseur. Chaque résultat est validé avant écriture et conserve le fournisseur, le modèle, la version de consigne et la version du bilan utilisée.

Le fournisseur `local-outline` est le repli gratuit et déterministe : il structure uniquement le texte existant et signale explicitement l'absence de vérification factuelle. Le fournisseur `curated-corpus` cherche ensuite une fiche publiée pour le thème exact du bilan et restitue son contenu structuré avec citation. Les règles de contradiction sont des expressions littérales administrées, jamais du code ou des expressions régulières exécutables.

Une actualisation forcée compare le fournisseur et la version de la fiche : elle crée une nouvelle génération uniquement lorsque le corpus disponible a réellement changé. Un fournisseur externe futur pourra assister la préparation d'une fiche, mais ne pourra pas la publier automatiquement et devra respecter les mêmes contrats :

- aucune modification du bilan original ;
- toute correction référence un extrait exact de l'original ;
- toute correction possède au moins une citation valide ;
- sources classées `institutional`, `curated`, `catalogue` ou `web` ;
- nouvelle génération dédupliquée pour une même version du bilan ;
- validation finale impossible tant qu'une correction reste sans décision.

### Carnet de révision fondé sur le programme

Le programme est une trame de couverture, pas un corpus factuel. L'API agrège pour chaque thème visible : bilans privés, cours personnels actuellement validés et auto-évaluations. Chaque révision est un événement append-only lié à l'élève et au thème ; elle conserve un UUID client idempotent, le niveau déclaré, une note facultative, l'heure réelle d'exécution, l'heure serveur et le prochain rappel proposé.

Les intervalles initiaux sont déterministes : 1 jour (`difficult`), 3 jours (`fragile`), 7 jours (`comfortable`) et 21 jours (`mastered`). Ils servent à organiser le retour sur les notions, sans produire une note scolaire ni affirmer une maîtrise objective. La route d'écriture contrôle la Série D, la propriété de la session et un en-tête d'intention.

Sur un appareil personnel, la dernière vue agrégée est cachée et une auto-évaluation peut être créée hors ligne : l'interface applique immédiatement le passage à l'aperçu local puis conserve l'opération `topicRevisionReview` dans l'outbox Dexie. À la reconnexion, le même UUID est envoyé jusqu'à acquittement ; l'unicité serveur évite toute duplication après une réponse perdue. Un appareil partagé n'utilise pas ce stockage privé persistant.

### Planning personnel

`revision_sessions` conserve les séances choisies par l'élève avec durée prévue, état, contrôle de version et lien facultatif vers une matière et un thème visible. Les API de lecture et de mutation filtrent toujours par `student_id`. Une modification compare la version fournie ; une répétition dont l'état souhaité a déjà été appliqué renvoie le résultat courant, tandis qu'une divergence produit `RESOURCE_VERSION_CONFLICT`.

Dexie version 7 rend les mutations optimistes sur appareil personnel. L'outbox compacte plusieurs mises à jour locales d'une même séance et rejoue création, dernier état puis suppression dans cet ordre. Le tableau de bord et `/planning` utilisent la même copie locale, puis la remplacent par l'état serveur après acquittement. Sur appareil partagé, les mutations restent exclusivement en ligne.

La vue MVP est une liste calculant localement les catégories en retard, aujourd'hui, à venir et historique. Aucune notification système ni intégration calendaire externe n'est nécessaire à ce stade.

### Format d'erreur cible

```json
{
  "error": {
    "code": "RESOURCE_VERSION_CONFLICT",
    "message": "Cette ressource a été modifiée sur un autre appareil.",
    "requestId": "req_...",
    "details": {}
  }
}
```

Les détails techniques et traces ne sont jamais renvoyés au navigateur en production.

---

## 8. PostgreSQL et Drizzle

PostgreSQL conserve :

- comptes, invitations et profils ;
- matières, chapitres et catalogue ;
- fiches de savoir approuvées, versions, règles littérales et provenance ;
- journal privé des auto-évaluations et rappels par thème ;
- métadonnées des ressources ;
- planning ;
- quiz, questions, tentatives et résultats ;
- versions nécessaires à la synchronisation ;
- journal administratif ;
- informations de fichiers, mais pas les fichiers eux-mêmes.

### Principes du schéma

- UUID pour les entités synchronisées ;
- heure serveur en UTC ;
- colonne `version` sur les entités modifiables hors ligne ;
- suppression logique lorsque la synchronisation l'exige ;
- contraintes uniques pour empêcher les doublons ;
- clés étrangères et index explicites ;
- migrations SQL conservées dans Git ;
- chaque matière et entrée conserve son niveau de validation ; le catalogue fourni n'est jamais présenté comme institutionnellement certifié.

---

## 9. Stockage des médias

Les documents, images, audios et vidéos ne sont pas stockés dans PostgreSQL.

### Architecture

```text
Métadonnées et autorisations ── PostgreSQL
Fichier binaire              ── stockage objet compatible S3
Copie hors ligne choisie     ── stockage local du navigateur
```

### Flux du pilote pour les médias courts

1. le bilan textuel est d'abord créé de manière idempotente ;
2. chaque photo ou audio est envoyé séparément à l'API en `multipart/form-data` ;
3. l'API vérifie la session, la propriété du bilan, le nombre de médias et le quota global ;
4. l'API ne se fie pas à l'extension : elle contrôle la signature binaire et détermine elle-même le type ;
5. le fichier reçoit une clé de stockage aléatoire indépendante du nom fourni ;
6. le binaire est écrit dans le stockage configuré et ses métadonnées sont enregistrées dans PostgreSQL ;
7. le client marque la copie IndexedDB comme synchronisée ou la conserve dans l'outbox en cas d'interruption.

Le développement utilise un dossier local ignoré par Git. La configuration de production refuse ce mode et exige un stockage compatible S3 privé. Pour des documents ou vidéos plus volumineux, une évolution par URL temporaire et confirmation de fin reste prévue afin d'éviter de faire transiter de gros fichiers dans l'API.

### Protections mises en œuvre pour les bilans

- limite par type et par nombre de médias ;
- quota global par utilisateur configurable ;
- validation du type déclaré côté client puis de la signature binaire côté serveur ;
- nom et clé de stockage non fournis par l'utilisateur ;
- lecture réservée au propriétaire par une route authentifiée, avec `no-store` et `nosniff` ;
- envoi protégé par un en-tête applicatif et une limitation de débit ;
- stockage S3 privé obligatoire en production ;
- suppression différée et contrôle antivirus à ajouter avant une ouverture publique plus large.

### Valeurs de départ du pilote

Tant que la taille du pilote est inconnue :

- quota élève configurable : `250 Mo` ;
- bilan quotidien : `2` photos de `5 Mo` maximum chacune ;
- bilan quotidien : `1` audio de `10 Mo` maximum ;
- document générique : `25 Mo` maximum ;
- vidéo générique : `150 Mo` maximum, non activée dans le bilan ;
- aucun média lourd téléchargé automatiquement hors ligne.

Ces valeurs sont des réglages d'exploitation, pas des limites codées en dur.

---

## 10. Synchronisation hors ligne

### 10.1 Données locales

IndexedDB contient notamment :

- métadonnées des ressources ;
- notes personnelles ;
- dernière vue agrégée du carnet de révision ;
- séances de révision ;
- quiz explicitement téléchargés ;
- tentatives non synchronisées ;
- opérations de l'outbox ;
- curseur de dernière synchronisation ;
- état des téléchargements de médias.

### 10.2 Format d'une opération locale

```text
operationId       UUID unique
entityType        type de l'entité
entityId          UUID de l'entité
kind              create | update | delete
baseVersion       version serveur connue
payload           modification validée
createdAt         heure de l'appareil
attemptCount      nombre de tentatives
status            pending | syncing | failed | conflict | done
```

### 10.3 Cycle de synchronisation

```text
1. Vérifier qu'une session serveur peut être utilisée
2. Envoyer un lot limité d'opérations locales
3. Dédupliquer grâce à operationId
4. Appliquer chaque opération dans une transaction
5. Retourner versions et conflits
6. Marquer les opérations acceptées comme terminées
7. Télécharger les changements serveur après le dernier curseur
8. Mettre à jour IndexedDB
9. Informer l'interface du résultat exact
```

### 10.4 Reprise

- tentative immédiate au retour de l'application ;
- tentative lors du retour de la connexion ;
- reprise progressive avec délai croissant ;
- bouton manuel toujours disponible ;
- utilisation de Background Sync seulement comme amélioration, jamais comme unique mécanisme.

### 10.5 Politique de conflit

| Donnée | Politique initiale |
|---|---|
| Note personnelle | Conserver les deux versions et demander le choix si les deux ont changé |
| Métadonnée de ressource | Refuser l'écrasement silencieux et afficher le conflit |
| Séance non terminée | Comparer les versions ; demander le choix en cas de double modification |
| Séance terminée | L'état terminé est conservé sauf annulation explicite plus récente |
| Tentative de quiz validée | Immuable ; une nouvelle tentative possède un nouvel identifiant |
| Ressource commune | Version serveur administrateur prioritaire |
| Suppression | Conserver une pierre tombale jusqu'à synchronisation de tous les appareils concernés |

Aucun mécanisme « dernier arrivé gagne » n'est appliqué silencieusement aux notes personnelles.

---

## 11. Authentification et session

La Partie 4 implémente ce modèle ; les parcours et paramètres sont détaillés dans [`docs/COMPTES_ET_PROFILS.md`](./docs/COMPTES_ET_PROFILS.md) :

- nom d'utilisateur unique ;
- mot de passe haché avec Argon2id ;
- invitation à usage unique et durée limitée ;
- cookie de session `HttpOnly`, `Secure` en production et `SameSite` ;
- aucun jeton d'authentification dans `localStorage` ;
- rotation et révocation des sessions ;
- journalisation des réinitialisations administratives ;
- limitation des tentatives de connexion ;
- vérification serveur de chaque autorisation.

### Utilisation hors ligne

Après une connexion réussie sur un appareil personnel, l'élève peut consulter les données déjà présentes sur son appareil sans nouvelle requête réseau. Un cache minimal d'identité possède la même date d'expiration que la session serveur. L'application ne stocke jamais le mot de passe ni le jeton de session dans `localStorage` ou IndexedDB. Une reconnexion au serveur est nécessaire pour synchroniser après expiration ou révocation.

Sur un appareil partagé, la session serveur est limitée à 8 heures, le cookie n'est pas persistant et les données privées locales sont vidées à la connexion et à la déconnexion. Sur un appareil personnel, la session est limitée à 30 jours.

---

## 12. Modèle de données initial

### Identité

- `users`
- `invitations`
- `auth_sessions`
- `password_reset_codes`
- `student_profiles`

### Programme

- `subjects`
- `chapters`

### Ressources

- `resources`
- `resource_files`

### Organisation

- `revision_sessions`

### Évaluation

- `quizzes`
- `questions`
- `question_options`
- `quiz_attempts`
- `attempt_answers`

### Synchronisation

- `devices`
- `sync_mutations`
- `change_feed`

### Administration

- `admin_audit_logs`

Le diagramme et les relations détaillées seront représentés par le schéma Drizzle et les migrations SQL.

---

## 13. Contrats partagés

Le package `@bac-2027/contracts` contient uniquement :

- schémas Zod des requêtes et réponses ;
- types dérivés de ces schémas ;
- codes d'erreur stables ;
- constantes réellement communes.

Il ne contient :

- aucun secret ;
- aucun accès à PostgreSQL ;
- aucun code spécifique au navigateur ;
- aucune règle d'autorisation dépendant de la base.

Le navigateur doit valider les réponses reçues, même lorsque l'API est censée être fiable. Cela permet aussi de détecter un ancien client incompatible.

---

## 14. Variables d'environnement

Un fichier `.env.example` documente les paramètres sans contenir de valeur secrète.

Catégories :

- serveur : hôte, port et niveau de journalisation ;
- PostgreSQL : URL de connexion ;
- sessions : secrets et durées, à partir de la Partie 4 ;
- stockage objet : URL, région, conteneur et identifiants ;
- quotas : limites configurables ;
- frontend : URL publique uniquement si nécessaire.

Règles :

- `.env` est ignoré par Git ;
- les valeurs sont validées au démarrage ;
- une erreur de configuration arrête proprement le service ;
- les variables privées ne portent jamais le préfixe public Vite ;
- aucun secret n'est placé dans le code ou dans GitHub Actions.

---

## 15. Qualité et tests

### Contrôles exécutés à chaque changement

- formatage ;
- linting ;
- vérification TypeScript stricte ;
- tests unitaires ;
- tests de l'API par injection HTTP ;
- compilation de production ;
- vérification des migrations lorsque le schéma change.

### Pyramide de tests

1. **Unitaires :** règles métier, contrats et opérations de synchronisation.
2. **Intégration :** routes API, transactions PostgreSQL et autorisations.
3. **Composants :** formulaires et états hors ligne importants.
4. **Parcours :** connexion, ajout de ressource, synchronisation, planning et quiz.

Les tests de parcours complets seront renforcés au fur et à mesure des parties fonctionnelles.

---

## 16. Intégration continue

GitHub Actions doit exécuter :

1. installation reproductible avec `npm ci` ;
2. lint ;
3. format check ;
4. typecheck ;
5. tests ;
6. build web et API.

Une migration ou une version de dépendance cassant ces contrôles ne peut pas être considérée comme terminée.

---

## 17. Déploiement cible et budget

### MVP recommandé

- une petite instance applicative pour l'API et le reverse proxy ;
- PostgreSQL sur la même instance au tout début ou service géré si le budget le permet ;
- stockage objet facturé à l'usage pour les médias ;
- sauvegarde PostgreSQL quotidienne vers un emplacement séparé ;
- journaux limités et rotation automatique ;
- aucun Kubernetes pour le MVP.

### Évolution

L'API est sans état local durable. Elle pourra être répliquée lorsque la charge l'exigera. PostgreSQL et le stockage objet restent les sources partagées.

### Protection du budget

- quota faible et configurable au lancement ;
- compression des images ;
- pas de transcodage vidéo coûteux dans le premier MVP ;
- pas de téléchargement automatique des médias ;
- mesure réelle de l'utilisation avant d'augmenter les quotas ;
- alertes de stockage avant dépassement.

Le fournisseur définitif sera choisi avant le déploiement de production, sans rendre le code dépendant de son interface propriétaire.

---

## 18. Sauvegarde et restauration

Avant la production :

- sauvegarde PostgreSQL quotidienne ;
- conservation de plusieurs points de restauration ;
- versionnement ou corbeille temporaire des objets si disponible ;
- sauvegardes stockées hors de l'instance principale ;
- test réel de restauration ;
- documentation du délai et de la perte de données maximale acceptables.

Les données locales non encore synchronisées ne peuvent pas être restaurées depuis le serveur. L'interface doit donc toujours informer l'élève de leur état.

---

## 19. Sécurité de base

- HTTPS obligatoire en production ;
- en-têtes de sécurité ;
- validation systématique avec Zod ;
- requêtes SQL paramétrées via Drizzle ;
- autorisations côté serveur ;
- limitation de débit sur les routes sensibles ;
- journal de sécurité sans mot de passe ni contenu privé ;
- dépendances auditées ;
- fichiers servis comme contenus non exécutables ;
- politique de contenu restrictive ;
- sauvegardes chiffrées ou protégées par l'hébergeur.

La sécurité détaillée des comptes sera complétée en Partie 4.

---

## 20. Décisions explicitement reportées

- fournisseur d'hébergement ;
- nombre exact d'élèves pilotes ;
- quota final par élève ;
- durée de conservation des fichiers supprimés ;
- formats exacts de médias autorisés ;
- politique de session sur appareil partagé ;
- service éventuel d'analyse antivirus ;
- outil de suivi des erreurs de production ;
- liste officielle des matières et chapitres.

Ces décisions possèdent un emplacement architectural et ne nécessitent pas de réécriture du socle.

---

## 21. Critères de validation de la Partie 3

- [x] Le monorepo peut être installé avec `npm ci`.
- [x] La PWA démarre et appelle l'API via une URL relative.
- [x] L'API démarre et expose un endpoint de santé.
- [x] IndexedDB et l'outbox possèdent une structure initiale testée.
- [x] Le schéma PostgreSQL initial compile.
- [x] Une migration SQL initiale est générée.
- [x] Les variables d'environnement sont documentées sans secret.
- [x] Lint, format, typecheck, tests et builds passent.
- [x] L'intégration continue exécute les mêmes contrôles.
- [x] Les décisions d'architecture sont enregistrées.
- [x] Le guide d'installation permet une reprise sur une nouvelle machine.
- [x] Le porteur du projet approuve l'architecture et les fondations.

## 22. Rapport de validation technique

Contrôles exécutés le 15 octobre 2026 :

| Contrôle | Résultat |
|---|---|
| Installation propre avec `npm ci` | ✅ Réussie |
| Formatage Prettier | ✅ Réussi |
| Lint ESLint | ✅ Réussi |
| TypeScript strict | ✅ Réussi sur les trois workspaces |
| Tests automatisés | ✅ 10 tests réussis |
| Build API | ✅ Bundle Node.js généré |
| Build PWA | ✅ Service worker, manifeste et 12 éléments précachés |
| API `/api/health` | ✅ Réponse conforme au contrat partagé |
| Proxy web vers `/api/health` | ✅ URL relative fonctionnelle |
| Migration Drizzle | ✅ 17 tables, aucune dérive après régénération |
| Audit des dépendances de production | ✅ 0 vulnérabilité signalée |

L'environnement d'exécution ne fournit pas de serveur PostgreSQL ni Docker. La migration SQL a été générée et contrôlée par Drizzle, mais son application sur une instance PostgreSQL sera vérifiée dès qu'une instance sera configurée. Le fichier `compose.yaml` et le guide de développement préparent cette opération.

## 23. Approbation

- **Architecture approuvée :** 15 octobre 2026
- **Fondations techniques approuvées :** 15 octobre 2026
- **Réserve non bloquante :** appliquer la migration sur une instance PostgreSQL dès qu'elle est disponible.
- **Suivi sécurité :** surveiller la dépendance de développement Drizzle Kit ; aucune vulnérabilité de production n'est signalée.

La Partie 3 est désormais `✅ Terminée`.
