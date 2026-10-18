# Partie 6 — Tableau de bord et planning de révision

**Statut :** premier incrément implémenté, recette en attente
**Date :** 17 octobre 2026

## Objectif confirmé

Le planning transforme les priorités du carnet personnel en séances courtes et réalistes. Il ne doit pas créer un calendrier complexe ni prétendre mesurer automatiquement le travail : l'élève planifie, ajuste et valide lui-même ce qu'il a réellement fait.

Le premier incrément réutilise trois éléments déjà disponibles :

- les matières et thèmes visibles du programme ;
- les rappels dus et les cours personnels prêts issus de la Partie 5 ;
- l'objectif quotidien configurable dans le profil, fixé à 45 minutes par défaut.

## Parcours livré

Depuis `/planning`, un élève peut :

1. créer une séance générale ou la relier à une matière et à un thème visible ;
2. choisir une date, une heure et une durée de 15 à 120 minutes dans l'interface ;
3. conserver une consigne personnelle facultative ;
4. modifier la séance ;
5. la marquer terminée ou la rouvrir ;
6. la supprimer après une confirmation explicite ;
7. distinguer les séances en retard, celles du jour, les séances à venir et l'historique récent.

Le tableau de bord affiche désormais l'objectif accompli aujourd'hui, les séances à replanifier et la prochaine séance. Son action principale privilégie un retard ou une séance du jour avant les autres suggestions du carnet.

## Persistance et confidentialité

Les routes privées sont :

- `GET /api/v1/planning/sessions` ;
- `POST /api/v1/planning/sessions` ;
- `PATCH /api/v1/planning/sessions/:sessionId` ;
- `DELETE /api/v1/planning/sessions/:sessionId`.

Chaque mutation exige `X-BAC-Planning: 1`. Le serveur filtre toujours par l'élève authentifié, vérifie que la matière et le thème sont visibles dans sa série et applique un contrôle de version optimiste. Les créations utilisent un UUID client ; les répétitions de création, de mise à jour déjà appliquée et de suppression sont idempotentes.

La migration `0005_greedy_catseye.sql` relie la table existante `revision_sessions` à un thème du catalogue. La suppression reste logique côté serveur afin de préserver la cohérence de synchronisation.

## Fonctionnement hors ligne

Sur un appareil personnel, Dexie version 7 conserve les séances et l'outbox :

- création, modification, validation et suppression sont visibles immédiatement ;
- les opérations d'une même séance sont rejouées dans l'ordre création → mise à jour → suppression ;
- plusieurs modifications locales encore en attente sont compactées vers le dernier état souhaité ;
- une réponse perdue ne duplique pas la séance ;
- un échec reste signalé « À resynchroniser » pour une prochaine reconnexion.

Un appareil partagé utilise directement l'API et ne conserve aucune copie privée persistante du planning.

## Choix de périmètre

- la vue principale est une liste chronologique responsive, plus lisible qu'une grille mensuelle sur petit téléphone ;
- aucune notification système, aucun SMS et aucun service externe ne sont ajoutés dans ce premier incrément ;
- l'objectif quotidien reste une préférence explicite de l'élève et non une obligation ou une note ;
- les durées enregistrées sont des durées prévues, sauf lorsqu'une séance est explicitement déclarée terminée ;
- les rappels pédagogiques du carnet restent distincts des séances choisies dans le planning.

## Validation automatisée

Les tests couvrent :

- propriété privée entre deux élèves ;
- thème d'une autre série refusé ;
- en-tête d'intention obligatoire ;
- création idempotente ;
- modification et suppression idempotentes après perte de réponse ;
- conflit de version explicite ;
- conservation de l'heure de fin lors de l'édition d'une séance terminée ;
- création, validation et suppression depuis l'interface ;
- enchaînement hors ligne et rejeu de l'outbox ;
- conservation d'une opération après échec réseau.

## Suite de la Partie 6

1. réaliser la recette responsive du planning avec peu puis beaucoup de séances ;
2. vérifier le parcours hors ligne dans l'aperçu réel ;
3. ajuster la densité, les libellés et les priorités selon la recette ;
4. décider si une vue hebdomadaire apporte une valeur suffisante au MVP ;
5. valider la Partie 6 avant d'ouvrir les quiz de la Partie 7.
