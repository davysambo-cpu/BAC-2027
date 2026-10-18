# ADR 0007 — Planning privé sous forme de liste hors ligne

- **Statut :** Acceptée
- **Date :** 17 octobre 2026

## Contexte

La Partie 5 sait identifier les thèmes dus et les cours prêts, mais un rappel pédagogique ne réserve pas à lui seul un moment de travail. La Partie 6 doit aider l'élève à transformer ces priorités en séances réalistes sur un téléphone, y compris avec une connexion instable. Une grille mensuelle dense et des notifications externes ajouteraient de la complexité avant d'avoir mesuré les usages du pilote.

## Décision

- Une séance est privée et appartient à un seul élève.
- Elle peut être générale ou liée à une matière et à un thème visible du programme.
- Le MVP utilise une liste chronologique avec quatre groupes : en retard, aujourd'hui, à venir et historique récent.
- L'élève choisit la date, l'heure, la durée prévue et une consigne facultative, puis déclare explicitement la séance terminée.
- L'objectif quotidien reste la préférence de profil existante ; ce n'est ni une note ni une obligation.
- Chaque création porte un UUID client. Les modifications utilisent un contrôle de version et reconnaissent la répétition d'un état déjà appliqué.
- Sur appareil personnel, toutes les mutations sont optimistes et passent par l'outbox Dexie ; sur appareil partagé, elles exigent une connexion et ne persistent pas localement.
- Aucun SMS, courriel, push système ni calendrier externe n'est ajouté dans le premier incrément.

## Conséquences positives

- le parcours reste rapide et lisible sur un petit écran ;
- aucune API payante n'est nécessaire ;
- une coupure réseau ne fait pas perdre une séance ;
- le tableau de bord peut prioriser les retards et le travail du jour ;
- les séances restent reliées à la mémoire pédagogique construite pendant la Partie 5.

## Compromis

- la liste ne donne pas encore une vue globale d'une semaine ou d'un mois ;
- aucune notification ne rappelle une séance lorsque l'application est fermée ;
- la durée enregistrée reste une durée prévue, pas un chronométrage automatique ;
- un conflit entre deux appareils doit rester explicite au lieu de fusionner silencieusement deux horaires.

## Alternatives écartées

- calendrier mensuel obligatoire : trop dense pour le téléphone et inutile pour un premier parcours ;
- génération automatique de tout le planning : elle retirerait à l'élève la maîtrise de ses contraintes réelles ;
- notifications externes dès le MVP : coût opérationnel, permissions et risque de surcharge ;
- stockage uniquement serveur : perte du parcours sur connexion instable ;
- dernier changement gagnant sans version : risque d'écraser silencieusement une modification faite sur un autre appareil.
