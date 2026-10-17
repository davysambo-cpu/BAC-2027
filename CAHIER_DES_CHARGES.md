# Cahier des charges — BAC-2027

> **Version :** 1.0  
> **Date :** 15 octobre 2026  
> **Statut :** `✅ Approuvé`  
> **Partie du plan :** Partie 1 — Cadrage et cahier des charges  
> **Document de suivi :** [PLAN_PROJET.md](./PLAN_PROJET.md)

---

## 1. Résumé du projet

**BAC-2027** est une plateforme de préparation au baccalauréat destinée, dans sa première version, aux élèves de **Série D au Burkina Faso**.

La plateforme doit permettre à chaque élève de construire progressivement son espace de révision à mesure qu'il reçoit ses cours pendant l'année scolaire. Il pourra y réunir ses notes et ses ressources, les classer, organiser ses révisions, répondre à des quiz simples et suivre sa progression.

Des administrateurs publieront également des ressources pédagogiques communes et vérifiées. Ils géreront les comptes, la structure des matières et les contenus partagés.

Le produit prendra la forme d'une **application web responsive et installable (PWA)**, en français, conçue en priorité pour le téléphone. Les fonctionnalités principales devront pouvoir continuer à fonctionner hors connexion puis se synchroniser lorsque la connexion revient.

La première version doit être disponible **le plus vite possible**, afin que les élèves commencent à constituer leur dossier de révision bien avant les examens prévus en juillet 2027.

---

## 2. Problème à résoudre

Au cours de l'année scolaire, un élève reçoit progressivement des cours, notes, exercices, images, documents, fichiers audio et vidéos. Ces ressources peuvent être dispersées, difficiles à retrouver et rarement reliées à un véritable programme de révision.

BAC-2027 doit répondre aux besoins suivants :

1. Réunir les ressources de l'élève dans un espace unique.
2. Classer les ressources selon les matières et chapitres de la Série D.
3. Permettre l'accès aux contenus malgré une connexion instable ou absente.
4. Aider l'élève à planifier ses révisions jusqu'au BAC.
5. Lui permettre de vérifier ses acquis grâce à des quiz simples.
6. Lui montrer une progression claire sans surcharger l'interface.
7. Mettre à sa disposition des ressources communes publiées par l'administration.

### Formulation synthétique

> Comment aider un élève de Série D au Burkina Faso à rassembler progressivement tout ce qu'il reçoit en classe, à l'organiser et à l'utiliser efficacement pour préparer le BAC de juillet 2027, y compris lorsque sa connexion internet est limitée ?

---

## 3. Vision et objectifs

### 3.1 Vision

Faire de BAC-2027 le **classeur numérique personnel de préparation au BAC**, complété par des outils simples de planification, d'entraînement et de suivi.

### 3.2 Objectifs principaux

- Centraliser les ressources personnelles de l'élève.
- Structurer les contenus selon le programme de Série D.
- Construire progressivement un historique de révision jusqu'à l'examen.
- Donner accès à une bibliothèque commune gérée par les administrateurs.
- Rendre le travail possible sur téléphone et avec une connexion limitée.
- Proposer une première expérience de planning, de quiz et de progression.
- Protéger les documents personnels et les données de l'élève.

### 3.3 Principes du produit

- **Mobile d'abord :** l'expérience sur téléphone est prioritaire.
- **Simple avant d'être riche :** chaque fonction doit être compréhensible rapidement.
- **Progressif :** le produit et les contenus grandissent pendant l'année scolaire.
- **Hors connexion :** une coupure ne doit pas faire perdre le travail réalisé.
- **Privé par défaut :** les documents personnels ne deviennent jamais publics automatiquement.
- **Pédagogique :** les outils doivent servir la préparation au BAC et non distraire l'élève.

---

## 4. Périmètre de la première version

| Élément | Décision retenue |
|---|---|
| Pays et programme | Burkina Faso |
| Série pilote | Série D |
| Public principal | Élèves de Série D |
| Gestion du service | Administrateurs |
| Langue de lancement | Français |
| Support prioritaire | Application web responsive et PWA |
| Accès | Sur invitation uniquement |
| Identifiant | Nom d'utilisateur et mot de passe |
| Récupération de compte | Gérée par un administrateur dans le MVP |
| Connexion | Fonctionnement hors ligne avec synchronisation |
| Ressources personnelles | Documents, images, fichiers audio, vidéos et notes |
| Visibilité par défaut | Privée |
| Publication commune | Réservée aux administrateurs |
| Type de MVP | Mini-version équilibrée : contenus, planning, quiz et progression |
| Modèle économique | Non décidé ; aucun paiement requis dans le MVP |
| Échéance | Première version utilisable le plus vite possible avant juillet 2027 |

### 4.1 Utilisateurs du MVP

Le MVP possède uniquement deux rôles applicatifs :

1. **Élève**
2. **Administrateur**

Les enseignants, parents et autres intervenants ne disposent pas d'un rôle spécifique dans le MVP.

---

## 5. Utilisateurs et permissions

### 5.1 Élève

L'élève doit pouvoir :

- se connecter avec un compte créé ou autorisé par l'administration ;
- modifier les informations non sensibles de son profil ;
- consulter les matières et chapitres de Série D disponibles ;
- créer des notes personnelles ;
- ajouter des documents, images, fichiers audio et vidéos ;
- classer ses ressources par matière et chapitre ;
- rechercher et filtrer ses ressources ;
- consulter les ressources communes publiées par l'administration ;
- créer et suivre des séances de révision ;
- répondre à des quiz simples ;
- consulter ses résultats et sa progression ;
- utiliser les fonctions essentielles hors ligne ;
- synchroniser son travail lorsque la connexion revient.

L'élève ne doit pas pouvoir :

- publier directement une ressource dans la bibliothèque commune ;
- consulter les ressources personnelles d'un autre élève ;
- créer un compte sans invitation ;
- modifier les matières, les chapitres ou les contenus administratifs ;
- modifier ses résultats après validation d'une tentative.

### 5.2 Administrateur

L'administrateur doit pouvoir :

- créer, inviter, activer, désactiver et assister les comptes élèves ;
- réinitialiser l'accès d'un élève suivant une procédure sécurisée ;
- gérer la structure des matières et chapitres ;
- créer, modifier, publier et retirer des ressources communes ;
- créer et gérer les quiz et leurs corrections ;
- consulter les informations techniques nécessaires au bon fonctionnement ;
- contrôler les quotas et signaler les fichiers problématiques ;
- consulter un journal des actions administratives importantes.

L'administrateur ne doit pas pouvoir publier un document personnel d'élève sans une action explicite de soumission ou d'autorisation de celui-ci. Cette règle devra être confirmée dans la politique de confidentialité.

---

## 6. Fonctionnalités classées par priorité

La méthode **MoSCoW** est utilisée :

- **Must have :** indispensable au MVP ;
- **Should have :** important, mais peut arriver juste après le premier MVP ;
- **Could have :** amélioration future ;
- **Won't have now :** volontairement exclu du MVP.

### 6.1 Must have — indispensables

#### Comptes et accès

- Invitation ou création d'un compte élève par un administrateur.
- Connexion avec nom d'utilisateur et mot de passe.
- Déconnexion.
- Activation et désactivation d'un compte.
- Réinitialisation de l'accès par un administrateur.
- Protection des pages et données privées.

#### Profil scolaire

- Profil élève lié à la Série D.
- Préférences personnelles essentielles.
- Affichage de la progression générale.

#### Classeur numérique personnel

- Création, modification et suppression d'une note.
- Ajout de documents, images, fichiers audio et vidéos.
- Classement par matière et chapitre.
- Ajout d'un titre, d'une description et de mots-clés simples.
- Recherche et filtrage des ressources personnelles.
- Consultation ou téléchargement d'une ressource compatible.
- Ressources privées par défaut.

#### Bibliothèque commune

- Consultation des ressources publiées par l'administration.
- Classement par matière et chapitre.
- Recherche et filtrage simples.
- Affichage de la source et de la date de mise à jour lorsqu'elles sont disponibles.
- Publication et retrait réservés aux administrateurs.

#### Tableau de bord

- Résumé des ressources récentes.
- Séances de révision du jour ou à venir.
- Derniers résultats de quiz.
- Indicateur simple de progression.
- État de connexion et de synchronisation compréhensible.

#### Planning de révision

- Création, modification, réalisation et suppression d'une séance.
- Association d'une séance à une matière ou un chapitre.
- Date, durée prévue et statut de la séance.
- Vue simple des séances à venir et terminées.

#### Quiz et progression

- Quiz simples créés par l'administration.
- Questions à choix simples ou multiples dans le premier MVP.
- Enregistrement des réponses.
- Calcul fiable du score.
- Correction et explication lorsqu'elles ont été renseignées.
- Historique élémentaire des tentatives.
- Progression simple par matière.

#### Administration

- Gestion des comptes et invitations.
- Gestion des matières et chapitres.
- Gestion des ressources communes.
- Gestion des quiz, questions et corrections.
- Tableau administratif minimal.

#### PWA et mode hors connexion

- Application installable depuis un navigateur compatible.
- Interface principale disponible hors connexion après la première utilisation.
- Création et modification hors ligne des notes, séances et réponses autorisées.
- Mise en file des opérations effectuées hors ligne.
- Synchronisation automatique ou manuelle au retour de la connexion.
- Indication claire des données non encore synchronisées.
- Gestion documentée des conflits de synchronisation.
- Absence de perte silencieuse des données.

> Les médias volumineux ne seront pas nécessairement tous téléchargés automatiquement. Une ressource commune volumineuse pourra devoir être enregistrée explicitement sur l'appareil pour être disponible hors ligne. Les règles précises seront définies pendant la conception technique.

### 6.2 Should have — importants après le socle

- Téléchargement explicite de ressources communes pour un accès hors ligne.
- Rappels locaux pour les séances planifiées.
- Affichage de l'espace de stockage utilisé.
- Limites de taille et messages d'erreur adaptés à chaque média.
- Soumission volontaire d'une ressource personnelle à l'administration pour examen.
- Historique visible des synchronisations récentes.
- Export ou sauvegarde des notes personnelles dans un format courant.
- Liens vers des ressources externes autorisées.

### 6.3 Could have — améliorations futures

- Examens blancs chronométrés.
- Questions plus complexes et exercices interactifs.
- Recommandations de révision personnalisées.
- Statistiques pédagogiques avancées.
- Notifications à distance.
- Système de favoris avancé.
- Commentaires privés sur les ressources.
- Ajout progressif d'autres séries.
- Rôle enseignant avec publication contrôlée.
- Interface dans d'autres langues.

### 6.4 Won't have now — hors MVP

- Accès parent.
- Espace enseignant complet.
- Réseau social, messagerie ou discussion publique.
- Partage automatique des documents d'élèves.
- Publication libre sans modération.
- Plusieurs pays ou plusieurs programmes nationaux.
- Toutes les séries dès le lancement.
- Application Android ou iOS native séparée.
- Cours vidéo en direct.
- Paiement ou abonnement dans le premier MVP.
- Fonctions avancées non indispensables à la préparation de Série D.

---

## 7. Parcours utilisateurs principaux

### 7.1 Première connexion d'un élève

1. L'administrateur crée une invitation ou un compte.
2. L'élève reçoit les informations nécessaires.
3. L'élève choisit ou confirme son mot de passe.
4. Il accède à son espace Série D.
5. Il découvre un tableau de bord avec une première action claire.

### 7.2 Ajout d'une ressource personnelle

1. L'élève choisit une matière et, si possible, un chapitre.
2. Il crée une note ou sélectionne un fichier.
3. Il ajoute un titre et les informations utiles.
4. La ressource est enregistrée localement si l'élève est hors ligne.
5. Elle apparaît immédiatement dans son classeur avec son état de synchronisation.
6. Elle est synchronisée lorsque la connexion est disponible.
7. Elle demeure privée.

### 7.3 Consultation d'une ressource commune

1. L'élève ouvre la bibliothèque.
2. Il filtre par matière ou chapitre.
3. Il consulte les informations de la ressource.
4. Il ouvre le contenu ou l'enregistre pour une consultation hors ligne lorsque cette option est disponible.

### 7.4 Planification d'une révision

1. L'élève choisit une matière ou un chapitre.
2. Il définit une date et une durée prévue.
3. La séance apparaît dans son tableau de bord.
4. Il la marque comme terminée après son travail.
5. La progression correspondante est mise à jour.

### 7.5 Réalisation d'un quiz

1. L'élève choisit un quiz disponible.
2. Il répond aux questions.
3. Il valide sa tentative.
4. Le système calcule le score.
5. L'élève consulte la correction et les explications.
6. La tentative alimente son historique et sa progression.

### 7.6 Publication par un administrateur

1. L'administrateur crée ou ajoute une ressource.
2. Il indique la matière, le chapitre, la source et les informations nécessaires.
3. Il vérifie les droits de publication.
4. Il publie la ressource.
5. Celle-ci devient visible dans la bibliothèque commune.

---

## 8. Règles métier essentielles

1. Aucun élève ne peut s'inscrire librement dans le MVP.
2. Chaque nom d'utilisateur doit être unique.
3. Un élève ne peut consulter que ses propres données personnelles.
4. Une ressource créée par un élève est privée par défaut.
5. Seul un administrateur peut publier dans la bibliothèque commune.
6. Une ressource personnelle ne peut pas être rendue commune sans accord explicite de son propriétaire.
7. Toute ressource commune doit être rattachée au minimum à une matière.
8. La structure pédagogique du MVP correspond uniquement à la Série D du Burkina Faso.
9. Un quiz publié doit posséder au moins une question et une correction valide.
10. Un score doit être calculé par le système et non fourni par le navigateur seul.
11. Une opération hors ligne doit afficher son état : locale, en attente, synchronisée ou en erreur.
12. Une erreur de synchronisation ne doit jamais supprimer silencieusement une version locale.
13. Les suppressions doivent être confirmées et synchronisées de manière contrôlée.
14. Les fichiers doivent respecter des types, tailles et quotas définis avant le développement des téléversements.
15. Le MVP ne contient aucun paiement.

---

## 9. Ressources prises en charge

### 9.1 Catégories prévues

- Notes rédigées directement dans la plateforme.
- Documents, notamment PDF et formats bureautiques retenus.
- Images de cours ou d'exercices.
- Fichiers audio.
- Fichiers vidéo.

### 9.2 Informations minimales d'une ressource

- Titre.
- Propriétaire ou auteur de publication.
- Type de ressource.
- Matière.
- Chapitre, lorsqu'il est connu.
- Description facultative.
- Date de création et de mise à jour.
- Visibilité : privée ou commune.
- État de synchronisation.
- Source et droits de publication pour les contenus communs.

### 9.3 Limites à définir avant l'implémentation

- Formats de fichiers exacts autorisés.
- Taille maximale par fichier.
- Quota total par élève.
- Durée maximale des fichiers audio et vidéo.
- Compression automatique éventuelle.
- Durée de conservation après suppression.
- Politique de sauvegarde et de restauration.

---

## 10. Exigences non fonctionnelles

### 10.1 Ergonomie

- Interface pensée d'abord pour les petits écrans.
- Navigation simple et cohérente.
- Actions principales accessibles sans parcours inutilement long.
- États vides, erreurs et chargements expliqués clairement.
- Texte et contrôles suffisamment grands pour une utilisation tactile.

### 10.2 Performance et réseau

- Réduire les données téléchargées au strict nécessaire.
- Éviter le chargement automatique des médias lourds.
- Afficher la progression d'un téléversement ou d'une synchronisation.
- Permettre la reprise d'une opération interrompue lorsque cela est techniquement possible.
- Tester le produit dans des conditions de connexion mobile limitée.

### 10.3 Hors connexion et synchronisation

- Conserver localement les opérations indispensables.
- Identifier chaque donnée pour éviter les doublons.
- Ne jamais annoncer une synchronisation réussie avant confirmation du serveur.
- Définir une règle de résolution pour chaque type de conflit.
- Permettre à l'élève de relancer une synchronisation en erreur.
- Protéger les données stockées localement autant que le permettent les navigateurs ciblés.

### 10.4 Sécurité et confidentialité

- Mots de passe stockés uniquement sous forme sécurisée.
- Communications chiffrées en production.
- Autorisations vérifiées côté serveur.
- Validation des fichiers et données reçus.
- Journalisation des actions administratives sensibles.
- Collecte limitée aux données réellement utiles.
- Procédure de suppression ou désactivation de compte.
- Politique adaptée à un public pouvant comprendre des mineurs.

### 10.5 Accessibilité

- Contraste suffisant.
- Navigation au clavier pour les fonctions essentielles.
- Libellés compréhensibles pour les formulaires.
- Information non transmise uniquement par la couleur.
- Alternatives textuelles pour les contenus concernés.

### 10.6 Fiabilité

- Sauvegardes régulières des données serveur.
- Procédure de restauration testée avant la production.
- Tests automatisés des fonctions sensibles.
- Suivi des erreurs de production.
- Aucun déploiement sans vérification des parcours critiques.

---

## 11. Modèle de données fonctionnel initial

Cette liste décrit les concepts nécessaires sans imposer encore une technologie :

- **Utilisateur** : compte, rôle, statut et informations d'accès.
- **Invitation** : création ou autorisation d'un compte élève.
- **Profil élève** : série, préférences et informations scolaires utiles.
- **Matière** : matière de Série D.
- **Chapitre** : subdivision d'une matière.
- **Ressource** : note ou contenu pédagogique, personnel ou commun.
- **Fichier** : média lié à une ressource.
- **Séance de révision** : activité planifiée par l'élève.
- **Quiz** : ensemble de questions publié par l'administration.
- **Question** : énoncé, propositions et correction.
- **Tentative** : réponses et résultat d'un élève.
- **Progression** : indicateurs calculés par matière ou chapitre.
- **Opération de synchronisation** : modification locale en attente, réussie ou en erreur.
- **Journal administratif** : trace des actions sensibles.

Le schéma détaillé sera produit dans la Partie 3 du plan.

---

## 12. Histoires utilisateur prioritaires

| ID | En tant que… | Je veux… | Afin de… | Priorité |
|---|---|---|---|---|
| US-01 | Administrateur | créer ou inviter un compte élève | contrôler l'accès au service | Must |
| US-02 | Élève invité | me connecter avec mon nom d'utilisateur | accéder à mon espace personnel | Must |
| US-03 | Élève | ajouter une note ou un média | conserver ce que j'ai reçu en classe | Must |
| US-04 | Élève | classer une ressource par matière et chapitre | la retrouver rapidement | Must |
| US-05 | Élève | consulter mes ressources hors ligne | continuer à travailler sans connexion | Must |
| US-06 | Élève | voir ce qui reste à synchroniser | savoir si mon travail est sauvegardé sur le serveur | Must |
| US-07 | Élève | consulter une ressource commune | compléter mes supports de cours | Must |
| US-08 | Élève | planifier une séance | organiser mes révisions | Must |
| US-09 | Élève | terminer un quiz et voir la correction | comprendre mes erreurs | Must |
| US-10 | Élève | consulter ma progression par matière | identifier mes priorités | Must |
| US-11 | Administrateur | publier des ressources communes | fournir des contenus vérifiés | Must |
| US-12 | Administrateur | créer un quiz et sa correction | proposer un entraînement pédagogique | Must |
| US-13 | Administrateur | désactiver ou restaurer l'accès d'un compte | assister les élèves et sécuriser le service | Must |
| US-14 | Élève | soumettre volontairement une ressource à l'administration | proposer un contenu utile aux autres | Should |
| US-15 | Élève | enregistrer un contenu commun sur mon appareil | le consulter sans connexion | Should |

---

## 13. Critères d'acceptation du MVP

Le MVP équilibré sera considéré comme fonctionnel lorsque :

- [ ] un administrateur peut créer ou inviter un élève ;
- [ ] l'élève peut se connecter avec son nom d'utilisateur et son mot de passe ;
- [ ] l'élève peut créer, classer, retrouver et supprimer une ressource personnelle ;
- [ ] au moins un type de document, les images, l'audio et la vidéo suivent un parcours contrôlé ;
- [ ] l'élève peut réaliser les opérations essentielles hors ligne sans perdre son travail ;
- [ ] les opérations en attente se synchronisent correctement au retour de la connexion ;
- [ ] l'administrateur peut publier une ressource commune ;
- [ ] l'élève peut créer et terminer une séance de révision ;
- [ ] l'administrateur peut publier un quiz simple avec sa correction ;
- [ ] l'élève peut terminer le quiz, obtenir un score exact et revoir ses réponses ;
- [ ] le tableau de bord présente contenus récents, planning et progression simple ;
- [ ] les données d'un élève sont inaccessibles aux autres élèves ;
- [ ] l'application peut être installée comme PWA sur un appareil compatible ;
- [ ] les parcours critiques sont testés sur téléphone et ordinateur ;
- [ ] les procédures d'installation, sauvegarde et récupération sont documentées.

---

## 14. Stratégie de livraison progressive

L'objectif « le plus vite possible » sera traité par des livraisons courtes, sans attendre que toutes les fonctions avancées soient terminées.

### Lot A — Socle utilisable en test

- Comptes sur invitation.
- Connexion par nom d'utilisateur.
- Structure Série D.
- Classeur personnel minimal.
- Première synchronisation hors ligne.
- Interface mobile installable en PWA.

### Lot B — MVP équilibré

- Bibliothèque commune administrée.
- Tableau de bord.
- Planning simple.
- Quiz à choix et corrections.
- Progression élémentaire.
- Prise en charge contrôlée des différents médias.

### Lot C — Stabilisation avant ouverture

- Tests complets des parcours critiques.
- Amélioration des performances et du mode hors connexion.
- Règles définitives de stockage et de quotas.
- Sauvegardes et restauration.
- Vérifications de sécurité, confidentialité et accessibilité.
- Documentation utilisateur et administrative.

Chaque lot doit rester utilisable et démontrable. Une date précise sera établie après le choix de l'architecture et l'estimation technique.

---

## 15. Indicateurs de réussite proposés

### 15.1 Qualité d'utilisation

- Au moins 80 % des utilisateurs pilotes accomplissent sans assistance les trois actions essentielles : ajouter une ressource, planifier une séance et terminer un quiz.
- Aucun utilisateur ne perd silencieusement une note ou une séance créée hors ligne.
- Les états de synchronisation sont compris lors des tests utilisateurs.
- Les parcours principaux restent utilisables sur un téléphone de petite taille.

### 15.2 Fiabilité

- Aucun accès d'un élève aux données privées d'un autre élève.
- Aucun défaut critique connu lors de l'ouverture du MVP.
- Tous les calculs de score couverts par des tests automatisés.
- Sauvegarde et restauration testées avant la mise en production.

### 15.3 Utilité pédagogique

- Les élèves pilotes ajoutent progressivement des ressources à leur classeur.
- Les élèves reviennent consulter ou compléter leur espace chaque semaine pendant le pilote.
- Le planning et les quiz sont effectivement utilisés, et pas seulement affichés.
- Les retours des élèves permettent d'identifier les fonctions à améliorer avant juillet 2027.

Les valeurs chiffrées d'adoption seront affinées lorsque le nombre d'élèves invités pour le pilote sera connu.

---

## 16. Contraintes, risques et réponses prévues

| Risque ou contrainte | Effet possible | Réponse prévue |
|---|---|---|
| Connexion lente ou instable | Échec des téléversements et frustration | PWA, file de synchronisation, reprise et messages clairs |
| Mode hors ligne complet | Complexité technique et conflits de données | Architecture pensée hors ligne dès le départ et règles de conflit explicites |
| Audio et vidéo volumineux | Coûts élevés et stockage saturé | Quotas, limites, compression éventuelle et téléchargement explicite |
| Stockage limité du navigateur | Certains médias indisponibles hors ligne | Informer l'élève et permettre de choisir les ressources conservées localement |
| Contenus non vérifiés | Erreurs pédagogiques | Publication commune réservée à l'administration |
| Droits d'auteur | Retrait de ressources ou responsabilité | Source, autorisation, politique de publication et procédure de retrait |
| Comptes de mineurs | Risque de confidentialité | Collecte minimale, accès privé et politique adaptée |
| Récupération gérée par l'administrateur | Usurpation ou charge de support | Procédure d'identification et journal administratif |
| Délai avant juillet 2027 | Fonctionnalités inachevées | Livraisons progressives et périmètre MVP strict |
| Liste officielle des matières non validée | Mauvaise structure pédagogique | Validation avec une source officielle avant intégration des contenus |

---

## 17. Décisions encore ouvertes

Ces décisions ne remettent pas en cause la vision, mais doivent être résolues avant les parties techniques concernées :

- [ ] Liste officielle des matières, chapitres et coefficients de Série D — à valider avant la Partie 5.
- [ ] Source officielle de référence du programme burkinabè — document à fournir par le porteur du projet avant la Partie 5.
- [ ] Nombre d'élèves du premier groupe pilote.
- [ ] Méthode exacte d'invitation : compte créé par l'administrateur ou code d'invitation.
- [ ] Procédure sécurisée de récupération d'un compte.
- [ ] Formats exacts, taille maximale et quota des fichiers.
- [ ] Règles de résolution des conflits hors ligne pour chaque donnée.
- [ ] Navigateurs et versions d'Android à prendre en charge.
- [ ] Hébergement, budget de stockage et politique de sauvegarde.
- [ ] Politique de confidentialité et conditions de publication des contenus.
- [ ] Modèle économique après le MVP.

---

## 18. Validation de la Partie 1

### Points déjà définis

- [x] Mission principale du produit.
- [x] Problème à résoudre.
- [x] Pays et série pilote.
- [x] Utilisateurs du MVP.
- [x] Support et langue prioritaires.
- [x] Mode d'accès et d'authentification.
- [x] Types de ressources.
- [x] Confidentialité par défaut.
- [x] Priorités fonctionnelles du MVP.
- [x] Exigence de fonctionnement hors connexion.
- [x] Fonctions exclues du MVP.
- [x] Histoires utilisateur principales.
- [x] Critères d'acceptation initiaux.
- [x] Indicateurs de réussite proposés.

### Approbation

- [x] Le présent cahier des charges a été relu par le porteur du projet.
- [x] Aucune correction supplémentaire n'a été demandée sur la version 0.1.
- [x] Le cahier des charges a été approuvé le 15 octobre 2026.
- [x] Le passage à la Partie 2 — Expérience utilisateur et design est autorisé.

**Réserve non bloquante :** le porteur du projet fournira ultérieurement un document officiel permettant de valider les matières, chapitres et coefficients de Série D. Cette validation devra impérativement être terminée avant la Partie 5 — Matières et contenus pédagogiques.

La Partie 1 est désormais `✅ Terminée`.
