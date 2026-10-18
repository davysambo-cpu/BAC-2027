# Plan directeur du projet BAC-2027

> **Document de référence du projet**  
> Ce fichier sert à conserver le découpage du projet, suivre son avancement et reprendre le travail sans oublier les décisions déjà prises.

## Règles de travail

1. Le projet est réalisé dans l'ordre des **8 parties** décrites ci-dessous.
2. Une partie ne passe à `✅ Terminée` qu'après validation de ses critères de réussite.
3. Nous ne commençons pas la partie suivante sans avoir vérifié les livrables de la partie en cours.
4. Toute décision importante doit être ajoutée au **Journal des décisions** situé à la fin de ce document.
5. Au début de chaque nouvelle session de travail, relire ce fichier et vérifier la prochaine action.
6. À la fin de chaque session, mettre à jour le statut, les cases cochées et la prochaine action.

## Légende des statuts

- `⬜ À faire`
- `🟨 En cours`
- `✅ Terminée`
- `⛔ Bloquée`

## Tableau de suivi général

| Nº | Partie | Statut | Validation |
|---:|---|---|---|
| 1 | Cadrage et cahier des charges | ✅ Terminée | Validée le 2026-10-15 |
| 2 | Expérience utilisateur et design | ✅ Terminée | Validée le 2026-10-15 |
| 3 | Architecture et fondations techniques | ✅ Terminée | Validée le 2026-10-15 |
| 4 | Comptes utilisateurs et profils | ✅ Terminée | Validée le 2026-10-16 |
| 5 | Matières et contenus pédagogiques | ✅ Terminée | Validée le 2026-10-17 |
| 6 | Tableau de bord et planning de révision | 🟨 En cours | Premier incrément à réaliser |
| 7 | Quiz, évaluations et suivi de progression | ⬜ À faire | Non validée |
| 8 | Qualité, déploiement et maintenance | ⬜ À faire | Non validée |

---

# Partie 1 — Cadrage et cahier des charges

**Statut :** `✅ Terminée`

## Objectif

Définir précisément ce qu'est BAC-2027, à qui il s'adresse et ce que doit contenir sa première version. Cette étape évite de développer des fonctionnalités inutiles ou contradictoires.

## Travail à réaliser

- [x] Définir le problème que BAC-2027 doit résoudre.
- [x] Identifier les utilisateurs visés : élèves et administrateurs dans le MVP.
- [x] Déterminer le pays, le programme scolaire et la série pilote : Burkina Faso, Série D.
- [x] Planifier la validation des matières avec le document officiel que le porteur du projet fournira avant la Partie 5.
- [x] Définir les besoins principaux de chaque type d'utilisateur.
- [x] Classer les fonctionnalités : indispensables, utiles et futures.
- [x] Délimiter le **MVP** (première version utilisable).
- [x] Recenser les contraintes : langue, connexion internet, mobile, budget et calendrier.
- [x] Écrire les principales histoires utilisateur.
- [x] Définir les indicateurs permettant de juger la réussite du projet.

## Livrables

- Un cahier des charges validé.
- Une liste priorisée des fonctionnalités.
- Une définition claire du MVP.
- Une liste des utilisateurs et de leurs besoins.
- Une liste des contraintes et hypothèses du projet.

## Critères de validation

- [x] Le public cible est clairement identifié.
- [x] Le périmètre de la première version est sans ambiguïté.
- [x] Chaque fonctionnalité du MVP répond à un besoin identifié.
- [x] Les fonctionnalités hors périmètre sont consignées pour plus tard.
- [x] La validation officielle des matières est programmée avant la Partie 5 et documentée comme réserve non bloquante.
- [x] Le cahier des charges est approuvé avant de concevoir l'interface.

---

# Partie 2 — Expérience utilisateur et design

**Statut :** `✅ Terminée`

## Objectif

Transformer les besoins validés en une navigation simple, une structure de pages cohérente et une identité visuelle adaptée aux élèves.

## Travail à réaliser

- [x] Construire l'arborescence du site ou de l'application.
- [x] Définir les parcours principaux de chaque utilisateur.
- [x] Lister les pages et préciser le rôle de chacune.
- [x] Réaliser les wireframes des écrans essentiels.
- [x] Définir l'identité visuelle : couleurs, typographies, espacements et icônes.
- [x] Concevoir les composants réutilisables : boutons, formulaires, cartes et menus.
- [x] Prévoir l'affichage sur téléphone, tablette et ordinateur.
- [x] Vérifier l'accessibilité : contraste, taille des textes, clavier et libellés.
- [x] Créer un prototype du parcours principal.

## Livrables

- Une arborescence validée.
- Les parcours utilisateurs principaux.
- Les wireframes des pages essentielles.
- Un mini design system.
- Un prototype responsive validé.

## Critères de validation

- [x] Un élève peut comprendre la navigation sans explication complexe.
- [x] Toutes les fonctionnalités du MVP ont une place dans l'interface.
- [x] Le design fonctionne d'abord sur mobile, puis sur les grands écrans.
- [x] Les composants principaux sont cohérents et réutilisables.
- [x] Le prototype est approuvé avant l'implémentation complète.

---

# Partie 3 — Architecture et fondations techniques

**Statut :** `✅ Terminée`

## Objectif

Mettre en place une base technique fiable, maintenable et adaptée au périmètre validé dans les parties 1 et 2.

## Travail à réaliser

- [x] Choisir la pile technique à partir des besoins réels.
- [x] Définir l'architecture du frontend, du backend et de la base de données.
- [x] Initialiser le projet et organiser les dossiers.
- [x] Configurer les variables d'environnement sans enregistrer de secrets dans Git.
- [x] Installer le formatage, le linting et les contrôles de types.
- [x] Concevoir le premier schéma de données.
- [x] Préparer les migrations et les données de démonstration.
- [x] Mettre en place les premiers tests automatisés.
- [x] Configurer l'intégration continue.
- [x] Documenter l'installation et les commandes de développement.

## Livrables

- Une application exécutable localement.
- Une architecture de dossiers documentée.
- Un schéma de données initial.
- Une configuration de qualité de code fonctionnelle.
- Un guide d'installation à jour.

## Critères de validation

- [x] Le projet peut être installé en suivant uniquement la documentation.
- [x] L'application démarre sans erreur.
- [x] Les contrôles de qualité et les tests de base passent.
- [x] Aucun secret n'est présent dans le dépôt.
- [x] L'architecture permet d'ajouter les prochaines fonctionnalités sans duplication majeure.
- [x] L'architecture et les fondations sont approuvées par le porteur du projet.

---

# Partie 4 — Comptes utilisateurs et profils

**Statut :** `✅ Terminée`

## Objectif

Permettre aux utilisateurs de disposer d'un espace personnel sécurisé et adapté à leur rôle, si l'authentification est retenue dans le MVP.

## Travail à réaliser

- [x] Implémenter l'activation sur invitation et la connexion.
- [x] Prévoir la déconnexion et la récupération administrée du compte.
- [x] Définir les rôles et leurs autorisations.
- [x] Créer et modifier le profil utilisateur minimal.
- [x] Enregistrer les préférences utiles : Série D, objectif quotidien, Wi-Fi et mouvements réduits.
- [x] Protéger les pages et les actions privées.
- [x] Valider les formulaires et afficher des messages d'erreur compréhensibles.
- [x] Appliquer les règles essentielles de sécurité et de confidentialité.
- [x] Tester les parcours d'authentification avec une base PGlite réelle.

## Livrables

- Un parcours d'inscription et de connexion fonctionnel.
- Une gestion claire des rôles et autorisations.
- Une page de profil utilisable.
- Des routes et données privées correctement protégées.
- Des tests couvrant les parcours sensibles.

## Critères de validation

- [x] Un nouvel utilisateur peut activer son compte sur invitation et accéder à son espace.
- [x] Un utilisateur non autorisé ne peut pas accéder aux données privées.
- [x] Les erreurs n'exposent aucune information sensible.
- [x] Le profil conserve correctement les préférences enregistrées.
- [x] Les parcours principaux sont approuvés après recette visuelle dans l'aperçu responsive.

---

# Partie 5 — Matières et contenus pédagogiques

**Statut :** `✅ Terminée`

> **Base de travail :** le porteur ne pourra pas obtenir un corpus complet de cours officiels et demande de se contenter du programme officiel dont il dispose. Les neuf impressions déjà inventoriées en restent la transcription de travail avec leur provenance inchangée. Le programme définit **quoi couvrir** ; les bilans réellement reçus en classe, les cours personnels validés et les révisions successives constituent progressivement **ce que l'élève apprend**. L'absence d'autres documents officiels ne bloque plus le MVP.

## Objectif

Organiser et rendre accessibles les ressources nécessaires aux révisions : matières, chapitres, leçons, fiches, exercices et annales selon le périmètre du MVP.

## Travail à réaliser

- [x] Importer le catalogue initial avec son origine, sa date et son statut de validation.
- [x] Modéliser les séries, matières, chapitres et types de ressources.
- [x] Permettre à l'élève d'enregistrer un bilan quotidien rattaché à une matière et à un thème du catalogue.
- [x] Conserver sans l'écraser le texte original saisi par l'élève.
- [x] Produire à partir du bilan un brouillon structuré avec explications factuelles, sources et points à vérifier lorsqu'une fiche approuvée couvre le thème.
- [x] Livrer l'adaptateur local déterministe, la persistance versionnée et l'interface de brouillon/sources/corrections sans prétendre effectuer une vérification factuelle.
- [x] Signaler les contradictions prévues par une fiche approuvée et faire valider toute correction avant qu'elle remplace une information saisie.
- [x] Permettre l'ajout progressif de fiches communes vérifiées sans rendre le remplissage du corpus bloquant pour le MVP.
- [x] Transformer le programme en liste de contrôle personnelle : notes collectées, cours validés, révisions et maîtrise déclarée par thème.
- [x] Espacer les rappels de révision selon une auto-évaluation simple et conserver l'historique privé jusqu'à juillet 2027.
- [x] Créer la navigation entre les matières et les thèmes du catalogue.
- [x] Afficher le bilan original et son brouillon de cours de manière distincte, lisible et responsive.
- [x] Ajouter la recherche et le filtre par matière nécessaires au premier catalogue.
- [x] Finaliser le transfert serveur privé des photos et audios autorisés, avec reprise de l'outbox.
- [x] Permettre à l'administration de créer, modifier, publier et archiver les fiches de savoir avec contrôle de version.
- [x] Définir une méthode de vérification pédagogique des contenus et une politique de sources fiables.
- [x] Garder les contenus personnels privés ; seule l'administration peut publier une fiche dans le corpus commun.
- [x] Afficher clairement la source et le niveau de validation d'une entrée du catalogue.
- [x] Finaliser et tester la consultation et la saisie hors ligne des bilans, cours mis en cache et auto-évaluations pour les connexions lentes.

## Livrables

- Un catalogue de matières et chapitres fonctionnel, avec provenance et statut de validation.
- Un parcours « bilan du jour → brouillon de cours → vérification par l'élève ».
- Un carnet privé par thème avec progression, auto-évaluations et prochains rappels.
- Des pages de contenu lisibles et responsive.
- Un système de recherche ou de filtrage adapté.
- Un processus documenté d'ajout, de correction et de validation des ressources.
- Le programme initial traçable, complété au besoin par un corpus commun administré et facultatif.

## Critères de validation

- [x] Un élève trouve rapidement une ressource liée à sa série et à sa matière.
- [x] La hiérarchie matière → section du programme → ressource est cohérente.
- [x] Un bilan quotidien est sauvegardé même si la connexion est interrompue.
- [x] Le brouillon généré distingue le texte de l'élève, les explications ajoutées, les sources et les corrections proposées.
- [x] Aucune correction automatique ne supprime silencieusement le texte original de l'élève.
- [x] L'élève voit les thèmes commencés, les cours prêts, les révisions dues et les notions qu'il estime maîtriser.
- [x] Les contenus sont lisibles sur téléphone.
- [x] Les ressources affichent les informations nécessaires sur leur origine et leur niveau de validation.
- [x] L'ajout ou la correction d'un contenu ne nécessite pas de modifier toute l'application.

---

# Partie 6 — Tableau de bord et planning de révision

**Statut :** `🟨 En cours`

## Objectif

Aider l'élève à organiser son travail, visualiser ses priorités et savoir quoi réviser chaque jour.

## Travail à réaliser

- [x] Concevoir et raccorder le tableau de bord personnel aux priorités réelles.
- [x] Permettre de définir un objectif quotidien de révision dans le profil et l'afficher dans le planning.
- [x] Créer, modifier, terminer, rouvrir et supprimer une séance de révision.
- [x] Organiser les séances dans une liste chronologique adaptée au téléphone.
- [x] Relier une séance à une matière et à un thème visible du programme.
- [x] Mettre en évidence les tâches du jour et les retards.
- [x] Conserver les rappels pédagogiques dans le carnet sans ajouter de notification externe au premier incrément.
- [x] Gérer les états vides, les erreurs, les chargements et les opérations locales à resynchroniser.
- [ ] Tester les usages avec peu et beaucoup de séances.

## Livrables

- Un tableau de bord présentant les informations prioritaires.
- Un planning de révision fonctionnel.
- Une gestion des objectifs et des séances.
- Une vue claire des prochaines actions de l'élève.
- Des tests des principaux parcours de planification.

## Critères de validation

- [ ] L'élève sait immédiatement ce qu'il doit réviser.
- [x] Une séance peut être créée, modifiée, terminée, rouverte et supprimée.
- [x] Les changements sont correctement enregistrés en ligne et repris hors ligne sur appareil personnel.
- [ ] Le planning reste lisible sur un petit écran.
- [ ] Le tableau de bord ne présente que des informations utiles et compréhensibles.

---

# Partie 7 — Quiz, évaluations et suivi de progression

**Statut :** `⬜ À faire`

## Objectif

Permettre à l'élève de vérifier ses connaissances, comprendre ses erreurs et suivre sa progression au fil des révisions.

## Travail à réaliser

- [ ] Définir les types de questions et leurs règles de notation.
- [ ] Créer le parcours complet d'un quiz.
- [ ] Enregistrer les réponses et calculer le résultat.
- [ ] Afficher une correction claire avec des explications.
- [ ] Conserver l'historique des tentatives si cela fait partie du MVP.
- [ ] Présenter la progression par matière ou chapitre.
- [ ] Identifier les points forts et les notions à retravailler.
- [ ] Ajouter les exercices ou annales interactives prévus.
- [ ] Empêcher les calculs de score incohérents ou manipulables.
- [ ] Tester les cas limites : abandon, mauvaise connexion et quiz incomplet.

## Livrables

- Un système de quiz utilisable de bout en bout.
- Des corrections pédagogiques compréhensibles.
- Un historique des résultats si prévu.
- Des indicateurs simples de progression.
- Des tests automatisés du calcul des scores.

## Critères de validation

- [ ] Un élève peut terminer un quiz et obtenir un résultat exact.
- [ ] Chaque erreur peut être accompagnée d'une correction utile.
- [ ] Les statistiques correspondent aux tentatives enregistrées.
- [ ] La progression est présentée sans ambiguïté.
- [ ] Les interruptions et réponses incomplètes sont gérées proprement.

---

# Partie 8 — Qualité, déploiement et maintenance

**Statut :** `⬜ À faire`

## Objectif

Préparer une version stable, sécurisée, rapide et maintenable, puis la mettre à disposition des utilisateurs.

## Travail à réaliser

- [ ] Terminer les tests unitaires, d'intégration et de parcours critiques.
- [ ] Vérifier manuellement les fonctionnalités du cahier des charges.
- [ ] Tester plusieurs tailles d'écran et navigateurs ciblés.
- [ ] Auditer l'accessibilité, les performances et la sécurité.
- [ ] Corriger les erreurs et les incohérences de contenu.
- [ ] Préparer les environnements de préproduction et de production.
- [ ] Configurer le déploiement, les sauvegardes et la restauration.
- [ ] Mettre en place le suivi des erreurs et de la disponibilité.
- [ ] Rédiger la documentation utilisateur et technique.
- [ ] Établir un plan de maintenance et une liste d'améliorations futures.
- [ ] Effectuer la recette finale avant la mise en ligne.

## Livrables

- Une version de production testée et déployée.
- Un rapport de recette finale.
- Une documentation utilisateur et technique.
- Une stratégie de sauvegarde et de restauration vérifiée.
- Un plan de maintenance et une feuille de route post-MVP.

## Critères de validation

- [ ] Toutes les fonctionnalités du MVP sont validées.
- [ ] Aucun problème critique connu ne bloque l'utilisation.
- [ ] Les performances restent acceptables dans les conditions ciblées.
- [ ] Les sauvegardes et la restauration ont été testées.
- [ ] Le déploiement et les procédures de maintenance sont documentés.
- [ ] La version finale est approuvée avant son ouverture aux utilisateurs.

---

# Protocole de reprise du projet

À chaque reprise du travail :

1. Lire le **Tableau de suivi général**.
2. Repérer la partie marquée `🟨 En cours` ou la première partie `⬜ À faire`.
3. Lire ses tâches, ses livrables et ses critères de validation.
4. Consulter le **Journal des décisions**.
5. Vérifier l'état réel du dépôt avant de modifier le statut.
6. Réaliser une seule prochaine action clairement définie.

À la fin d'une session :

1. Cocher uniquement les tâches réellement terminées.
2. Mettre à jour le statut de la partie.
3. Ajouter les décisions importantes au journal.
4. Écrire la prochaine action précise dans la section ci-dessous.

## Partie actuellement active

- **Partie :** Partie 6 — Tableau de bord et planning de révision.
- **Statut :** `🟨 En cours`
- **Prochaine action :** réaliser la recette responsive et hors ligne du premier planning avec peu puis beaucoup de séances, ajuster les priorités du tableau de bord et décider si une vue hebdomadaire est utile au MVP.
- **Premier incrément :** création, modification, validation, réouverture et suppression privées sont raccordées au programme, au tableau de bord et à l'outbox Dexie.
- **Rappel :** le planning doit rester utile sur téléphone et avec une connexion instable ; aucune notification externe n'est prévue tant qu'un besoin du pilote ne la justifie pas.

---

# Journal des décisions

| Date | Partie | Décision | Raison | Impact |
|---|---:|---|---|---|
| 2026-10-15 | Général | Le projet est découpé en 8 parties successives. | Avancer progressivement et limiter les oublis. | Chaque partie doit être validée avant la suivante. |
| 2026-10-15 | 1 | BAC-2027 sera une plateforme complète de préparation, lancée avec la Série D du Burkina Faso. | Concentrer le premier lancement sur un public et un programme précis. | Les autres séries et pays sont hors du MVP. |
| 2026-10-15 | 1 | Le MVP vise les élèves et administrateurs, avec accès sur invitation et connexion par nom d'utilisateur. | Contrôler le groupe pilote et éviter de dépendre de l'e-mail. | L'administration gère les comptes et leur récupération. |
| 2026-10-15 | 1 | Les ressources personnelles sont privées ; seule l'administration publie dans la bibliothèque commune. | Protéger les données des élèves et vérifier les contenus partagés. | Aucun partage automatique entre élèves. |
| 2026-10-15 | 1 | Le produit sera une PWA mobile en français avec fonctionnement hors ligne et synchronisation. | S'adapter aux téléphones et aux connexions instables. | L'architecture devra être pensée hors ligne dès le départ. |
| 2026-10-15 | 1 | Le MVP sera équilibré entre contenus, planning, quiz et progression et acceptera documents, images, audio et vidéo. | Fournir rapidement une expérience utile pendant toute l'année scolaire. | Le stockage, les quotas et la synchronisation des médias devront être strictement définis. |
| 2026-10-15 | 1 | Aucun paiement ne sera intégré au MVP ; le modèle économique reste ouvert. | Ne pas retarder la première version utilisable avant juillet 2027. | Les fonctionnalités de paiement sont reportées. |
| 2026-10-15 | 1 | Le cahier des charges v1.0 est approuvé et la Partie 1 est terminée. | Le porteur du projet a validé la version proposée. | La Partie 2 peut commencer. |
| 2026-10-15 | 1 | La validation officielle des matières est reportée avant la Partie 5. | Le porteur du projet fournira le document officiel ultérieurement. | Cette réserve ne bloque pas les Parties 2 à 4, mais bloque le contenu pédagogique définitif. |
| 2026-10-15 | 2 | L'espace élève utilisera cinq entrées : Accueil, Ressources, Planning, Quiz et Profil. | Cette structure rend les fonctions centrales immédiatement accessibles sur téléphone. | La progression reste accessible depuis Accueil et Quiz. |
| 2026-10-15 | 2 | Le design sera sérieux et académique, avec une palette vert profond et turquoise. | Inspirer confiance tout en conservant une interface moderne et lisible. | L'identité, les composants et le prototype suivront cette direction. |
| 2026-10-15 | 2 | Le tableau de bord présentera une vue d'ensemble complète organisée par priorité. | Donner accès aux ressources, au planning, aux résultats et à la progression sans multiplier les écrans. | Les détails restent accessibles via des liens « Voir tout ». |
| 2026-10-15 | 2 | La conception UX/UI v0.1 est approuvée. | Le porteur du projet a autorisé la construction du prototype sur cette base. | L'arborescence, les wireframes et la direction visuelle deviennent la référence du prototype. |
| 2026-10-15 | 2 | Un prototype autonome en HTML, CSS et JavaScript est créé. | Tester les parcours sans figer la pile technique de la Partie 3. | La Partie 2 attend maintenant le test et l'approbation finale du prototype. |
| 2026-10-15 | 2 | Le prototype responsive est approuvé et la Partie 2 est terminée. | Le porteur du projet a validé la navigation, le visuel et les parcours. | Le prototype devient la référence UX/UI de l'implémentation. |
| 2026-10-15 | 2 | Le logotype texte `B27 / BAC-2027` est conservé pour le MVP. | Éviter de bloquer le développement sur une identité graphique définitive. | Un logo plus élaboré pourra être étudié après le MVP. |
| 2026-10-15 | 3 | Le socle utilise React/Vite, Fastify, PostgreSQL/Drizzle, Dexie et Zod dans un monorepo TypeScript. | Contrôler le hors-ligne, partager les contrats et rester portable. | Le web, l'API et les contrats sont séparés en workspaces. |
| 2026-10-15 | 3 | La synchronisation suivra une stratégie offline-first avec IndexedDB et outbox idempotente. | Éviter toute perte silencieuse avec une connexion instable. | Chaque entité synchronisable possède une version et les conflits sont explicites. |
| 2026-10-15 | 3 | PostgreSQL stocke les données structurées et un stockage objet compatible S3 recevra les médias. | Maîtriser les sauvegardes, les coûts et l'évolution du stockage. | Les quotas restent configurables ; la valeur prudente recommandée est 250 Mo au début. |
| 2026-10-15 | 3 | Le budget d'hébergement cible est de 10 000 à 30 000 FCFA par mois. | Conserver une infrastructure simple et fiable pour un pilote de taille encore inconnue. | Aucun Kubernetes ; services portables et mesure de l'usage avant extension. |
| 2026-10-15 | 3 | TypeScript 6.0.3 est retenu plutôt que 7.0.2. | L'outil de linting stable ne déclare pas encore TypeScript 7 compatible. | Le projet évite une installation forcée et instable. |
| 2026-10-15 | 3 | Le socle technique, la migration initiale et l'intégration continue sont opérationnels. | Préparer les fonctionnalités de comptes sans dette de fondation. | La Partie 3 attend uniquement l'approbation du porteur du projet. |
| 2026-10-15 | 3 | L'architecture et les fondations sont approuvées ; la Partie 3 est terminée. | Le porteur du projet a demandé de poursuivre. | La Partie 4 peut commencer. |
| 2026-10-15 | 4 | La Partie 4 — Comptes utilisateurs et profils est ouverte. | Implémenter l'accès sur invitation déjà défini dans le cahier des charges. | Les règles détaillées d'invitation et de session doivent maintenant être confirmées. |
| 2026-10-16 | 4 | L'activation utilise un lien aléatoire à usage unique valable 72 heures, remis manuellement par l'administration. | Empêcher l'inscription publique tout en simplifiant l'entrée dans le pilote. | Une nouvelle invitation révoque la précédente pour le même identifiant. |
| 2026-10-16 | 4 | La récupération utilise un code administrateur de 8 chiffres valable 30 minutes. | Le MVP ne collecte ni e-mail ni téléphone. | L'identité est vérifiée hors plateforme et le code est limité à cinq tentatives. |
| 2026-10-16 | 4 | L'utilisateur choisit appareil personnel ou partagé à chaque authentification. | Adapter la persistance à l'usage réel des téléphones et postes partagés. | Session de 30 jours avec cache hors ligne minimal, ou session de 8 heures sans persistance privée. |
| 2026-10-16 | 4 | Le profil MVP reste minimal : nom affiché, identifiant, Série D et préférences d'usage. | Réduire les données personnelles et livrer rapidement une première version utile. | Aucune coordonnée personnelle n'est demandée. |
| 2026-10-16 | 4 | PGlite exécute les migrations et tests en développement ; PostgreSQL reste obligatoire en production. | Permettre le travail local sans serveur externe tout en conservant la cible de production. | Le cycle complet d'authentification est testé sur le schéma PostgreSQL réel. |
| 2026-10-16 | 4 | L'implémentation des comptes et profils est prête pour la recette. | Les routes, écrans, migrations et tests automatisés sont opérationnels. | La Partie 4 reste en cours jusqu'à l'approbation visuelle du porteur du projet. |
| 2026-10-16 | 4 | L'aperçu intégré utilise un mode d'authentification de développement éphémère lorsque l'iframe bloque les cookies. | Le navigateur intégré à Arena acceptait la connexion mais supprimait la session avant la lecture du profil. | Le jeton de secours reste uniquement en mémoire, disparaît au rechargement et le mode est refusé en production. |
| 2026-10-16 | 4 | La recette de connexion élève est réussie et la Partie 4 est approuvée. | Le porteur du projet a confirmé le parcours dans l'aperçu et demandé de poursuivre. | La Partie 4 passe à `✅ Terminée`. |
| 2026-10-16 | 5 | La Partie 5 reste bloquée jusqu'à réception du document officiel des matières de Série D. | La liste pédagogique définitive ne doit pas reposer sur des suppositions ou les données de démonstration. | Le porteur du projet doit fournir le document avant l'ouverture de l'implémentation. |
| 2026-10-16 | 5 | Les neuf PDF Faso e-education reçus sont classés comme sources pédagogiques complémentaires, pas comme référentiel officiel exhaustif. | Ce sont des impressions d'un catalogue de cours mélangeant les Terminales A, C, D et E, sans acte administratif, liste exhaustive ni coefficients. | Leur inventaire est conservé avec sa provenance ; une source administrative reste requise avant l'injection d'un référentiel présenté comme officiel. |
| 2026-10-17 | 5 | Le catalogue reçu devient la base pédagogique initiale fournie par le porteur, avec validation institutionnelle en attente. | Le projet doit être construit progressivement à partir du programme fourni et des bilans quotidiens de chaque élève. | La Partie 5 passe à `🟨 En cours` ; l'application doit structurer, expliquer et vérifier les bilans sans présenter le catalogue comme une certification administrative. |
| 2026-10-17 | 5 | Le contenu original de l'élève doit rester distinct des enrichissements et corrections proposés. | Une aide automatisée peut se tromper et ne doit pas réécrire silencieusement les notes de cours. | Les brouillons afficheront leur provenance, leurs sources et les points nécessitant une confirmation. |
| 2026-10-17 | 5 | Toute correction est proposée avec explication et source, puis acceptée ou refusée par l'élève. | Le porteur privilégie la confirmation par l'élève plutôt que la correction automatique. | Le modèle de données doit conserver l'original et l'état de chaque proposition. |
| 2026-10-17 | 5 | Les entrées explicitement destinées à une autre série sont masquées côté élève, mais conservées pour l'administration. | Le catalogue reçu mélange les Terminales A, C, D et E. | Les entrées sans série restent provisoires ; aucune entrée incompatible n'est attribuée silencieusement à la Série D. |
| 2026-10-17 | 5 | La vérification privilégie les sources approuvées, puis autorise le web plus large avec citations et avertissements. | Obtenir une couverture utile sans présenter une source web quelconque comme une vérité. | Le futur service de recherche doit tracer les sources, la date de consultation et les incertitudes. |
| 2026-10-17 | 5 | Le bilan quotidien accepte texte, photo et court audio en mode économique. | Donner à l'élève plusieurs moyens de saisir le cours sans promettre une analyse automatisée durablement gratuite. | La capture ne dépend d'aucune API payante ; OCR, transcription et génération passent par des adaptateurs optionnels, mesurés et plafonnés. |
| 2026-10-17 | 5 | Le premier incrément de la Partie 5 importe 7 matières, 9 sources et 203 entrées, dont 191 visibles et 12 masquées pour incompatibilité explicite de série. | Préserver fidèlement les documents fournis tout en appliquant la règle de visibilité choisie. | La migration `0002`, l'import idempotent, les API protégées, le catalogue responsive et le premier formulaire de bilan sont opérationnels ; l'enrichissement automatisé reste à réaliser. |
| 2026-10-17 | 5 | Le porteur approuve le premier incrément du catalogue et du bilan quotidien. | La recette humaine confirme que le parcours peut servir de base à la suite. | Le travail continue avec le transfert serveur sécurisé des photos et audios, puis l'enrichissement expliqué et sourcé. |
| 2026-10-17 | 5 | Les médias de bilan passent par l'API avec contrôle de signature, limites de 2 photos de 5 Mo et 1 audio de 10 Mo, quota global et stockage S3 privé obligatoire en production. | Protéger les contenus personnels tout en gardant un parcours économique et reprenable sur connexion instable. | Le bilan est synchronisé avant ses médias ; l'appareil personnel conserve une outbox, l'appareil partagé envoie sans persistance locale et le stockage fichier reste réservé au développement. |
| 2026-10-17 | 5 | Un fournisseur local déterministe structure le bilan sans inventer d'information et sert de repli gratuit au futur enrichissement factuel. | Livrer dès maintenant le parcours original → brouillon → sources → décisions, sans présenter une génération non configurée comme fiable. | Le contrat fournisseur, la persistance versionnée, les citations, les corrections confirmées et la validation du cours sont opérationnels ; la recherche, l'OCR, la transcription et les explications factuelles externes restent à raccorder. |
| 2026-10-17 | 5 | Le corpus factuel est administré par thème et reste vide par défaut ; seule une fiche explicitement publiée peut enrichir ou corriger un bilan. | Ne jamais transformer une connaissance inventée ou une source non vérifiée en contenu commun. | L'administration peut versionner, sourcer, publier et archiver les fiches ; le fournisseur `curated-corpus` les utilise avec citations et revient au mode local lorsqu'aucune fiche n'est disponible. |
| 2026-10-17 | 5 | Le programme officiel disponible suffit comme trame du MVP ; aucun corpus complet de cours officiels supplémentaire n'est attendu. | Le porteur ne peut pas obtenir ces documents et veut néanmoins une plateforme utile jusqu'aux révisions finales de juillet 2027. | La valeur principale vient du carnet privé construit avec les bilans de classe, les cours personnels validés, les auto-évaluations et des rappels espacés ; les fiches communes sourcées deviennent un enrichissement facultatif. |
| 2026-10-17 | 5 | Une auto-évaluation peut être saisie hors ligne sur un appareil personnel et synchronisée de manière idempotente. | Une connexion instable ne doit ni bloquer un passage de révision ni le dupliquer lors d'une nouvelle tentative. | Chaque passage porte un UUID client et son heure d'exécution ; l'aperçu est optimiste, l'outbox est rejouée à la reconnexion et aucun stockage privé persistant n'est utilisé sur appareil partagé. |
| 2026-10-17 | 5 | La recette finale du carnet est approuvée et la Partie 5 est terminée. | Le porteur a validé l'affichage responsive et le parcours de révision après les contrôles automatisés de reconnexion et d'idempotence. | La Partie 6 peut commencer en réutilisant les priorités et rappels du carnet. |
| 2026-10-17 | 6 | La Partie 6 — Tableau de bord et planning de révision est ouverte. | Les contenus personnels et les rappels par thème sont désormais assez stables pour planifier le travail quotidien. | Le premier incrément raccorde les séances privées existantes au programme et au tableau de bord, sans notification externe. |
| 2026-10-17 | 6 | Le planning privilégie une liste chronologique privée et hors ligne plutôt qu'une grille mensuelle ou des notifications externes. | La liste reste lisible sur les petits téléphones et ne dépend d'aucun service payant ; l'élève garde la maîtrise de son rythme. | Les séances portent un UUID client, un contrôle de version et un lien facultatif vers le programme ; les vues en retard, aujourd'hui, à venir et historique sont calculées localement. |

> Ajouter une ligne à ce tableau lorsqu'un choix important est validé : technologie, fonctionnalité, design, règle métier ou changement de périmètre.
