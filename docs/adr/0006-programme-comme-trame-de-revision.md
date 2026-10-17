# ADR 0006 — Programme comme trame d'un carnet de révision personnel

- **Statut :** Acceptée
- **Date :** 17 octobre 2026

## Contexte

Le porteur du projet dispose du programme officiel, mais ne pourra pas obtenir un corpus complet de cours officiels. Attendre ces documents empêcherait BAC-2027 d'être utile pendant l'année scolaire et avant les révisions finales de juillet 2027. Inversement, transformer les seuls intitulés du programme en cours factuels conduirait à inventer des connaissances ou à masquer l'absence de source.

## Décision

- Le programme sert de liste de contrôle : il définit les thèmes à couvrir, sans certifier le contenu d'un cours.
- La matière de révision principale reste privée et provient de ce que l'élève reçoit réellement en classe : bilans, médias, cours personnels validés et décisions sur les corrections.
- Chaque thème visible agrège le nombre de bilans, les cours actuellement validés et les révisions effectuées.
- Après une révision, l'élève choisit une auto-évaluation parmi `difficult`, `fragile`, `comfortable` et `mastered`, avec une note facultative.
- Chaque auto-évaluation est ajoutée à un journal privé append-only ; elle ne remplace pas les précédentes.
- Sur un appareil personnel, une auto-évaluation peut être appliquée localement puis synchronisée à la reconnexion ; son UUID client rend les répétitions idempotentes.
- Un rappel est proposé après respectivement 1, 3, 7 ou 21 jours. Ces intervalles organisent le travail mais ne constituent ni une note ni une preuve de maîtrise.
- L'horizon affiché est configurable par mois et vaut initialement `2027-07`. Il ne prétend pas fixer la date exacte de l'examen.
- Le corpus commun approuvé reste disponible comme enrichissement facultatif, sans bloquer l'utilisation lorsque ce corpus est vide.

## Conséquences positives

- la plateforme apporte une valeur immédiate sans documents de cours supplémentaires ni API payante ;
- l'élève accumule une mémoire de révision fidèle à son année scolaire ;
- les lacunes du programme, les notes à structurer et les rappels dus deviennent visibles tôt ;
- les futures Parties 6 et 7 peuvent réutiliser ce suivi pour le planning et les quiz ;
- aucune connaissance factuelle n'est déduite d'un simple intitulé du programme.

## Compromis

- l'efficacité dépend de la régularité et de l'honnêteté de l'auto-évaluation ;
- le rythme 1/3/7/21 jours est une heuristique simple qui devra être mesurée pendant le pilote ;
- une auto-évaluation encore présente uniquement dans l'outbox peut être perdue si les données locales du navigateur sont effacées avant la reconnexion ;
- un programme de thèmes ne remplace pas la validation pédagogique d'un cours ou d'une correction.

## Alternatives écartées

- attendre un corpus officiel complet : délai indéterminé et absence de valeur avant juillet 2027 ;
- générer automatiquement un cours depuis chaque intitulé : risque pédagogique et absence de source ;
- marquer automatiquement un thème comme maîtrisé après lecture : mesure trompeuse ;
- ne conserver que le dernier niveau : perte de l'historique utile pour suivre la progression.
