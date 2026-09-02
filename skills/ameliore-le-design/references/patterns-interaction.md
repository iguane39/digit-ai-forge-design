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

**Un seul CTA visible par écran** (RD-6, 2ᵉ inspection utilisateur du premier produit —
rendre des doublons *fonctionnels* ne suffit pas, l'utilisateur les a re-signalés après le
premier correctif) : l'action principale n'a qu'**une occurrence visible à la fois** par
écran — dans l'état vide OU dans l'en-tête, jamais les deux ; le formulaire est replié par
défaut et sa soumission n'apparaît qu'une fois le formulaire ouvert. Test-garde côté produit :
au **texte visible rendu**, un libellé de CTA n'apparaît qu'une fois par écran
(implémentation de référence : `backend/tests/test_exigences_interface.py` de
Produit-12). La visibilité étant un état dynamique, C15 reste un contrôle de cibles — ce
test-garde est le contrôle de visibilité, à exiger au contrat du produit.

**La maquette n'invente pas d'affordance sans destination.** Un élément qui a
l'air cliquable sans écran, état ou réaction à montrer ne se construit pas comme
interactif : il se construit `disabled` (état documenté ci-dessous) ou ne se
construit pas du tout. Une affordance sans destination est un mensonge visuel que
le développement paiera en production.

Contrôle exécutable : `check_maquette.py` (C15) — élément interactif sans `href`
réel, `data-action` ni `type="submit"`, ou libellé dupliqué à cibles divergentes
sur un même écran. Contrat de sortie correspondant : `references/criteres-sortie.md`.

## Champs de saisie — TYPÉ, PROPOSÉ, BORNÉ, ATTEIGNABLE

Quatre volets, pour **tout** champ, quel que soit son format et son contexte
(TF-0736 et TF-0739, deux retours utilisateur en deux jours sur le même composant
d'un écran **livré et audité** : la campagne de tests le mesurait câblé, et il
l'était — le défaut n'était mesurable par aucun référentiel). Contrôle exécutable :
`oracle-saisie` (SA1–SA6).

**TYPÉ** — tout format connu prend son type d'entrée natif : `date`,
`datetime-local`, `month`, `week`, `time`, `email`, `tel`, `url`, `number`,
`password`, `color`. Un champ de date en `type="text"` est un défaut nommé, pas un
choix. Le natif est gratuit sur le budget de poids, accessible au clavier par
défaut, et correct hors connexion. Écart motivé : `data-type-motive="<raison>"`.

**PROPOSÉ** — la valeur par défaut est **la meilleure hypothèse du système**,
jamais un champ vide quand le système sait :

| Contexte | Valeur proposée |
|---|---|
| fin de période | aujourd'hui |
| début de période | dernière position connue de l'utilisateur ; à défaut, profondeur métier justifiée (1, 3 ou 6 mois) |
| port réseau | celui du protocole retenu (993 IMAPS, 587 SMTP submission…) |
| unité, devise, fuseau, langue | celle du contexte de l'utilisateur, jamais la première de la liste |
| champ unique d'un formulaire à une entrée | focus posé dessus au chargement |

Le vide qui a un **sens** se déclare : `data-vide-motive="<raison>"`. Un champ vide
non déclaré à côté d'un texte qui affiche la valeur que le système connaît déjà —
le défaut exact de TF-0736 — est le cas à ne jamais reproduire.

**BORNÉ** — les bornes `min`/`max` sont posées **par le sens** : une période ne
finit pas dans le futur, un port tient dans 1–65535, une date de naissance n'est
pas demain. Toute borne d'interface a sa **garde serveur symétrique** — l'interface
guide, elle ne protège pas. Borne absente pour une raison : `data-borne-motive`.

**ATTEIGNABLE** — la cible de geste d'un composant composite couvre **tout le
composant**, jamais une fraction de sa surface, et le mode de saisie alternatif
(clavier au moins) reste toujours ouvert. Le critère se mesure, il ne se juge pas :
une zone active plus petite que la surface visible est un défaut nommé. Sur un
`input type="date"` natif, seul le clic sur l'icône de bord — une vingtaine de
pixels — ouvre le sélecteur ; le corps du champ place un curseur de saisie. « Vu la
taille du composant, personne ne pense à cliquer tout à droite. » Le geste global se
pose une fois pour tout le fichier : voir le snippet de référence dans
`contrat-technique.md`. Interdits : `readonly` posé pour forcer le sélecteur,
`preventDefault()` sur `keydown` — Tab n'ouvre rien, Échap ferme, le champ reste
éditable.

**Toute promesse écrite dans l'aide est câblée dans le champ.** « La période part de
la dernière lecture » exige une `value` ; « jusqu'à aujourd'hui au plus tard » exige
un `max`. Une promesse non câblée n'existe pas (loi transverse n° 1) — c'est le
troisième défaut du même écran.

## Écrans de création — deux motifs légitimes, et le critère de choix

TF-0707 et TF-0708. Le motif « formulaire replié toujours présent » (`<details>`
sous la liste) était imposé partout par une exigence d'interface. Il est **bon**
quand le formulaire est court et unique ; il devient **nuisible** dès que le
formulaire porte des branches exclusives, car le repli **masque** la contradiction
au lieu de la résoudre — et le test a dû être assoupli pour laisser passer une
refonte qui corrigeait un vrai défaut d'ergonomie. Deux motifs, donc, et un critère.

| Motif | Quand | Forme |
|---|---|---|
| **Formulaire replié** | création **simple** : ≤ 4 champs, aucune branche exclusive, aucune étape | `<details>` + `data-cible`, sous la liste qu'il alimente |
| **Panneau adressable** | tâche à **branches**, à étapes, ou à plus de 4 champs | écran ou panneau sur sa propre route (`#…?nouveau=…`), **hors** de la liste |

Critère de choix, binaire : **le formulaire porte-t-il un choix exclusif ?** Oui →
panneau adressable. Non, et ≤ 4 champs → formulaire replié. Un doute se tranche vers
le panneau adressable : il est adressable, donc partageable et testable.

**Loi du panneau de tâche** — *un panneau de tâche ne coexiste pas avec la liste
qu'il alimente, et ne rend que les champs de la branche retenue ; un choix exclusif
se pose AVANT les champs qu'il commande, jamais au milieu d'un formulaire qui les
affiche déjà tous.*

Mauvais (l'écran de TF-0707, mal compris par son destinataire) : un encart replié
sous la liste des connexions affiche **en même temps** les champs des deux modes du
même flux — clé d'application, secret, code d'autorisation **et** jeton direct.
L'utilisateur en déduit une alternative entre « clé d'application » et « OAuth »
alors que la clé d'application **est** l'identifiant client du flux OAuth. La même
clé lui est demandée deux fois, et un seul libellé porte deux actions.

Bon : une route dédiée ; en tête du panneau, la question qui tranche (« comment ce
stockage vous autorise-t-il ? ») ; puis, et seulement puis, les champs de la branche
retenue. L'autre branche n'est pas rendue.

Balisage attendu, qui rend la règle mécanisable (`oracle-panneau-tache`, PA1–PA6) :

| Attribut | Sur quoi |
|---|---|
| `data-panneau-tache="<nom>"` | le panneau de création |
| `data-route="#…?nouveau=…"` | sa route, si panneau adressable — un déclencheur réel doit la pointer |
| `data-commande-branches` | le sélecteur exclusif (radios ou `select`), **placé avant** les branches |
| `data-branche="<valeur>"` | chaque groupe de champs d'une branche |
| `data-branche-active` | la seule branche rendue ; les autres sont `hidden` |

**Un renseignement n'est demandé qu'une fois par branche** : deux champs de même
`name`, ou deux étiquettes visibles identiques dans un même panneau, sont un défaut.

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
