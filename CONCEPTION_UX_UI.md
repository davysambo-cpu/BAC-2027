# Conception UX/UI — BAC-2027

> **Version :** 1.0  
> **Date :** 15 octobre 2026  
> **Statut :** `✅ Approuvé`  
> **Partie du plan :** Partie 2 — Expérience utilisateur et design  
> **Référence fonctionnelle :** [CAHIER_DES_CHARGES.md](./CAHIER_DES_CHARGES.md)

---

## 1. Objectif de la conception

Ce document transforme le cahier des charges approuvé en une expérience concrète, simple et cohérente pour :

- l'élève de Série D qui construit son classeur numérique ;
- l'élève qui planifie ses révisions et réalise des quiz ;
- l'administrateur qui gère les comptes et les contenus communs ;
- l'utilisation sur téléphone, ordinateur et avec une connexion instable.

Il définit :

- l'arborescence de l'application ;
- les navigations élève et administrateur ;
- les parcours utilisateurs principaux ;
- l'inventaire des pages ;
- les wireframes basse fidélité ;
- l'identité visuelle ;
- les composants réutilisables ;
- les règles responsive et d'accessibilité ;
- le périmètre du prototype interactif.

---

## 2. Décisions UX/UI retenues

| Sujet | Décision |
|---|---|
| Navigation élève | 5 entrées : Accueil, Ressources, Planning, Quiz et Profil |
| Organisation des ressources | « Mon classeur », « Bibliothèque » et « Hors ligne » dans la rubrique Ressources |
| Style | Sérieux et académique |
| Palette | Vert profond et turquoise, avec fonds neutres |
| Tableau de bord | Vue d'ensemble complète, organisée par priorité |
| Mobile | Navigation inférieure persistante |
| Ordinateur | Navigation latérale persistante |
| Administration | Interface dédiée avec navigation latérale |
| Densité | Informations riches, mais regroupées en blocs lisibles |
| Mode hors ligne | État de connexion et de synchronisation toujours compréhensible |

### Pourquoi cinq entrées ?

Cinq entrées offrent le meilleur compromis pour le MVP :

1. **Accueil** donne une vue globale.
2. **Ressources** réunit le classeur personnel et la bibliothèque sans les confondre.
3. **Planning** reste directement accessible pour encourager l'organisation.
4. **Quiz** rend l'entraînement visible et régulier.
5. **Profil** regroupe compte, stockage, synchronisation et réglages.

La **Progression** possède une page complète, mais elle est accessible depuis le tableau de bord et la rubrique Quiz plutôt que d'occuper une sixième entrée.

---

## 3. Principes d'expérience

### 3.1 Toujours montrer la prochaine action

Même avec une vue d'ensemble complète, chaque écran doit présenter une action principale claire :

- Accueil : `Ajouter un cours` ou `Commencer la prochaine séance` ;
- Ressources : `Ajouter une ressource` ;
- Planning : `Planifier une séance` ;
- Quiz : `Commencer un quiz` ;
- Profil : aucune action urgente sauf en cas de synchronisation ou stockage problématique.

### 3.2 Privé et partagé ne doivent jamais être confondus

Les ressources personnelles et communes doivent avoir :

- des onglets distincts ;
- des libellés visibles ;
- des icônes et badges textuels ;
- des actions différentes ;
- une confirmation explicite avant toute soumission à l'administration.

### 3.3 Le hors-ligne doit inspirer confiance

L'application ne doit pas seulement afficher « hors ligne ». Elle doit indiquer :

- ce qui fonctionne encore ;
- ce qui est enregistré sur l'appareil ;
- ce qui attend une synchronisation ;
- ce qui a échoué ;
- ce que l'élève doit faire ensuite.

### 3.4 Ne jamais surcharger l'élève

Le tableau de bord peut être complet sans afficher tous les détails. Chaque bloc présente un résumé et un lien `Voir tout`.

### 3.5 Employer un vocabulaire scolaire simple

Préférer :

- `Mon classeur` à `Gestionnaire de ressources` ;
- `Séance de révision` à `Événement` ;
- `À synchroniser` à `Mutation en attente` ;
- `Résultat` à `Rapport analytique` ;
- `Matière` et `Chapitre` aux termes techniques internes.

---

## 4. Arborescence générale

```text
BAC-2027
│
├── Accès
│   ├── Connexion
│   ├── Première connexion / activation
│   ├── Accès perdu — contacter l'administration
│   └── Écran hors ligne avant authentification
│
├── Espace élève
│   ├── Accueil
│   │   ├── Vue d'ensemble
│   │   ├── Activité récente
│   │   └── Accès à la progression détaillée
│   │
│   ├── Ressources
│   │   ├── Mon classeur
│   │   │   ├── Liste et recherche
│   │   │   ├── Ajouter une ressource
│   │   │   ├── Détail d'une ressource
│   │   │   └── Modifier une ressource
│   │   ├── Bibliothèque commune
│   │   │   ├── Liste et recherche
│   │   │   └── Détail d'une ressource commune
│   │   └── Disponibles hors ligne
│   │
│   ├── Planning
│   │   ├── Vue agenda / liste
│   │   ├── Ajouter une séance
│   │   ├── Détail d'une séance
│   │   └── Modifier une séance
│   │
│   ├── Quiz
│   │   ├── Quiz disponibles
│   │   ├── Détail et consignes
│   │   ├── Passage du quiz
│   │   ├── Résultat et correction
│   │   ├── Historique
│   │   └── Progression détaillée
│   │
│   └── Profil
│       ├── Informations personnelles
│       ├── Préférences
│       ├── Stockage et téléchargements
│       ├── Synchronisation
│       ├── Aide
│       └── Déconnexion
│
└── Espace administration
    ├── Tableau de bord
    ├── Élèves
    │   ├── Liste
    │   ├── Créer / inviter
    │   ├── Détail
    │   └── Réinitialiser / désactiver
    ├── Structure pédagogique
    │   ├── Matières
    │   └── Chapitres
    ├── Ressources communes
    │   ├── Liste
    │   ├── Ajouter
    │   ├── Modifier
    │   └── Publier / retirer
    ├── Quiz
    │   ├── Liste
    │   ├── Créer / modifier
    │   ├── Questions et corrections
    │   └── Publier / retirer
    ├── Stockage et synchronisation
    ├── Journal administratif
    └── Paramètres
```

---

## 5. Routes fonctionnelles proposées

Les routes sont indicatives. Leur structure définit la navigation, pas encore la technologie.

### 5.1 Accès

| Route | Page | Accès |
|---|---|---|
| `/connexion` | Connexion | Public contrôlé |
| `/activation` | Première connexion | Invitation valide |
| `/acces-perdu` | Instructions de récupération | Public contrôlé |
| `/indisponible-hors-ligne` | Accès impossible sans session locale | Public contrôlé |

### 5.2 Élève

| Route | Page | Navigation principale |
|---|---|---|
| `/app` | Tableau de bord | Accueil |
| `/app/ressources` | Mon classeur | Ressources |
| `/app/ressources/nouvelle` | Ajouter une ressource | Ressources |
| `/app/ressources/:id` | Détail personnel | Ressources |
| `/app/bibliotheque` | Bibliothèque commune | Ressources |
| `/app/bibliotheque/:id` | Détail commun | Ressources |
| `/app/hors-ligne` | Ressources téléchargées | Ressources |
| `/app/planning` | Planning | Planning |
| `/app/planning/nouvelle` | Ajouter une séance | Planning |
| `/app/planning/:id` | Détail d'une séance | Planning |
| `/app/quiz` | Quiz disponibles | Quiz |
| `/app/quiz/:id` | Présentation du quiz | Quiz |
| `/app/quiz/:id/passage` | Questions | Quiz |
| `/app/tentatives/:id` | Résultat et correction | Quiz |
| `/app/historique` | Historique des quiz | Quiz |
| `/app/progression` | Progression détaillée | Accueil et Quiz |
| `/app/profil` | Profil | Profil |
| `/app/profil/stockage` | Stockage hors ligne | Profil |
| `/app/profil/synchronisation` | État de synchronisation | Profil |
| `/app/aide` | Aide | Profil |

### 5.3 Administration

| Route | Page |
|---|---|
| `/admin` | Tableau de bord administratif |
| `/admin/eleves` | Liste des élèves |
| `/admin/eleves/nouveau` | Créer ou inviter un élève |
| `/admin/eleves/:id` | Détail d'un élève |
| `/admin/matieres` | Matières et chapitres |
| `/admin/ressources` | Ressources communes |
| `/admin/ressources/nouvelle` | Créer une ressource commune |
| `/admin/ressources/:id` | Modifier et publier une ressource |
| `/admin/quiz` | Liste des quiz |
| `/admin/quiz/nouveau` | Créer un quiz |
| `/admin/quiz/:id` | Modifier, prévisualiser et publier |
| `/admin/stockage` | Stockage et synchronisation |
| `/admin/journal` | Journal administratif |
| `/admin/parametres` | Paramètres administratifs |

---

## 6. Navigation élève

### 6.1 Navigation mobile

Une barre fixe en bas contient cinq destinations :

| Icône indicative | Libellé | Destination |
|---|---|---|
| Maison | Accueil | Vue d'ensemble |
| Dossier | Ressources | Mon classeur, bibliothèque et hors ligne |
| Calendrier | Planning | Séances de révision |
| Liste cochée | Quiz | Quiz, résultats et progression |
| Utilisateur | Profil | Compte, stockage et synchronisation |

Règles :

- le libellé reste visible sous chaque icône ;
- l'onglet actif utilise couleur, graisse et indicateur de forme ;
- aucune fonction essentielle ne dépend d'un appui long ;
- la barre respecte la zone sûre des téléphones ;
- une page secondaire conserve le contexte de son onglet ;
- les formulaires longs utilisent une page complète, pas une petite fenêtre modale.

### 6.2 Barre supérieure élève

La barre supérieure affiche selon la page :

- le titre ;
- un bouton retour sur les pages secondaires ;
- un indicateur de connexion/synchronisation ;
- une action contextuelle éventuelle, comme la recherche ou les filtres.

### 6.3 Navigation tablette et ordinateur

À partir d'une largeur suffisante :

- la barre inférieure devient une navigation verticale ;
- le contenu peut utiliser deux ou trois colonnes ;
- la navigation reste visible ;
- le bouton principal demeure proche du titre de page ;
- la largeur de lecture des textes reste limitée.

---

## 7. Navigation administrateur

L'administration utilise une barre latérale, car elle comporte davantage de rubriques et d'actions de gestion.

Ordre recommandé :

1. Vue d'ensemble
2. Élèves
3. Matières et chapitres
4. Ressources
5. Quiz
6. Stockage et synchronisation
7. Journal administratif
8. Paramètres

Sur petit écran, la barre devient un panneau ouvrable. Les tableaux se transforment en cartes lisibles plutôt que de provoquer un défilement horizontal permanent.

Toute action sensible — désactivation, suppression, retrait d'une publication ou réinitialisation — demande :

- une confirmation explicite ;
- une explication de l'impact ;
- une trace dans le journal administratif.

---

## 8. Structure du tableau de bord élève

Le tableau de bord offre une vue d'ensemble, mais son ordre suit l'urgence :

1. **En-tête personnel** : salutation, date et état de synchronisation.
2. **Résumé** : nombre de ressources, progression et quiz récents.
3. **Aujourd'hui** : prochaine séance et tâches en retard.
4. **Accès rapide** : ajouter un cours, planifier, commencer un quiz.
5. **Ressources récentes** : trois dernières ressources personnelles ou communes consultées.
6. **Progression par matière** : résumé de quelques matières avec lien vers le détail.
7. **Nouveautés de la bibliothèque** : dernières publications administratives.

### Règle de densité

Sur téléphone, les sections sont empilées. Sur ordinateur, elles forment une grille, sans changer l'ordre logique de lecture.

---

## 9. Parcours utilisateurs

### 9.1 Activation et première connexion

```text
Invitation créée par l'administrateur
        ↓
Élève reçoit son nom d'utilisateur et son code temporaire
        ↓
Écran d'activation
        ↓
Choix d'un mot de passe personnel
        ↓
Confirmation du profil Série D
        ↓
Courte présentation : classeur, planning, quiz, hors-ligne
        ↓
Tableau de bord avec action « Ajouter mon premier cours »
```

Principes :

- quatre écrans maximum après la saisie des informations ;
- possibilité d'ignorer la présentation ;
- mot de passe expliqué avec des règles visibles ;
- aucune demande de donnée non nécessaire.

### 9.2 Ajouter un cours avec une connexion disponible

```text
Accueil ou Ressources
        ↓
Ajouter une ressource
        ↓
Choisir : note, document, image, audio ou vidéo
        ↓
Ajouter titre + matière + chapitre facultatif
        ↓
Enregistrer
        ↓
État « Synchronisation… »
        ↓
État « Synchronisé » + ressource visible dans Mon classeur
```

### 9.3 Ajouter une ressource hors ligne

```text
Indicateur « Hors ligne »
        ↓
Ajouter une ressource
        ↓
Enregistrement local
        ↓
Message « Enregistré sur cet appareil — à synchroniser »
        ↓
Retour de la connexion
        ↓
Synchronisation en arrière-plan
        ↓
Confirmation « Synchronisé » ou action claire en cas d'erreur
```

### 9.4 Consulter et enregistrer une ressource commune hors ligne

```text
Ressources → Bibliothèque
        ↓
Ouvrir une ressource
        ↓
Voir taille et type du fichier
        ↓
Choisir « Rendre disponible hors ligne »
        ↓
Téléchargement avec progression
        ↓
Badge « Disponible hors ligne »
```

### 9.5 Planifier une séance

```text
Planning
        ↓
Planifier une séance
        ↓
Choisir matière, chapitre, date et durée
        ↓
Enregistrer
        ↓
Séance visible dans Aujourd'hui et dans le planning
        ↓
Marquer comme terminée
        ↓
Mise à jour de la progression
```

### 9.6 Réaliser un quiz

```text
Quiz disponibles
        ↓
Choisir un quiz et lire les consignes
        ↓
Commencer
        ↓
Répondre question par question
        ↓
Vérifier puis valider
        ↓
Résultat
        ↓
Correction détaillée
        ↓
Historique et progression mis à jour
```

Si l'élève est hors ligne, l'interface indique avant le démarrage si le quiz complet et sa correction sont disponibles localement.

### 9.7 Publier une ressource commune

```text
Administration → Ressources
        ↓
Créer une ressource
        ↓
Ajouter contenu, source, matière et chapitre
        ↓
Enregistrer en brouillon
        ↓
Prévisualiser
        ↓
Publier
        ↓
Ressource visible dans la bibliothèque élève
```

---

## 10. Inventaire des pages essentielles

| ID | Page | Rôle | Action principale | État vide essentiel |
|---|---|---|---|---|
| A01 | Connexion | Tous | Se connecter | Instructions d'accès |
| A02 | Activation | Élève | Activer le compte | Invitation invalide ou expirée |
| E01 | Tableau de bord | Élève | Continuer sa prochaine action | Ajouter le premier cours |
| E02 | Mon classeur | Élève | Ajouter une ressource | Expliquer comment commencer |
| E03 | Ajouter une ressource | Élève | Enregistrer | Aucun fichier sélectionné |
| E04 | Détail personnel | Élève | Consulter ou modifier | Fichier indisponible localement |
| E05 | Bibliothèque | Élève | Consulter une ressource | Aucune publication disponible |
| E06 | Ressource commune | Élève | Ouvrir ou télécharger | Média non disponible hors ligne |
| E07 | Planning | Élève | Planifier une séance | Créer la première séance |
| E08 | Formulaire séance | Élève | Enregistrer | Matière non sélectionnée |
| E09 | Quiz disponibles | Élève | Choisir un quiz | Aucun quiz publié |
| E10 | Passage du quiz | Élève | Répondre puis valider | Quiz incomplet hors ligne |
| E11 | Résultat | Élève | Voir la correction | Résultat en attente de synchronisation |
| E12 | Progression | Élève | Identifier une priorité | Pas encore assez d'activité |
| E13 | Profil | Élève | Gérer son espace | Sans objet |
| E14 | Stockage | Élève | Libérer ou télécharger | Aucun contenu hors ligne |
| E15 | Synchronisation | Élève | Relancer une erreur | Tout est synchronisé |
| D01 | Tableau de bord admin | Admin | Traiter les éléments prioritaires | Aucune alerte |
| D02 | Élèves | Admin | Inviter un élève | Aucun élève invité |
| D03 | Détail élève | Admin | Gérer l'accès | Compte introuvable |
| D04 | Matières et chapitres | Admin | Organiser la structure | Programme non configuré |
| D05 | Ressources admin | Admin | Créer une ressource | Aucune ressource commune |
| D06 | Éditeur de ressource | Admin | Enregistrer ou publier | Contenu incomplet |
| D07 | Quiz admin | Admin | Créer un quiz | Aucun quiz |
| D08 | Éditeur de quiz | Admin | Ajouter des questions | Aucune question |
| D09 | Journal | Admin | Examiner une action | Aucun événement sensible |

---

## 11. Wireframes basse fidélité

Les wireframes montrent la hiérarchie. Ils ne représentent pas encore le rendu graphique final.

### 11.1 Connexion mobile

```text
┌──────────────────────────────┐
│          BAC-2027            │
│  Votre espace de préparation │
│                              │
│  Nom d'utilisateur           │
│  ┌────────────────────────┐  │
│  │                        │  │
│  └────────────────────────┘  │
│                              │
│  Mot de passe                │
│  ┌────────────────────────┐  │
│  │                  Voir  │  │
│  └────────────────────────┘  │
│                              │
│  ┌────────────────────────┐  │
│  │      Se connecter      │  │
│  └────────────────────────┘  │
│                              │
│  Accès perdu ?               │
│  Contactez l'administration  │
└──────────────────────────────┘
```

### 11.2 Tableau de bord mobile

```text
┌──────────────────────────────┐
│ BAC-2027       ● Synchronisé │
│                              │
│ Bonjour Awa                   │
│ Jeudi 15 octobre             │
│                              │
│ ┌────────┐ ┌────────┐        │
│ │  18    │ │  42 %  │        │
│ │cours   │ │progrès │        │
│ └────────┘ └────────┘        │
│                              │
│ Aujourd'hui          Voir →  │
│ ┌──────────────────────────┐ │
│ │ Mathématiques · 17 h 00  │ │
│ │ Suites · 45 min          │ │
│ │        Commencer         │ │
│ └──────────────────────────┘ │
│                              │
│ Actions rapides              │
│ [+ Cours] [Planifier] [Quiz] │
│                              │
│ Ressources récentes  Voir →  │
│ ▣ Limites et continuité      │
│ ▣ Génétique — notes          │
│                              │
│ Progression          Détail →│
│ Maths       ██████░░  68 %   │
│ SVT         ████░░░░  46 %   │
│                              │
├──────────────────────────────┤
│Accueil Ress. Planning Quiz Moi│
└──────────────────────────────┘
```

### 11.3 Ressources mobile

```text
┌──────────────────────────────┐
│ Ressources       🔍   Filtres│
│                              │
│ [Mon classeur] [Bibliothèque]│
│ [Hors ligne]                 │
│                              │
│ ┌──────────────────────────┐ │
│ │ + Ajouter une ressource  │ │
│ └──────────────────────────┘ │
│                              │
│ Mathématiques · 8            │
│ ┌──────────────────────────┐ │
│ │ PDF  Limites             │ │
│ │ Analyse · Synchronisé    │ │
│ └──────────────────────────┘ │
│                              │
│ SVT · 6                      │
│ ┌──────────────────────────┐ │
│ │ 🎧 Révision génétique    │ │
│ │ À synchroniser           │ │
│ └──────────────────────────┘ │
│                              │
├──────────────────────────────┤
│Accueil Ress. Planning Quiz Moi│
└──────────────────────────────┘
```

### 11.4 Ajout d'une ressource mobile

```text
┌──────────────────────────────┐
│ ← Ajouter une ressource      │
│                              │
│ Type                         │
│ [Note] [Document] [Image]    │
│ [Audio] [Vidéo]              │
│                              │
│ Titre *                      │
│ ┌──────────────────────────┐ │
│ └──────────────────────────┘ │
│                              │
│ Matière *                    │
│ ┌──────────────────────────┐ │
│ │ Choisir              ▾   │ │
│ └──────────────────────────┘ │
│                              │
│ Chapitre                     │
│ ┌──────────────────────────┐ │
│ │ Choisir              ▾   │ │
│ └──────────────────────────┘ │
│                              │
│ Fichier ou contenu           │
│ ┌──────────────────────────┐ │
│ │ Ajouter depuis l'appareil│ │
│ └──────────────────────────┘ │
│                              │
│ Enregistré dans votre espace │
│ privé.                       │
│                              │
│ [Annuler]     [Enregistrer]  │
└──────────────────────────────┘
```

### 11.5 Planning mobile

```text
┌──────────────────────────────┐
│ Planning          + Planifier│
│                              │
│ [Liste] [Semaine]            │
│                              │
│ Aujourd'hui                  │
│ ┌──────────────────────────┐ │
│ │ 17:00  Mathématiques     │ │
│ │ Suites · 45 min          │ │
│ │ ○ À faire                │ │
│ └──────────────────────────┘ │
│                              │
│ Demain                       │
│ ┌──────────────────────────┐ │
│ │ 18:30  SVT               │ │
│ │ Génétique · 30 min       │ │
│ └──────────────────────────┘ │
│                              │
│ Séances terminées    Voir →  │
│                              │
├──────────────────────────────┤
│Accueil Ress. Planning Quiz Moi│
└──────────────────────────────┘
```

### 11.6 Quiz mobile

```text
┌──────────────────────────────┐
│ Quiz                  ⟳ Sync │
│                              │
│ Recommandé                   │
│ ┌──────────────────────────┐ │
│ │ Mathématiques            │ │
│ │ Limites · 10 questions   │ │
│ │ 10 min · Disponible      │ │
│ │       Commencer          │ │
│ └──────────────────────────┘ │
│                              │
│ Toutes les matières    Filtrer│
│ ▣ SVT · Génétique           │
│ ▣ Physique · Mécanique      │
│                              │
│ Dernier résultat             │
│ 7/10 · Voir la correction → │
│                              │
│ [Historique] [Progression]   │
│                              │
├──────────────────────────────┤
│Accueil Ress. Planning Quiz Moi│
└──────────────────────────────┘
```

### 11.7 Profil et synchronisation mobile

```text
┌──────────────────────────────┐
│ Profil                       │
│                              │
│ Awa K.                       │
│ Série D · @awa07             │
│                              │
│ Compte                     > │
│ Préférences                > │
│ Stockage         1,2 / 2 Go> │
│ Synchronisation   2 en attente│
│ Aide                       > │
│                              │
│ ┌──────────────────────────┐ │
│ │ Synchroniser maintenant  │ │
│ └──────────────────────────┘ │
│                              │
│ Se déconnecter               │
│                              │
├──────────────────────────────┤
│Accueil Ress. Planning Quiz Moi│
└──────────────────────────────┘
```

### 11.8 Administration sur ordinateur

```text
┌───────────────┬───────────────────────────────────────────────┐
│ BAC-2027 ADMIN│ Vue d'ensemble                 Administrateur │
│               ├───────────────────────────────────────────────┤
│ Vue d'ensemble│ [128 élèves] [42 ressources] [18 quiz]        │
│ Élèves        │                                               │
│ Pédagogie     │ Actions prioritaires                          │
│ Ressources    │ ┌──────────────────┐ ┌──────────────────────┐ │
│ Quiz          │ │ 5 invitations    │ │ 3 erreurs de sync   │ │
│ Stockage      │ │ Voir les élèves  │ │ Examiner            │ │
│ Journal       │ └──────────────────┘ └──────────────────────┘ │
│ Paramètres    │                                               │
│               │ Ressources récentes                           │
│               │ Titre          Matière   Statut     Action    │
│               │ Limites        Maths     Publié     Ouvrir    │
│               │ Génétique      SVT       Brouillon  Modifier  │
└───────────────┴───────────────────────────────────────────────┘
```

---

## 12. Identité visuelle

### 12.1 Direction

L'identité est :

- sérieuse et rassurante ;
- moderne sans paraître enfantine ;
- académique sans ressembler à un document administratif ;
- suffisamment contrastée pour les conditions d'utilisation réelles ;
- peu dépendante des images décoratives.

### 12.2 Palette proposée

| Jeton | Couleur | Usage |
|---|---|---|
| `primary-900` | `#0B3D2E` | Titres forts, navigation sombre |
| `primary-700` | `#146B52` | Boutons principaux, onglet actif |
| `primary-100` | `#DDF3EA` | Fonds de sélection et progrès légers |
| `accent-700` | `#0F766E` | Accents turquoise accessibles |
| `accent-100` | `#CCFBF1` | Badges et fonds informatifs |
| `background` | `#F5F8F7` | Fond général |
| `surface` | `#FFFFFF` | Cartes, formulaires et panneaux |
| `text` | `#17211D` | Texte principal |
| `text-muted` | `#53645D` | Texte secondaire |
| `border` | `#D5E0DB` | Bordures et séparateurs |
| `success` | `#15803D` | Succès et synchronisation terminée |
| `warning` | `#A16207` | Attente, stockage ou attention |
| `danger` | `#B91C1C` | Erreur et action destructive |
| `info` | `#0369A1` | Information générale |
| `focus` | `#0891B2` | Anneau de focus visible |

Règles :

- le rouge n'est jamais utilisé comme simple décoration ;
- le vert de marque et le vert de succès sont accompagnés de texte ou d'icône ;
- tout texte sur fond coloré doit respecter le contraste AA ;
- un état n'est jamais indiqué uniquement par une couleur.

### 12.3 Typographie

Police recommandée : **Inter**, avec une pile système de secours.

```css
font-family: Inter, ui-sans-serif, system-ui, -apple-system,
  BlinkMacSystemFont, "Segoe UI", sans-serif;
```

Échelle proposée :

| Style | Mobile | Ordinateur | Graisse |
|---|---:|---:|---:|
| Titre de page | 28 px / 34 px | 32 px / 40 px | 700 |
| Titre de section | 22 px / 28 px | 24 px / 32 px | 700 |
| Titre de carte | 18 px / 24 px | 18 px / 24 px | 600 |
| Corps | 16 px / 24 px | 16 px / 24 px | 400 |
| Petit texte | 14 px / 20 px | 14 px / 20 px | 400 ou 500 |
| Légende | 12 px / 16 px | 12 px / 16 px | 500 |

Le corps de texte ne descend pas sous 16 px dans les formulaires mobiles afin d'éviter les zooms involontaires.

### 12.4 Espacements et formes

- unité de base : `4 px` ;
- espacements usuels : `4, 8, 12, 16, 24, 32, 48 px` ;
- rayon des champs et boutons : `8 px` ;
- rayon des cartes : `12 px` ;
- badges : forme arrondie complète ;
- ombres très discrètes, complétées par une bordure ;
- hauteur minimale des boutons et champs : `44 px`.

### 12.5 Iconographie

- icônes linéaires simples ;
- épaisseur cohérente ;
- libellé textuel pour les navigations principales ;
- taille minimale de 20 px ;
- aucune icône ambiguë sans infobulle ou libellé.

---

## 13. Composants réutilisables

### 13.1 Structure

- `AppShellStudent`
- `AppShellAdmin`
- `TopBar`
- `BottomNavigation`
- `SideNavigation`
- `PageHeader`
- `SectionHeader`

### 13.2 Navigation et actions

- bouton principal, secondaire, discret et destructif ;
- lien avec flèche ;
- onglets ;
- fil d'Ariane administratif ;
- bouton retour ;
- pagination ou chargement progressif ;
- menu contextuel accessible.

### 13.3 Données et contenu

- `SummaryCard`
- `ResourceCard`
- `SessionCard`
- `QuizCard`
- `ProgressBar`
- `ProgressBySubject`
- `StatusBadge`
- tableau administratif responsive ;
- liste groupée par matière ou date.

### 13.4 Formulaires

- champ texte ;
- mot de passe avec affichage contrôlé ;
- sélection de matière et chapitre ;
- zone de note ;
- sélection de fichier ;
- progression de téléversement ;
- date, heure et durée ;
- cases à cocher et boutons radio ;
- messages d'aide et d'erreur associés au champ.

### 13.5 Hors connexion

- `ConnectionBanner`
- `SyncStatus`
- `PendingOperationsList`
- `StorageMeter`
- `DownloadForOfflineButton`
- `ConflictResolutionPanel`

Libellés normalisés :

- `Enregistré sur cet appareil`
- `À synchroniser`
- `Synchronisation en cours`
- `Synchronisé`
- `Échec — réessayer`
- `Conflit à résoudre`

### 13.6 Retours système

- alerte intégrée à la page ;
- notification temporaire ;
- boîte de confirmation ;
- squelette de chargement ;
- barre de progression ;
- état vide illustré sobrement ;
- page d'erreur avec action de récupération.

---

## 14. États obligatoires de chaque écran

Toute page de données doit prévoir :

1. chargement initial ;
2. contenu normal ;
3. liste vide ;
4. erreur récupérable ;
5. accès refusé ;
6. mode hors ligne ;
7. contenu local non synchronisé ;
8. synchronisation en cours ;
9. succès ;
10. contenu supprimé ou devenu indisponible.

Pour un formulaire :

- état initial ;
- validation champ par champ ;
- enregistrement local ;
- envoi serveur ;
- succès ;
- erreur réseau ;
- conflit ;
- prévention d'une double soumission.

---

## 15. Responsive design

### 15.1 Téléphone — moins de 768 px

- une seule colonne ;
- navigation inférieure ;
- formulaires en pleine page ;
- actions principales sur toute la largeur si nécessaire ;
- filtres dans un panneau inférieur ;
- médias lourds non lancés automatiquement ;
- tableaux transformés en cartes.

### 15.2 Tablette — de 768 à 1199 px

- navigation latérale compacte ;
- grille de deux colonnes lorsque le contenu le permet ;
- formulaires avec largeur de lecture limitée ;
- panneaux secondaires possibles sans masquer l'action principale.

### 15.3 Grand écran — à partir de 1200 px

- navigation latérale développée ;
- contenu centré avec largeur maximale ;
- tableau de bord en grille ;
- formulaires et aperçu côte à côte pour l'administration ;
- tableaux complets avec actions accessibles au clavier.

### 15.4 Orientation et zones sûres

- prise en charge du mode portrait en priorité ;
- absence de perte fonctionnelle en paysage ;
- respect des encoches et zones sûres ;
- navigation inférieure non masquée par les contrôles du navigateur.

---

## 16. Accessibilité

Objectif : respecter **WCAG 2.2 niveau AA** sur les parcours essentiels.

### Règles obligatoires

- contraste d'au moins 4,5:1 pour le texte courant ;
- cible tactile d'au moins 44 × 44 px ;
- focus clavier toujours visible ;
- ordre de tabulation logique ;
- titres hiérarchisés ;
- libellé explicite pour chaque champ ;
- erreur expliquée par du texte et reliée au champ ;
- navigation utilisable sans souris ;
- alternatives textuelles pertinentes ;
- sous-titres ou transcription pour les médias communs lorsque nécessaire ;
- respect de la préférence de réduction des animations ;
- aucun contenu essentiel transmis uniquement par couleur, position ou son ;
- annonces adaptées pour les changements de synchronisation importants.

### Quiz accessibles

- progression annoncée sous la forme `Question 3 sur 10` ;
- propositions sélectionnables au clavier ;
- aucun chronomètre dans le quiz MVP sauf nécessité pédagogique future ;
- validation finale confirmée ;
- correction compréhensible sans dépendre du rouge et du vert.

---

## 17. Ton rédactionnel et microcontenus

### Ton

- direct ;
- respectueux ;
- encourageant sans exagération ;
- non culpabilisant ;
- précis en cas d'erreur.

### Exemples

| Situation | Texte recommandé |
|---|---|
| Classeur vide | `Ajoutez votre premier cours pour commencer à construire votre classeur.` |
| Hors ligne | `Vous êtes hors ligne. Votre travail sera conservé sur cet appareil.` |
| Synchronisation en attente | `2 éléments seront synchronisés dès que la connexion reviendra.` |
| Succès | `Votre ressource est synchronisée.` |
| Erreur réseau | `La synchronisation n'a pas abouti. Votre travail reste enregistré sur cet appareil.` |
| Quiz sans correction disponible | `Votre résultat est enregistré. La correction sera disponible après synchronisation.` |
| Planning vide | `Planifiez une première séance pour organiser vos révisions.` |
| Suppression | `Supprimer cette ressource ? Elle sera retirée de cet appareil et de votre compte après synchronisation.` |

Éviter :

- `Une erreur est survenue` sans explication ;
- les termes techniques de base de données ou de réseau ;
- les messages culpabilisants ;
- les points d'exclamation répétés.

---

## 18. Périmètre du prototype interactif

Le prototype autonome est disponible dans [`prototype/`](./prototype/README.md). Il permet de parcourir sans backend réel :

### Élève

1. Connexion simulée.
2. Tableau de bord responsive.
3. Passage entre les cinq entrées principales.
4. Consultation de Mon classeur et de la Bibliothèque.
5. Ouverture du formulaire d'ajout d'une ressource.
6. Consultation du planning.
7. Ouverture d'un quiz, réponse à quelques questions et résultat simulé.
8. Consultation du profil, du stockage et de la synchronisation.
9. Simulation du mode hors ligne et d'éléments en attente.

### Administrateur

1. Tableau de bord.
2. Liste des élèves.
3. Liste des ressources communes.
4. Accès à un formulaire de publication.
5. Liste des quiz.

Le prototype sert à valider les parcours et le visuel. Il ne constitue pas encore l'application finale ni son architecture technique.

---

## 19. Tests UX prévus

Le prototype devra être vérifié avec les scénarios suivants :

1. Un élève invité trouve comment se connecter.
2. Il ajoute une photo de cours et la classe dans une matière.
3. Il comprend que la ressource est privée.
4. Il voit qu'une ressource créée hors ligne attend la synchronisation.
5. Il retrouve une ressource dans son classeur.
6. Il planifie une séance pour le lendemain.
7. Il commence et termine un quiz.
8. Il retrouve sa correction et sa progression.
9. Il identifie l'espace utilisé par les téléchargements hors ligne.
10. Un administrateur invite un élève et publie une ressource.

Questions à observer :

- L'utilisateur sait-il toujours où il se trouve ?
- Comprend-il la différence entre privé et commun ?
- Comprend-il l'état de synchronisation ?
- Trouve-t-il l'action principale sans aide ?
- Peut-il revenir en arrière sans perdre son travail ?

---

## 20. Décisions restant à confirmer

- [x] Valider l'arborescence et les cinq entrées élève.
- [x] Valider les wireframes et l'ordre du tableau de bord.
- [x] Valider la palette vert et turquoise proposée.
- [x] Construire le prototype interactif élève et administrateur.
- [x] Conserver le logotype texte `B27 / BAC-2027` pour le MVP ; un logo définitif pourra être étudié plus tard.
- [x] Définir les largeurs de référence du prototype : téléphone à partir de 320 px, tablette à partir de 768 px et grand écran à partir de 1200 px.
- [x] Reporter les essais sur appareils physiques ciblés à la Partie 8.
- [x] Valider le prototype responsive avant la fin de la Partie 2.

---

## 21. Critères de validation de la Partie 2

- [x] L'élève comprend les cinq destinations principales.
- [x] Toutes les fonctions du MVP possèdent une page ou un parcours identifié.
- [x] Les ressources personnelles et communes sont clairement séparées.
- [x] Le hors-ligne et la synchronisation sont visibles sans dominer l'interface.
- [x] Le tableau de bord reste lisible malgré sa vue d'ensemble complète.
- [x] Le design fonctionne sur téléphone, tablette et ordinateur.
- [x] Les composants essentiels sont définis et réutilisables.
- [x] Les règles d'accessibilité sont intégrées dès la conception.
- [x] Le prototype interactif est testé et approuvé.

## 22. Approbation

- **Conception UX/UI approuvée :** 15 octobre 2026
- **Prototype interactif approuvé :** 15 octobre 2026
- **Référence d'implémentation :** [`prototype/`](./prototype/README.md)
- **Réserve non bloquante :** les essais sur des appareils physiques représentatifs seront réalisés pendant la Partie 8.

La Partie 2 est désormais `✅ Terminée`.
