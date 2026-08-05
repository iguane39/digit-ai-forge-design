# Patterns d'interaction

Le catalogue ADR de référence est le **plancher**, pas la cible : données en
constante JS, rendu dynamique, filtres, zéro dépendance. Le dépassement attendu
porte sur l'interaction.

## Un CTA = une cible

Retour de production RD-4 : une maquette montrait le même CTA « Créer un dossier »
en en-tête, en état vide et dans un formulaire ; le développement les a repris sans
les câbler, faute de savoir lesquels pointaient la même action. L'utilisateur a
trouvé des boutons inertes en production. Loi générique : **toute affordance
montrée par la maquette est une promesse que le développement devra tenir** — la
maquette doit rendre chaque promesse identifiable et câblable.

Tout élément interactif (bouton, lien, puce cliquable) porte une **cible explicite
et nommée**, sous l'une de ces trois formes :

- **ancre interne réelle** : `href="#route"` qui existe dans la table de routage —
  jamais `href="#"` seul ni `javascript:void(0)`, qui ne sont pas des destinations ;
- **action nommée** : `data-action="<verbe-objet>"` (ex. `data-action="creer-dossier"`,
  `data-action="marquer-lu"`) — convention obligatoire dès qu'il n'y a pas de route
  à câbler dessus ;
- **soumission de formulaire** : `type="submit"` dans un `<form>`.

**Même libellé, même écran ⇒ même cible.** Un CTA « Créer un dossier » répété en
en-tête, état vide et formulaire porte la **même** valeur de `data-action` ou le
même `href` partout sur cet écran. Deux occurrences du même libellé avec des cibles
différentes sont soit une incohérence à corriger, soit deux actions distinctes qui
doivent porter des libellés distincts — jamais les deux à la fois en silence.

**La maquette n'invente pas d'affordance sans destination.** Un élément qui a
l'air cliquable sans écran, état ou réaction à montrer ne se construit pas comme
interactif : il se construit `disabled` (état documenté ci-dessous) ou ne se
construit pas du tout. Une affordance sans destination est un mensonge visuel que
le développement paiera en production.

Contrôle exécutable : `check_maquette.py` (C15) — élément interactif sans `href`
réel, `data-action` ni `type="submit"`, ou libellé dupliqué à cibles divergentes
sur un même écran. Contrat de sortie correspondant : `references/criteres-sortie.md`.

## Tables de données

Attendu sur au moins une table de la maquette, en fonctionnement réel :

- tri multi-colonnes, indicateur de rang de tri visible ;
- filtre **dans l'en-tête de colonne**, typé selon la donnée : texte, énumération
  à cases, intervalle numérique, plage de dates ;
- recherche globale et recherche par colonne ;
- sélection tous / aucun / inverse, avec compteur et actions de masse ;
- colonnes masquables et réordonnables ;
- densité confortable / compact ;
- pagination ou défilement virtualisé au-delà de 500 lignes ;
- export CSV construit depuis la vue courante, pas depuis le jeu complet ;
- état de la vue (tri, filtres, colonnes) porté par l'URL et donc partageable.

## États des composants

Chaque composant de la bibliothèque est montré **en fonctionnement**, avec ses
états : repos, survol, focus, actif, désactivé, chargement, erreur, vide. Une
capture morte ne démontre rien et se voit immédiatement.

## Accessibilité — plancher non négociable

- contraste ≥ 4.5:1 sur le texte, ≥ 3:1 sur les éléments d'interface, **sur les
  deux thèmes** ;
- focus visible partout, jamais supprimé sans remplacement ;
- navigation clavier complète, y compris tri de colonne, arborescence, boîtes de
  dialogue (piège de focus) et bulles d'onboarding ;
- sémantique conforme aux *ARIA Authoring Practices* pour tout composant custom —
  c'est le seul référentiel qui donne le contrat clavier attendu ;
- lien d'évitement, libellés associés aux champs, hiérarchie de titres continue.

## Onboarding

Bulles ancrées à un élément réel, ordonnées, avec suivant, précédent, passer et
rejouer. Chaque bulle dit **ce que la personne peut faire ici**, pas ce que le
composant est. Un onboarding qui décrit l'interface au lieu de la tâche est un
onboarding raté.

## Écriture d'interface

Verbes actifs, vocabulaire de l'utilisateur et non du système, un libellé
constant d'un bout à l'autre du parcours (le bouton « Publier » produit
« Publié »). Les erreurs disent ce qui s'est passé et comment le réparer. Un
écran vide est une invitation à agir, pas un constat de vide.
