# Analyse des sources reçues pour la Partie 5

**Date de l'analyse :** 16 octobre 2026  
**Décision :** les documents constituent le **catalogue pédagogique initial choisi par le porteur du projet**. Ils restent distincts d'un référentiel institutionnel officiel et exhaustif de la Série D.

## Documents examinés

Neuf fichiers PDF ont été reçus. Ils contiennent au total **203 entrées de cours** visibles.

| Fichier | Pages | Entrées | Indications de série observées |
|---|---:|---:|---|
| `Programme ang.pdf` | 2 | 18 | Trois entrées indiquent C et D ; les autres indiquent seulement la terminale. |
| `Programme chimie.pdf` | 2 | 26 | Deux entrées indiquent C, D et E ; les autres n'indiquent pas de série. |
| `Programme fr.pdf` | 2 | 24 | Aucune série n'est précisée. |
| `Programme geo.pdf` | 1 | 4 | Trois entrées indiquent explicitement la Terminale A. |
| `Programme his.pdf` | 2 | 10 | Sept entrées indiquent explicitement la Terminale A. |
| `Programme math.pdf` | 2 | 21 | Une entrée indique D, une autre C ; les autres n'indiquent pas de série. |
| `Programme philo.pdf` | 2 | 31 | Aucune série n'est précisée. |
| `Programme Sciences physiques terminale.pdf` | 3 | 32 | Une entrée indique C-D-E et une autre C-E ; les autres n'indiquent pas de série. |
| `Programme SVT.pdf` | 3 | 37 | Aucune série n'est précisée. |

L'inventaire textuel complet, avec le nombre de pages, les métadonnées et l'empreinte SHA-256 de chaque PDF, se trouve dans [`sources/catalogue-fasoeducation-2026-10-15.json`](./sources/catalogue-fasoeducation-2026-10-15.json).

## Provenance constatée

Les métadonnées, les titres et les liens incorporés montrent qu'il s'agit d'impressions navigateur de pages du catalogue **Faso e-education**, sous `fasoeducation.bf`. Les liens pointent vers les rubriques de cours de terminale du portail.

La date PDF du **15 octobre 2026** correspond à la création des impressions ; elle ne démontre ni la date de publication ni l'année d'application d'un programme scolaire.

## Ce que ces documents permettent d'établir

Ils constituent un inventaire utile de ressources pédagogiques disponibles sur le portail. Sept familles de matières candidates y sont observées :

1. Français ;
2. Anglais ;
3. Mathématiques ;
4. Philosophie ;
5. Histoire-géographie ;
6. Sciences physiques, avec physique et chimie ;
7. Sciences de la vie et de la Terre.

Ces listes pourront servir à préparer un **brouillon de chapitres et de ressources**, à condition que chaque entrée garde sa provenance et son statut non validé jusqu'à la vérification pédagogique.

## Pourquoi la validation officielle reste impossible

Les PDF présentent des liens vers des cours disponibles ; ils ne prennent pas la forme d'un référentiel administratif ou d'un programme réglementaire. Ils ne contiennent notamment pas :

- d'autorité émettrice explicitement identifiable dans le document ;
- d'arrêté, de circulaire ou de décision d'application ;
- d'édition du programme ou d'année scolaire de référence ;
- de liste déclarée exhaustive des matières de la Série D ;
- de coefficients, volumes horaires ou statuts obligatoire/facultatif ;
- de découpage complet certifié pour chaque matière.

Le périmètre mélange en outre plusieurs séries : Terminales A, C, D et E. Une ressource étiquetée pour A, C ou E ne peut pas être attribuée automatiquement à la Série D.

## Conséquence pour le projet

Le 17 octobre 2026, le porteur du projet a précisé que ces documents constituent le **catalogue pédagogique de départ qu'il souhaite utiliser** : l'élève renseigne chaque jour ce qui a été étudié, puis BAC-2027 l'aide à structurer, expliquer et vérifier son cours.

La Partie 5 peut donc passer à `🟨 En cours` sur cette base, sans présenter les 203 entrées comme un programme institutionnel certifié. Leur statut restera visible dans les données : `catalogue fourni par le porteur — validation institutionnelle en attente`.

Une source de validation institutionnelle pourra ensuite renforcer le référentiel. Une source adaptée peut être, par exemple :

- un arrêté, une circulaire ou une grille officielle du baccalauréat indiquant les matières et coefficients de la Série D ;
- un guide officiel du candidat ou un relevé officiel faisant apparaître toutes les épreuves de Série D ;
- les programmes ou curricula émis par l'autorité éducative, identifiant explicitement la Terminale D, leur date d'application et leur périmètre.

Une photo ou un scan lisible convient si les éléments d'identification du document et toutes les pages utiles sont présents.
