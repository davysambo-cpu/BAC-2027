# ADR 0001 — Monorepo TypeScript modulaire

- **Statut :** Acceptée
- **Date :** 15 octobre 2026

## Contexte

BAC-2027 doit fournir une PWA hors ligne, une API, une administration et des contrats cohérents entre le navigateur et le serveur. L'équipe doit avancer rapidement tout en conservant la possibilité de séparer les services plus tard.

## Décision

Utiliser un monorepo npm workspaces avec :

- React/Vite dans `apps/web` ;
- Fastify dans `apps/api` ;
- contrats Zod partagés dans `packages/contracts` ;
- TypeScript strict dans tous les espaces.

## Conséquences positives

- un seul langage principal ;
- contrats et types partagés ;
- installation et contrôles centralisés ;
- déploiement séparé du web et de l'API toujours possible ;
- architecture compréhensible sans infrastructure complexe.

## Compromis

- le frontend et le backend sont versionnés ensemble ;
- les dépendances Node.js restent nombreuses ;
- les limites entre modules doivent être respectées par convention et tests.

## Alternatives écartées

- Next.js unifié : moins de contrôle explicite sur le client hors ligne ;
- Django + React : deux écosystèmes et contrats plus difficiles à partager ;
- microservices : coût d'exploitation et complexité injustifiés pour le MVP.
