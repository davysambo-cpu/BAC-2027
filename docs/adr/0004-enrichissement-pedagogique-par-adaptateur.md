# ADR 0004 — Enrichissement pédagogique par adaptateur validé

- **Statut :** Acceptée
- **Date :** 17 octobre 2026

## Contexte

BAC-2027 doit transformer progressivement le bilan réel de l'élève en cours structuré, expliqué et sourcé. Les fournisseurs de génération, de recherche, d'OCR ou de transcription ne sont pas encore choisis, peuvent être payants et peuvent produire des informations erronées. Le texte original ne doit jamais être écrasé.

## Décision

- Le domaine dépend d'une interface `EnrichmentProvider`, pas d'un SDK propriétaire.
- Un fournisseur `local-outline` gratuit et déterministe structure uniquement les données déjà saisies et signale l'absence de vérification factuelle.
- Chaque résultat externe est validé par un contrat strict avant persistance.
- Le bilan original reste dans une entité distincte et immuable pendant l'enrichissement.
- Chaque brouillon conserve la version du bilan, le fournisseur, le modèle et la version de consigne.
- Toute correction doit référencer un extrait exact de l'original et au moins une citation existante.
- L'élève accepte, refuse ou transmet au professeur chaque correction avant de pouvoir valider le cours.
- Les appels sont dédupliqués pour une même version du bilan et le fournisseur local reste le repli lorsque l'enrichissement externe est absent.

## Conséquences positives

- aucune promesse trompeuse d'intelligence ou de gratuité ;
- changement de fournisseur sans réécriture du parcours métier ;
- tests déterministes sans appel payant ;
- traçabilité des sources, modèles et décisions ;
- conservation garantie des notes originales de l'élève.

## Compromis

- le mode local organise le bilan mais n'ajoute pas encore d'explications factuelles ;
- un fournisseur externe devra être configuré, plafonné et supervisé pour aller plus loin ;
- la validation stricte peut rejeter une réponse partiellement utile mais non conforme ;
- la qualité pédagogique dépendra du corpus approuvé et de la revue humaine.

## Alternatives écartées

- appeler directement un modèle depuis le navigateur : exposition de clés et absence de contrôle central ;
- coder un fournisseur unique dans le domaine : dépendance technique et commerciale ;
- appliquer automatiquement les corrections : risque de remplacer une note juste par une proposition erronée ;
- présenter le catalogue comme preuve factuelle : il établit un thème et une provenance, pas le contenu du cours.
