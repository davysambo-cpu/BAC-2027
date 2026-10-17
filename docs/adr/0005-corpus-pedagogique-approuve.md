# ADR 0005 — Corpus pédagogique approuvé et publication explicite

- **Statut :** Acceptée
- **Date :** 17 octobre 2026

## Contexte

Le fournisseur local structure les notes sans inventer de faits, mais BAC-2027 doit aussi expliquer les notions et proposer certaines corrections. Le catalogue fourni indique quels thèmes travailler ; il ne contient pas à lui seul les connaissances permettant d'affirmer qu'une phrase est juste ou fausse. Une génération externe non relue ne doit pas devenir silencieusement une ressource commune.

## Décision

- Les connaissances factuelles résident dans des fiches séparées du catalogue et des bilans personnels.
- Une seule fiche est associée à une entrée précise du catalogue ; elle suit les états `draft`, `published` et `archived` et un numéro de version croissant.
- Seule l'administration peut créer, modifier, publier ou archiver une fiche. Les écritures utilisent un contrôle de version optimiste, un en-tête d'intention et un journal d'audit.
- Le corpus est vide par défaut. Aucun seed et aucun fournisseur externe ne publient automatiquement une connaissance.
- Le fournisseur `curated-corpus` ne récupère que la fiche `published` liée au thème exact du bilan. En son absence, il délègue à `local-outline`.
- Chaque explication conserve la citation administrée, son niveau de confiance, son extrait justificatif et sa date de consultation.
- Une règle de correction contient une expression littérale, le remplacement proposé et une explication. Elle ne produit une correction que lorsque l'expression est retrouvée telle quelle dans le résumé original, sans exécuter de motif dynamique.
- Toute correction conserve l'extrait original et une citation ; l'élève doit encore l'accepter ou la refuser.
- Le modèle d'une génération sourcée inclut la version de la fiche. Une actualisation explicite crée une nouvelle génération seulement si le fournisseur ou cette version a changé.

## Conséquences positives

- aucune connaissance non approuvée n'est présentée comme factuelle ;
- les contenus communs sont dissociés des données privées des élèves ;
- la provenance, l'auteur administratif et les modifications restent traçables ;
- la publication d'une fiche enrichit immédiatement les bilans du thème sans modifier l'application ;
- un futur fournisseur externe peut préparer des propositions sans contourner la revue humaine.

## Compromis

- la couverture factuelle progresse au rythme de la constitution manuelle du corpus ;
- une règle littérale ne comprend pas une paraphrase et peut manquer une erreur formulée autrement ;
- une seule fiche par thème simplifie le MVP mais ne couvre pas encore les variantes de niveau ou d'approche ;
- la version courante de la fiche est conservée en base, tandis que les générations antérieures préservent le contenu déjà présenté à l'élève.

## Alternatives écartées

- utiliser le libellé du catalogue comme preuve factuelle : la provenance d'un thème ne valide pas une explication ;
- publier automatiquement la réponse d'un modèle : risque pédagogique, absence de responsabilité et coût non maîtrisé ;
- détecter les erreurs par expressions régulières administrables : surface d'abus et comportement difficile à expliquer ;
- remplacer un ancien brouillon lors d'une mise à jour : perte de traçabilité et violation de la conservation des versions.
