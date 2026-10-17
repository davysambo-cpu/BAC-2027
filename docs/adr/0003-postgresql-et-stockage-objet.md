# ADR 0003 — PostgreSQL et stockage objet séparé

- **Statut :** Acceptée
- **Date :** 15 octobre 2026
- **Mise à jour du flux pilote :** 17 octobre 2026

## Contexte

BAC-2027 gère des relations structurées et des médias potentiellement lourds. Le budget doit rester contrôlé alors que le nombre d'élèves et le volume exact sont inconnus.

## Décision

- PostgreSQL conserve les comptes, contenus structurés, métadonnées, versions et journaux.
- Les fichiers utilisent une interface de stockage dont l'implémentation de production est compatible S3.
- Pour les deux petites photos et le court audio du bilan, le navigateur téléverse vers l'API : elle contrôle la propriété, la signature binaire et le quota avant d'écrire l'objet.
- Pour de futurs documents ou vidéos lourds, un téléversement direct avec autorisation temporaire et confirmation restera possible.
- Les quotas et limites sont configurables.
- Le fournisseur définitif n'est pas codé en dur.

## Conséquences positives

- sauvegardes relationnelles plus petites ;
- médias servis et facturés séparément ;
- changement d'hébergeur possible ;
- contrôle fin des quotas.

## Compromis

- deux systèmes à sauvegarder et surveiller ;
- les médias courts transitent par l'API et consomment sa bande passante ;
- confirmation de téléversement ou reprise d'outbox nécessaire ;
- gestion des fichiers orphelins à prévoir.

## Alternatives écartées

- fichiers binaires dans PostgreSQL : sauvegardes et coûts rapidement élevés ;
- disque local unique en production : incompatible avec la réplication et fragile ;
- service propriétaire sans abstraction : risque de dépendance fournisseur.
