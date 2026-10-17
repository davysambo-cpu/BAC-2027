# Partie 4 — Comptes utilisateurs et profils

> **Date :** 16 octobre 2026  
> **Statut :** `✅ Approuvé`  
> **Périmètre :** comptes sur invitation, sessions, récupération administrée, profil minimal et autorisations

## 1. Décisions fonctionnelles

| Sujet | Règle retenue |
|---|---|
| Création d'un compte | L'administrateur remet un lien d'invitation temporaire à l'élève. Il n'existe aucune inscription publique. |
| Invitation | Jeton aléatoire à usage unique, valable 72 heures. Une nouvelle invitation révoque la précédente pour le même nom d'utilisateur. |
| Identifiant | Nom d'utilisateur unique, sans adresse e-mail ni numéro de téléphone. |
| Mot de passe | 10 à 128 caractères, au moins une lettre et un chiffre. |
| Récupération | Après vérification de l'identité hors plateforme, l'administrateur crée un code unique de 8 chiffres valable 30 minutes. |
| Appareil personnel | Cookie persistant et session serveur de 30 jours ; cache minimal du compte autorisé pour l'ouverture hors ligne. |
| Appareil partagé | Cookie de session non persistant, expiration serveur après 8 heures et effacement des données privées locales. |
| Profil élève | Nom affiché, nom d'utilisateur non modifiable, Série D et préférences de révision. |
| Rôles | `student` pour l'élève et `admin` pour l'administration. |

Les coordonnées personnelles, l'auto-inscription et la récupération par e-mail ou SMS restent hors du MVP.

## 2. Parcours disponibles

### Élève

1. ouvrir le lien `/activation?token=...` remis par l'administration ;
2. choisir un mot de passe et le type d'appareil ;
3. accéder à l'espace protégé ;
4. modifier son nom affiché et ses préférences ;
5. se déconnecter ;
6. si nécessaire, obtenir un code de l'administrateur puis utiliser `/recuperation`.

### Administration

1. se connecter avec un compte créé par la commande d'amorçage ;
2. ouvrir `/admin` ;
3. créer et remettre manuellement un lien d'invitation ;
4. consulter les comptes ;
5. créer un code de récupération pour un élève actif ;
6. désactiver ou réactiver un compte.

La désactivation révoque immédiatement les sessions actives. Un administrateur ne peut pas désactiver son propre compte.

## 3. Routes HTTP

| Méthode | Route | Accès | Fonction |
|---|---|---|---|
| `POST` | `/api/v1/auth/login` | Public, limité | Connexion par nom d'utilisateur et mot de passe |
| `POST` | `/api/v1/auth/activate` | Public, limité | Activation à usage unique |
| `POST` | `/api/v1/auth/reset/complete` | Public, limité | Utilisation du code et changement du mot de passe |
| `GET` | `/api/v1/auth/me` | Session | Utilisateur et session courants |
| `POST` | `/api/v1/auth/logout` | Session | Révocation de session et suppression du cookie |
| `GET` | `/api/v1/profile` | Session | Lecture du profil minimal |
| `PATCH` | `/api/v1/profile` | Session | Mise à jour du nom affiché et des préférences |
| `GET` | `/api/v1/admin/users` | Administrateur | Liste des comptes |
| `POST` | `/api/v1/admin/invitations` | Administrateur | Création d'une invitation |
| `POST` | `/api/v1/admin/reset-codes` | Administrateur | Création d'un code temporaire |
| `PATCH` | `/api/v1/admin/users/:id/status` | Administrateur | Activation ou désactivation |

Toutes les entrées sont validées par les contrats Zod partagés. Les erreurs utilisent un code métier stable et n'incluent ni pile d'exécution, ni hachage, ni jeton secret.

## 4. Mesures de sécurité

- mots de passe hachés avec **Argon2id** (`19 456 KiB`, 2 itérations, parallélisme 1) ;
- jetons de session et d'invitation générés par le générateur cryptographique de Node.js ;
- seuls leurs condensats HMAC-SHA-256 sont stockés en base ;
- cookie `HttpOnly`, limité au chemin racine et `Secure` en production ; `SameSite=Lax` sous la même origine, ou `SameSite=None; Partitioned` uniquement pour un aperçu HTTPS intégré à un site tiers ;
- secours `Authorization` éphémère, gardé en mémoire uniquement lorsque le mode d'aperçu de développement est explicitement actif et interdit en production ;
- comparaison de mot de passe factice pour réduire l'énumération des noms d'utilisateur ;
- réponses identiques pour un utilisateur inconnu et un mauvais mot de passe ;
- limitation du débit sur la connexion, l'activation et la récupération ;
- cinq tentatives au maximum pour un code de récupération actif ;
- révocation des anciennes sessions après changement de mot de passe ;
- contrôle du rôle côté API, indépendamment de l'interface ;
- secrets et pilote PostgreSQL vérifiés au démarrage en production.

## 5. Données et migrations

La migration `apps/api/drizzle/0001_ambiguous_chameleon.sql` ajoute :

- le type `session_device_type` ;
- la table `auth_sessions` ;
- la table `password_reset_codes` ;
- les champs de révocation d'invitation et de changement de mot de passe ;
- les clés étrangères et index associés.

Le développement et les tests utilisent PGlite par défaut. Les migrations sont appliquées automatiquement au démarrage de PGlite. La production refuse de démarrer sans `DATABASE_DRIVER=postgres`, une URL PostgreSQL et un secret d'authentification non générique.

`EMBEDDED_PREVIEW_MODE=true` est réservé au développement dans une iframe tierce qui bloque les cookies, comme l'aperçu Arena. Il tente d'abord un cookie sécurisé et partitionné puis fournit, pour cette session seulement, un jeton de secours conservé **uniquement en mémoire JavaScript** et envoyé dans l’en-tête interne `X-BAC-Preview-Session`. Un rechargement l'efface. Il n'est jamais placé dans `localStorage`, `sessionStorage` ou IndexedDB, et la configuration refuse explicitement ce mode en production. La valeur normale pour une application web et une API sous la même origine reste `false` avec cookie `HttpOnly` uniquement.

## 6. Amorcer le premier administrateur

Définir les trois valeurs uniquement dans l'environnement de la commande :

```bash
ADMIN_USERNAME=admin \
ADMIN_DISPLAY_NAME="Administration BAC-2027" \
ADMIN_PASSWORD="un-mot-de-passe-long-et-unique" \
npm run admin:create
```

La commande ne remplace jamais un compte existant et n'affiche pas le mot de passe. En production, exécuter cette opération depuis un poste administré, puis retirer la valeur de l'historique du terminal si nécessaire.

## 7. Fonctionnement hors ligne des comptes

- Le service worker conserve le squelette de l'application.
- Sur un appareil personnel, un cache IndexedDB minimal contient l'utilisateur, ses préférences, le type de session et son expiration. Il permet d'ouvrir l'espace déjà chargé lorsque le réseau est absent.
- Ce cache ne remplace pas la session serveur et cesse d'être accepté à son expiration.
- Sur un appareil partagé, aucune authentification n'est conservée dans IndexedDB et les tables privées locales sont vidées lors de la connexion et de la déconnexion.
- Les actions d'administration, l'activation et la récupération exigent toujours une connexion au serveur.

## 8. Vérification

Le test d'intégration PGlite couvre notamment :

- connexion administrateur ;
- non-divulgation des identifiants valides ;
- création puis remplacement d'une invitation ;
- rejet du premier lien révoqué ;
- activation et création du profil Série D ;
- refus d'une route administrateur à un élève ;
- persistance des préférences ;
- code de récupération erroné puis valide ;
- révocation de l'ancienne session ;
- désactivation, révocation immédiate et réactivation du compte ;
- journal d'audit sans code ni jeton en clair ;
- cookies distincts pour les appareils personnels et partagés.

Exécuter tous les contrôles avec :

```bash
npm run check
```

## 9. Validation humaine

Le 16 octobre 2026, le porteur du projet a réussi la connexion élève dans l'aperçu responsive, constaté l'ouverture du tableau de bord personnel puis demandé de poursuivre. Les autres parcours sensibles restent couverts par le test d'intégration PGlite. La Partie 4 est donc approuvée dans `PLAN_PROJET.md`.
