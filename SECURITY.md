# Sécurité — BAC-2027

## Signaler un problème

Ne publiez jamais de mot de passe, secret, fichier privé d'élève ou donnée personnelle dans une issue publique.

Décrivez le problème sans donnée réelle et indiquez :

- la partie concernée ;
- les étapes de reproduction ;
- l'impact possible ;
- la version ou le commit testé.

Le canal privé de signalement sera défini avant l'ouverture du MVP à des utilisateurs réels.

## Principes actuels

- aucun secret dans Git ;
- validation stricte des variables d'environnement ;
- frontend et API servis sous la même origine en production ;
- données privées contrôlées côté serveur ;
- fichiers stockés séparément des données relationnelles, dans un stockage S3 privé en production ;
- médias de bilan limités en taille et en nombre, vérifiés par signature binaire et accessibles uniquement à leur propriétaire ;
- clés de stockage générées par le serveur, réponses privées `no-store` et blocage de l'interprétation de type avec `nosniff` ;
- brouillons pédagogiques privés, réponses des fournisseurs strictement validées et corrections impossibles sans extrait original et citation ;
- historique d'auto-évaluation privé, toujours filtré par l'identifiant de l'élève et limité aux thèmes visibles de sa série ;
- écriture d'une révision protégée par un en-tête d'intention, une limite de débit, un UUID unique par élève et le rejet d'une heure d'exécution trop future ;
- auto-évaluations hors ligne conservées uniquement sur un appareil personnel et retirées de la file des opérations en attente après acquittement idempotent du serveur ;
- publication du corpus réservée à l'administration, protégée par un en-tête d'intention, un contrôle de version et un journal d'audit ;
- liens de citation limités à HTTP(S) et règles de contradiction limitées à des chaînes littérales non exécutables ;
- aucun envoi à un fournisseur externe tant qu'il n'est pas explicitement configuré ; le mode local déterministe reste le repli sans coût ;
- mots de passe hachés avec Argon2id ;
- jetons aléatoires conservés uniquement sous forme de condensat HMAC-SHA-256 ;
- sessions dans un cookie `HttpOnly` et `Secure` en production, `SameSite=Lax` par défaut ; le mode d'aperçu de développement peut utiliser un jeton de secours gardé uniquement en mémoire et est interdit en production ;
- invitations à usage unique et récupération administrée à durée limitée ;
- limitation du débit sur les routes publiques sensibles ;
- révocation des sessions lors d'une désactivation ou d'un changement de mot de passe ;
- distinction entre appareil personnel et partagé avec effacement local sur appareil partagé ;
- dépendances de production auditées.

Le détail du modèle de menace et des parcours de la Partie 4 se trouve dans [`docs/COMPTES_ET_PROFILS.md`](./docs/COMPTES_ET_PROFILS.md).

## État des dépendances au 17 octobre 2026

`npm audit --omit=dev` ne signale aucune vulnérabilité dans les dépendances de production.

L'audit complet signale quatre alertes modérées transitives dans l'outillage de migration `drizzle-kit`, liées à une ancienne version d'esbuild utilisée par un chargeur désormais déprécié. Cet outil est une dépendance de développement :

- il n'est pas inclus dans les builds web ou API de production ;
- son serveur de développement n'est jamais exposé publiquement ;
- aucun correctif sûr n'est proposé sans rétrograder fortement Drizzle Kit ;
- la dépendance devra être réévaluée à chaque mise à jour du lockfile.

Il ne faut pas exécuter `npm audit fix --force`, car la correction proposée remplace Drizzle Kit par une ancienne version incompatible avec le socle actuel.
