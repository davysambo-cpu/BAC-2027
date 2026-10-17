# ADR 0002 — Synchronisation offline-first avec outbox

- **Statut :** Acceptée
- **Date :** 15 octobre 2026

## Contexte

Les élèves doivent pouvoir créer des notes, séances et tentatives avec une connexion faible ou absente. Une coupure ne doit pas entraîner de perte silencieuse.

## Décision

- IndexedDB avec Dexie conserve les données locales.
- Toute modification synchronisable produit une opération d'outbox avec UUID.
- L'API déduplique les opérations et contrôle `baseVersion`.
- Le serveur expose ensuite un flux de changements par curseur.
- Les conflits importants sont visibles ; les notes ne sont jamais écrasées silencieusement.
- Background Sync est une amélioration facultative, avec reprise au premier plan obligatoire.

## Conséquences positives

- l'interface répond immédiatement ;
- le travail reste disponible sans réseau ;
- les opérations sont rejouables et idempotentes ;
- les erreurs sont traçables.

## Compromis

- complexité supérieure à une application uniquement connectée ;
- nécessité de versionner les entités ;
- tests de concurrence indispensables ;
- espace local dépendant des limites du navigateur.

## Alternatives écartées

- cache HTTP seul : insuffisant pour les écritures ;
- dernier arrivé gagnant partout : risque de perte de notes ;
- dépendance exclusive à Background Sync : support navigateur incomplet.
