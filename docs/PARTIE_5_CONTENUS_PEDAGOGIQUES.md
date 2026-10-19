# Partie 5 — Contenus pédagogiques et bilans quotidiens

**Statut :** terminée et validée
**Date :** 17 octobre 2026

## Vision confirmée

BAC-2027 ne doit pas seulement afficher une bibliothèque de cours préchargés. L'élève construit progressivement son espace de révision à partir de ce qu'il reçoit réellement en classe :

1. il choisit la matière et, si possible, une entrée du catalogue fourni ;
2. il saisit son bilan du jour ;
3. BAC-2027 sauvegarde immédiatement cette saisie ;
4. lorsqu'une connexion est disponible, un service pédagogique structure le bilan, complète les explications et recherche des sources ;
5. les contradictions possibles sont signalées avec une proposition argumentée ;
6. l'élève vérifie les propositions avant de constituer son cours personnel ;
7. il revient régulièrement sur chaque thème, s'auto-évalue et suit ce qu'il doit encore travailler avant juillet 2027.

Le porteur confirme que le **programme officiel dont il dispose sera la seule trame documentaire obligatoire**. Les neuf PDF Faso e-education déjà inventoriés en constituent la transcription de travail choisie pour le MVP, avec leur provenance et leur réserve de validation inchangées. Aucun corpus complet de cours officiels supplémentaire n'est attendu : le programme dit quoi couvrir, tandis que les bilans de classe et les cours personnels validés construisent la matière de révision.

## Principes non négociables

### Conserver la parole de l'élève

Le texte original n'est jamais remplacé silencieusement. Il reste consultable à côté du brouillon produit par BAC-2027. Chaque correction possède son propre état :

- proposée ;
- acceptée ;
- refusée ;
- à demander au professeur.

### Expliquer plutôt que déclarer

Une divergence n'est pas présentée comme une erreur uniquement parce qu'un modèle automatisé l'affirme. Toute correction factuelle doit comporter :

- l'extrait concerné ;
- la reformulation proposée ;
- une explication adaptée au niveau Terminale ;
- au moins une source identifiable, lorsque la vérification porte sur un fait ;
- un avertissement clair si la vérification reste incertaine.

### Distinguer les provenances

Une information peut provenir :

1. de la saisie de l'élève ;
2. d'une ressource fournie par le porteur du projet ;
3. d'une source institutionnelle ou pédagogique validée ;
4. d'une source web complémentaire ;
5. d'une génération automatisée.

L'interface ne doit jamais confondre ces catégories.

### Protéger les contenus personnels

Le bilan et le cours produit restent privés par défaut. Une ressource ne rejoint la bibliothèque commune qu'après soumission volontaire et validation par l'administration, conformément au cahier des charges.

## Parcours proposé

### 1. Nouveau bilan du jour

Champs minimaux :

- date du cours ;
- matière ;
- chapitre ou thème, avec possibilité de saisir un intitulé absent du catalogue ;
- titre libre ;
- résumé de ce qui a été étudié ;
- points compris ;
- questions ou difficultés.

Le bilan est modifiable et sauvegardé hors ligne avant tout enrichissement.

### 2. Enrichissement en ligne

Dès que la connexion revient, l'élève peut demander la création d'un brouillon. Le service produit une réponse structurée :

- objectifs et notions du cours ;
- synthèse organisée ;
- définitions essentielles ;
- explications progressives ;
- exemples adaptés ;
- contradictions ou imprécisions possibles ;
- points non vérifiés ;
- sources consultées et date de consultation.

La génération peut échouer ou être reportée sans empêcher l'accès au bilan original.

### 3. Vérification par l'élève

L'élève examine chaque correction proposée, peut l'accepter, la refuser ou la laisser en attente. Il peut aussi modifier directement son brouillon personnel.

### 4. Cours personnel

Après vérification, le brouillon devient une version de cours personnel. Les versions précédentes restent traçables. Le cours pourra ensuite alimenter le planning et les quiz dans les Parties 6 et 7.

## États métier proposés

### Bilan quotidien

- `draft` : commencé sur l'appareil ;
- `sync_pending` : sauvegardé localement, en attente d'envoi ;
- `saved` : enregistré côté serveur ;
- `archived` : conservé mais retiré de la vue active.

### Enrichissement

- `not_requested` ;
- `queued` ;
- `processing` ;
- `needs_review` ;
- `accepted` ;
- `failed`.

Une clé d'idempotence empêchera une reconnexion de lancer plusieurs fois le même traitement.

## Politique de sources proposée

Ordre de priorité :

1. documents institutionnels explicitement validés ;
2. ressources pédagogiques sélectionnées par l'administration ;
3. pages du catalogue fourni et ressources associées dont l'usage est autorisé ;
4. sources web complémentaires clairement citées.

Une source web ne doit pas être utilisée uniquement parce qu'elle apparaît en premier dans une recherche. Pour les corrections importantes, le service cherchera une confirmation indépendante ou indiquera qu'il n'a pas pu conclure.

Les contenus tiers ne doivent pas être recopiés intégralement. BAC-2027 conserve les références et de courts extraits nécessaires à la vérification, puis produit une explication originale.

## Intelligence artificielle et accès à Internet

L'application déployée ne bénéficie pas automatiquement des outils utilisés pendant sa construction. Pour offrir durablement l'enrichissement et la recherche, BAC-2027 devra appeler **côté serveur** :

- un fournisseur de génération de texte ;
- un mécanisme de recherche ou un corpus de sources approuvées ;
- éventuellement un extracteur pour les documents et images.

L'architecture restera indépendante du fournisseur afin d'en changer sans réécrire le produit. Les clés d'accès resteront exclusivement sur le serveur. Les tests utiliseront un fournisseur simulé et déterministe ; aucun appel payant ne sera nécessaire pour exécuter la suite automatisée.

Avant tout envoi à un service externe, l'application devra appliquer les règles de confidentialité et retirer les données personnelles inutiles. Le nom de l'élève n'est pas nécessaire à l'analyse d'un cours.

## Fonctionnement avec une connexion instable

- la saisie, la lecture et la modification du bilan fonctionnent hors ligne ;
- les opérations sont placées dans l'outbox déjà prévue par l'architecture ;
- la génération et la recherche nécessitent une connexion et s'exécutent en tâche de fond ;
- le dernier état connu et les sources déjà enregistrées restent consultables hors ligne ;
- les pièces lourdes ne sont transférées qu'avec l'accord de l'élève et selon sa préférence Wi-Fi.

## Traitement du catalogue reçu

Les sept familles initiales sont : Français, Anglais, Mathématiques, Philosophie, Histoire-géographie, Sciences physiques et SVT.

Chaque entrée importée doit conserver :

- son intitulé original ;
- le fichier et la page source ;
- le lien du portail lorsqu'il est disponible ;
- l'indication de série telle qu'elle apparaît dans le catalogue ;
- un statut de compatibilité Série D ;
- un statut de validation pédagogique et institutionnelle.

Les entrées explicitement étiquetées Terminale A, C ou C-E ne sont pas considérées automatiquement comme des chapitres de Série D. Elles sont conservées pour l'administration, mais masquées dans le catalogue élève tant que leur compatibilité n'est pas établie. Les entrées sans indication de série restent visibles avec le statut « compatibilité Série D à confirmer ».

## Décisions validées le 17 octobre 2026

- le programme officiel disponible suffit comme trame ; l'absence d'un corpus officiel complet de cours ne bloque plus le MVP ;
- une correction est **proposée puis confirmée par l'élève** ; elle n'est jamais appliquée silencieusement ;
- les entrées explicitement destinées à une autre série sont conservées pour l'administration et masquées côté élève ;
- la recherche donne la priorité aux sources fiables approuvées, puis peut utiliser le web plus large avec citations et avertissements ;
- le MVP accepte le texte, les photos et de courts enregistrements audio en **mode économique** : capture sans dépendance payante, traitement automatisé activable et plafonné, texte utilisable comme solution de secours.

## Coût des médias et du traitement automatisé

La saisie de texte, la prise d'une photo et l'enregistrement audio peuvent être réalisés avec les fonctions natives du navigateur, sans licence payante. En revanche, leur **compréhension automatique** est distincte :

- une photo doit être lue par OCR ou par un modèle visuel ;
- un audio doit être transcrit ;
- le texte obtenu doit ensuite être expliqué et vérifié ;
- les fichiers consomment du stockage et du transfert réseau.

Des logiciels libres peuvent éviter un prix facturé à chaque requête, mais ils consomment tout de même les ressources du serveur et sont souvent moins fiables sur l'écriture manuscrite, les langues ou les téléphones modestes. Les offres gratuites de services externes peuvent aider pendant un pilote, mais elles ne constituent pas une garantie durable.

Le MVP peut donc accepter texte, photo et audio tout en prévoyant deux niveaux :

1. un socle toujours disponible qui capture, compresse, sauvegarde et restitue les médias ;
2. des adaptateurs optionnels d'OCR, transcription et génération, activés selon le fournisseur et le plafond de consommation configurés.

## Premier incrément réalisé

Le socle livré le 17 octobre 2026 comprend :

- la migration `0002_faithful_lilith.sql` pour les séries, sources, entrées de catalogue, bilans, pièces jointes, brouillons, corrections et citations ;
- un import idempotent des neuf manifestes : 7 matières, 9 sources, 203 entrées, 191 visibles en Série D et 12 masquées ;
- une API authentifiée de lecture du catalogue ;
- une API privée et idempotente de création et de lecture des bilans quotidiens ;
- une page Ressources responsive avec filtre par matière, recherche, provenance et niveau de validation ;
- un formulaire de bilan conservant le texte original ;
- la capture économique de deux photos de 5 Mo maximum et d'un audio de 10 Mo maximum sur appareil personnel ;
- une sauvegarde locale IndexedDB et une mise en attente de synchronisation pour le bilan textuel.

## Deuxième incrément réalisé

Le transfert sécurisé des médias de bilan est désormais opérationnel de bout en bout :

- le bilan textuel est créé en premier, puis chaque média est envoyé séparément ;
- sur un appareil personnel, les blobs restent dans l'outbox IndexedDB jusqu'à confirmation du serveur et sont renvoyés après une interruption ;
- sur un appareil partagé, les médias sont envoyés immédiatement sans copie persistante locale ;
- l'API vérifie l'authentification, la propriété du bilan, l'en-tête d'intention, le nombre de médias, leur taille et le quota global de l'élève ;
- le type réel JPEG, PNG, WebP, WebM, Ogg, MP3, WAV ou M4A est détecté par signature binaire, sans faire confiance au MIME déclaré ;
- un condensat SHA-256 et des métadonnées sont conservés, mais la clé de stockage est produite par le serveur ;
- les médias restent privés et leur téléchargement passe par une route authentifiée avec contrôle de propriété ;
- le développement peut utiliser le stockage local ignoré par Git, tandis que la production exige un stockage compatible S3 ;
- les tests automatisés couvrent l'envoi, la liste, la restitution binaire, l'en-tête obligatoire, le rejet d'un faux JPEG et le branchement du client web.

Le texte, les photos et l'audio peuvent donc être capturés et synchronisés sans API payante.

## Troisième incrément réalisé

Le parcours de brouillon structuré et de vérification est maintenant branché sans prétendre disposer d'une intelligence factuelle qui n'est pas encore configurée :

- une interface serveur `EnrichmentProvider` isole le futur fournisseur de génération et de recherche ;
- le fournisseur gratuit `local-outline` organise le texte déjà saisi, les points compris et les questions, sans inventer de définition, d'exemple ou de correction ;
- la réponse du fournisseur est strictement validée avant persistance ; une correction est refusée si son extrait ne figure pas dans le bilan original ou si elle ne possède pas de citation valide ;
- chaque génération conserve son fournisseur, son modèle, sa version de consigne, la version du bilan source et ses citations ;
- l'appel est idempotent pour une même version du bilan ;
- l'interface affiche côte à côte le bilan original immuable et le brouillon, puis distingue objectifs, synthèse, explications, exemples et points non résolus ;
- chaque source affiche son niveau de confiance et les références du catalogue précisent explicitement qu'elles prouvent le rattachement du thème, pas l'exactitude des notes ;
- le parcours de correction permet `accepter`, `refuser` ou `demander au professeur`, puis interdit la validation finale tant qu'une proposition attend une décision ;
- le cours validé et ses sources sont mis en cache sur un appareil personnel afin de rester consultables après une coupure ;
- les routes restent privées et contrôlent la propriété du bilan.

Le fournisseur local rend immédiatement utilisable la structuration et le parcours de confirmation, sans coût externe. Il **n'effectue pas** d'OCR, de transcription, de recherche web ou de vérification factuelle.

## Quatrième incrément réalisé — corpus approuvé

BAC-2027 peut désormais recevoir des contenus factuels sans dépendre d'un modèle payant ni qualifier automatiquement une source de fiable :

- l'administration dispose d'un formulaire de création, modification, publication et archivage des fiches de savoir ;
- sa vue conserve les 203 entrées du catalogue, dont les 12 thèmes d'autres séries toujours masqués aux élèves de Série D ;
- une fiche est liée à un seul thème précis du catalogue et conserve sa version ;
- elle contient objectifs, synthèse, définitions, explications, exemples, extrait justificatif et provenance ;
- les niveaux autorisés sont `source pédagogique sélectionnée` et `source institutionnelle vérifiée` ; l'interface rappelle que ce classement engage l'administration ;
- les URL sont limitées à HTTP(S), les écritures exigent un en-tête d'intention et toutes les opérations de publication sont journalisées ;
- une règle de correction est un triplet littéral `expression repérée | correction | explication` : aucun motif exécutable n'est accepté ;
- le fournisseur `curated-corpus` utilise uniquement une fiche publiée rattachée au thème du bilan ; sinon il revient au mode `local-outline` ;
- chaque correction issue du corpus cite automatiquement la source de la fiche et reste soumise à la décision de l'élève ;
- un élève peut rechercher une fiche récemment publiée ou actualisée sans modifier son bilan original ; une nouvelle génération versionnée n'est créée que si le corpus a réellement changé ;
- les conflits d'édition administratifs sont bloqués par contrôle de version optimiste.

Le corpus est volontairement **vide par défaut** : le logiciel ne publie aucune connaissance inventée ou non approuvée. Son remplissage n'est plus un prérequis du MVP. Une fiche réelle pourra être ajoutée lorsqu'un professeur ou une source pédagogique vérifiable devient disponible. Un fournisseur externe pourra ensuite proposer des brouillons, mais leur publication dans le corpus restera une action administrative explicite.

## Cinquième incrément réalisé — carnet de révision durable

La plateforme fournit désormais une valeur utile même lorsque le corpus commun est vide :

- les 191 thèmes visibles deviennent une liste de contrôle privée pour chaque élève ;
- le suivi distingue un thème non commencé, des notes à structurer, un cours personnel prêt, une révision en cours et une notion déclarée maîtrisée ;
- les compteurs agrègent les bilans réellement enregistrés et les cours effectivement validés, sans déduire une connaissance que l'élève n'a pas déclarée ;
- après une révision, l'élève s'auto-évalue sur quatre niveaux : `difficult`, `fragile`, `comfortable` ou `mastered` ;
- le serveur propose un prochain rappel après 1, 3, 7 ou 21 jours. Ce rythme est déterministe, modifiable plus tard et ne constitue pas une note scolaire ;
- chaque auto-évaluation est ajoutée à un journal privé : l'historique n'est pas écrasé et un autre élève ne peut ni le lire ni le modifier ;
- l'élève peut conserver une courte note sur le point à reprendre lors de la prochaine séance ;
- les filtres montrent ce qui reste à commencer, les notes à structurer, les thèmes dus et ceux déclarés maîtrisés ;
- un thème permet de rouvrir directement le cours personnel ou les notes déjà collectées ;
- le tableau de bord choisit sa prochaine action à partir de la progression réelle et affiche l'horizon configurable `2027-07` ;
- la dernière vue de progression est mise en cache sur l'appareil personnel pour consultation hors ligne ;
- sur cet appareil, une auto-évaluation saisie sans réseau met immédiatement à jour l'aperçu local, rejoint l'outbox et est rejouée à la reconnexion ;
- chaque passage possède un UUID client et son heure d'exécution : le serveur traite les répétitions du même UUID de façon idempotente, sans dupliquer le journal ;
- un appareil déclaré partagé ne conserve ni cet aperçu privé ni une file locale.

La migration `0004_rainy_thing.sql` ajoute uniquement le journal des révisions. Aucune connaissance factuelle et aucune date précise d'examen ne sont inventées : juillet 2027 est un horizon de préparation configurable via `REVISION_TARGET_MONTH`.

## Validation finale

Le 17 octobre 2026, le porteur du projet a approuvé la recette responsive du carnet et le parcours de révision. Les contrôles automatisés couvrent en complément la confidentialité entre élèves, les thèmes masqués, la conservation de l'original, l'idempotence des passages, la saisie hors ligne et leur rejeu à la reconnexion. La Partie 5 est donc terminée ; l'ajout ultérieur de fiches communes vérifiées reste une amélioration continue non bloquante.

## Amélioration après validation — décisions administratives du catalogue

Le 19 octobre 2026, l'administrateur du pilote a déclaré avoir vérifié toutes les matières visibles et confirmé leur pertinence pour la Série D. Cette décision est enregistrée comme **validation pédagogique**, et non comme validation institutionnelle en l'absence de nouveau document officiel.

L'interface d'administration permet désormais une confirmation groupée ou une décision individuelle. Elle conserve séparément la mention originale de la source, la décision administrative, la justification, la date, l'auteur et une éventuelle URL officielle. Les douze entrées explicitement étiquetées pour d'autres séries restent masquées et ne sont pas concernées par la confirmation groupée.

## Décisions restant à valider pendant les incréments suivants

1. durée audio maximale, en complément de la limite actuelle de 10 Mo ;
2. plafond mensuel de traitement automatique après mesure sur le groupe pilote ;
3. choix ultérieur d'un fournisseur IA/recherche, sans enregistrer de clé dans le dépôt.
