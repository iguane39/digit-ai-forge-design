# Inventaire des écrans

Tous les écrans ci-dessous sont produits, sans exception. Quand l'entrant ne
fournit aucune matière pour l'un d'eux, il est produit sur un modèle générique du
secteur et **l'hypothèse est nommée** dans la note de partis pris.

## Socle

| # | Écran | Contenu minimal |
|---|---|---|
| 1 | Landing page | proposition de valeur, preuve, un moment signature, CTA |
| 2 | Connexion | e-mail/mot de passe + SSO (Google, Microsoft, Apple, Facebook selon pertinence), erreur, mot de passe oublié |
| 3 | Tableau de bord | 4–6 KPI, 2–3 graphiques, 2 listes courtes, chaque bloc menant à son écran |
| 4 | Liste + CRUD | tri, filtre et recherche **dans les en-têtes de colonne**, sélection tous/aucun, actions de masse, création, édition, suppression avec confirmation. La **création** prend l'un des deux motifs légitimes (TF-0707/TF-0708) : formulaire replié si elle est simple (≤ 4 champs, aucune branche exclusive), **panneau adressable** sur sa propre route dès qu'elle porte un choix exclusif, des étapes ou plus de 4 champs — un panneau de tâche ne coexiste jamais avec la liste qu'il alimente. Détail et balisage : `patterns-interaction.md` |
| 5 | Catalogue produits + fiche détail | grille, facettes, fiche riche avec médias et actions |
| 6 | Galerie média | au moins 3 dispositions : grille, mosaïque, table, plus une visionneuse |
| 7 | Bibliothèque de composants | palette, typographie, états, graphiques, cartographie, import/export, glisser-déposer, arborescence, module 3D |
| 8 | Onboarding | **expérience dominante de première connexion** (RC-4, 2ᵉ inspection utilisateur) : panneau de bienvenue en tête de page, progression visible x/N, badge persistant tant que non complété, actions directes depuis le panneau, disparition à complétion — une carte repliable discrète n'est PAS un onboarding |
| 9 | États système | vide, chargement, erreur, 404, accès refusé |
| 10 | Aide utilisateur | **trois niveaux** (RD-7, 2ᵉ inspection utilisateur) : aide de page (rôle de l'écran, circuit, pièges), encarts d'aide sur chaque section non évidente, aide par champ — une page d'aide unique ne suffit pas (implémentation de référence : macros `aide_de_page`/`aide-encart` de Produit-12 v0.2.2) |

**Tout écran porteur d'un formulaire** — connexion, CRUD, filtres, paramètres,
facturation, assistant multi-étapes — applique la grille **TYPÉ, PROPOSÉ, BORNÉ,
ATTEIGNABLE** à chacun de ses champs, et le critère de choix des deux motifs de
création à son panneau. Ces deux règles ne sont pas propres à l'écran 4 : elles valent
pour tous les formats de champ et tous les contextes (TF-0736, mandat de généralisation
explicite). Doctrine : `patterns-interaction.md` ; contrôles : `oracle-saisie` SA1–SA6
et `oracle-panneau-tache` PA1–PA6 (C16, C17 de `criteres-sortie.md`).

## Complémentaires

Administration des utilisateurs, rôles et droits, journal d'audit, profil et
préférences, statistiques d'usage, notifications, recherche globale en palette de
commandes, assistant multi-étapes, facturation, paramètres d'espace.

## Trois parcours de bout en bout — exactement trois

Au-delà des écrans, la maquette démontre **trois workflows complets**, cliquables
d'un bout à l'autre, nommés dans la restitution. Le nombre est fermé : sans borne,
la démonstration devient un puits sans fond ; en dessous de trois, elle ne prouve
pas que le produit tient.

Choisir les trois parcours qui portent la valeur du produit — typiquement : entrer
(inscription ou première connexion jusqu'au premier résultat utile), produire
(créer un objet métier jusqu'à sa publication ou sa validation), et décider
(partir d'un indicateur jusqu'à l'action qu'il déclenche).

Chaque parcours traverse au moins un état d'erreur ou un état vide. Un parcours
qui ne montre que le chemin heureux ne démontre rien.

## Cible mobile

Les écrans du socle sont tous rendus dans le châssis d'appareil, avec la navigation
mobile réelle (barre d'onglets basse ou drawer), pas le menu desktop compressé.
Détail : `cadre-mobile.md`.

## Navigation

Menu vertical, horizontal ou hybride selon la densité fonctionnelle réelle. Le
choix est **justifié en une phrase** dans la restitution — un menu vertical sur
six écrans est aussi faux qu'un menu horizontal sur quarante.

Repliable, état persisté, navigation clavier complète. En mobile : drawer ou
barre basse, jamais un menu desktop compressé.

**Bijection stricte menu ↔ écrans.** Si le menu annonce une entrée, l'écran
existe. Vérifié par `scripts/check_maquette.py`.

## Densité

Deux densités proposées (confortable, compact) sur les écrans de données. C'est
l'attente première des utilisateurs d'applications de gestion, et le premier
reproche fait aux refontes qui aèrent sans demander.
