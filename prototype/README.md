# Prototype UX/UI BAC-2027

Prototype statique et interactif réalisé pendant la Partie 2 du projet.

## Objectif

Valider la navigation, la hiérarchie de l'information, le style visuel, le responsive et les principaux parcours avant de choisir l'architecture technique définitive.

Ce prototype ne contient :

- ni backend ;
- ni authentification réelle ;
- ni base de données ;
- ni téléversement réel ;
- ni synchronisation réelle.

Toutes les données et interactions sont simulées dans le navigateur.

## Lancer le prototype

Depuis la racine du dépôt :

```bash
python3 -m http.server 4173 --bind 0.0.0.0 --directory prototype
```

Puis ouvrir `http://localhost:4173`.

## Démonstration élève

Les identifiants sont déjà renseignés :

- nom d'utilisateur : `awa07`
- mot de passe : `bac2027`

Parcours disponibles :

1. connexion simulée ;
2. navigation entre Accueil, Ressources, Planning, Quiz et Profil ;
3. ajout d'une ressource personnelle ;
4. recherche et changement entre classeur, bibliothèque et hors ligne ;
5. ajout et réalisation d'une séance ;
6. quiz interactif de trois questions ;
7. aperçu de progression ;
8. simulation du passage hors ligne et de la synchronisation ;
9. gestion visuelle du stockage.

## Démonstration administrateur

Depuis l'écran de connexion, utiliser le bouton **Voir l'espace administrateur**.

Parcours disponibles :

- tableau de bord ;
- liste des élèves et création d'une invitation ;
- aperçu de la structure pédagogique ;
- ressources communes ;
- quiz ;
- stockage et synchronisation ;
- journal administratif.

## Fichiers

- `index.html` : structure et contenu du prototype ;
- `styles.css` : identité visuelle, composants et responsive ;
- `app.js` : navigation et interactions simulées.

## Référence de conception

Voir [`../CONCEPTION_UX_UI.md`](../CONCEPTION_UX_UI.md).
