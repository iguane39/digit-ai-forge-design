# Grille de notation

## Enchaînement d'oracles — avant toute lecture

```bash
node oracles/oracle-slop.mjs    <cible.html>
node oracles/oracle-tokens.mjs  <cible.html> [--tokens tokens.css]
node oracles/oracle-taste.mjs   <cible.html>          # TA1–TA4
node oracles/oracle-mobile.mjs  <cible.html>          # si cible mobile
node oracles/oracle-images.mjs  <cible.html>          # si visuels générés
node oracles/oracle-restitution.mjs <cible.html>      # si data-restitution (RL, TF-0235)
node oracles/oracle-saisie.mjs  <cible.html>          # SA1–SA6, si champs de saisie (TF-0736/0739)
node oracles/oracle-panneau-tache.mjs <cible.html>    # PA1–PA6, si panneau de création balisé (TF-0707/0708)
node oracles/oracle-surcouche.mjs <cible.html> [--tokens tokens.css]  # SC1–SC4, si dialog/popover/role=dialog (TF-0796)
node oracles/oracle-declencheurs.mjs <cible.html>     # DE1–DE3 + registre des déclencheurs (TF-0797)
python ~/.claude/skills/quality-oracles/scripts/oracle-a11y.py <cible.html>
python <…>/render_page.py <cible.html>                # V1–V7, 5 breakpoints × 2 thèmes
```

Chaque verdict JSON est conservé et joint au rapport. Un oracle qui n'a pas pu
tourner — Playwright absent, fichier non ouvrable, quota — donne `non_juge` sur sa
dimension, avec la raison. **Jamais un score estimé.**

## Barème par dimension

Chaque dimension est notée /5 selon le même barème :

| Note | Signification |
|---|---|
| 5 | aucun écart, et un choix remarquable qui sert le brief |
| 4 | aucun écart dur, écarts mineurs localisés |
| 3 | un écart dur, corrigeable sans toucher la structure |
| 2 | plusieurs écarts durs, ou un écart structurel |
| 1 | la dimension n'est pas traitée |
| — | `non_juge` : l'oracle n'a pas pu s'exécuter, raison citée |

Une note ne s'attribue qu'avec **au moins un constat cité** : verdict d'oracle,
ligne, valeur mesurée. Une dimension sans constat est `non_juge`, pas 3/5.

## Pondération

Toutes les dimensions ne pèsent pas pareil : ce chapitre dit combien vaut chacune
dans la note finale, et pourquoi. Il se lit ligne à ligne — la colonne « Poids »
donne la part de la note pondérée, la colonne « Pourquoi » la raison du réglage.
Les neutralisations (hors cible mobile, hors restitution) sont dites juste après
le tableau, elles ne se devinent pas depuis les poids.

| Dimension | Poids | Pourquoi |
|---|---|---|
| D1 Intention | 15 % | c'est ce qui distingue un design d'un gabarit |
| D2 Système | 10 % | sans tokens, rien ne survit à la deuxième page |
| D3 Hiérarchie | 15 % | le premier défaut perçu par un utilisateur |
| D4 Accessibilité | 20 % | plancher légal et éthique, non négociable |
| D5 Adaptation | 10 % | pondération réduite hors cible mobile |
| D6 Interaction | 10 % | ce qu'une capture ne montre jamais |
| D7 Contenu | 10 % | le plus sous-traité, le plus visible à l'usage |
| D8 Lecture de données | 10 % | un chiffre sans lecture n'informe pas — REFERENTIEL-RESTITUTION.md (TF-0235) |

Hors cible mobile, D5 est neutralisé et son poids est réparti sur D1 et D4.
Hors restitution (aucun `data-restitution` et aucune donnée chiffrée structurée),
D8 est neutralisé et son poids est réparti sur D1 et D7 — les poids redeviennent
ceux d'avant TF-0235. Sur une restitution, D8 s'instruit avec
`oracle-restitution` (RL-1/3/4/9/10) et les points de revue RL-2/6/7
(chapeaux de vues, effet des interactions, texte ancré constat → impact → action).

## Red flags — bloquants, indépendants du score

Un seul suffit à plafonner le verdict à **Refondre**, quel que soit le total. Le tableau
se lit ligne à ligne : la colonne « Red flag » énonce le fait refusé, la colonne
« Détection » nomme l'oracle et la règle qui le constatent — un red flag sans détection
nommée n'entre pas dans cette liste. L'ordre est celui de l'ancienneté, pas de la gravité :
tous plafonnent au même verdict. En sont exclus les écarts qui se rattrapent par une note :
ceux-là vivent dans les dimensions.


| # | Red flag | Détection |
|---|---|---|
| RF1 | Contraste sous 4.5:1 sur du texte courant, un thème ou l'autre | `oracle-tokens` T5 / `render_page.py` V2 |
| RF2 | Focus supprimé sans remplacement | `oracle-a11y` |
| RF3 | Règle dure d'`oracle-slop` déclenchée (S1 ou S2) | `oracle-slop` |
| RF4 | Zoom bridé (`user-scalable=no`) | `oracle-mobile` M1 |
| RF5 | Image chargée depuis le réseau dans un livrable annoncé autonome | `oracle-images` I4 |
| RF6 | Donnée chiffrée non marquée dans une maquette de démonstration | `oracle-claims` |
| RF7 | Visuel généré présenté comme photographie authentique | revue humaine |
| RF8 | Cible de geste plus petite que le composant, ou saisie clavier confisquée | `oracle-saisie` SA5 / SA6 |
| RF9 | Deux branches exclusives rendues en même temps, ou choix exclusif posé après les champs qu'il commande | `oracle-panneau-tache` PA1 / PA2 / PA3 |
| RF10 | Composant dynamique ou en sur-couche rendu par défaut du navigateur, ou `color-scheme` non déclaré par thème | `oracle-surcouche` SC1 / SC2 / SC4 |
| RF11 | Fonctionnalité dont l'unique accès est un bouton fantôme, action portée par un lien, ou navigation portée par un bouton | `oracle-declencheurs` DE1 / DE2 / DE3 |

Un red flag se **nomme**, il ne s'absorbe pas dans une moyenne.

RF8 et RF9 viennent de trois retours utilisateur en deux semaines sur des écrans
**livrés et audités** (Produit-12, TF-0707, TF-0736, TF-0739). Chacun de ces écrans
passait l'audit d'interface : l'affordance existait et elle était câblée. Ce qui
manquait — la valeur proposée, la borne, la surface de geste, l'ordre du choix — ne
figurait dans aucune grille. D6 Interaction s'instruit désormais avec `oracle-saisie`
(SA1–SA6) et `oracle-panneau-tache` (PA1–PA6) ; une dimension D6 notée sans avoir
lancé ces deux-là, sur une page qui porte des champs ou un panneau, est `non_juge`.

RF10 vient du même genre de fait, un cran plus tard dans la chaîne (TF-0796, produit 02,
01/09/2026) : une fenêtre `dialog` **PASS** à sa campagne s'est affichée en boîte sombre aux
boutons natifs sur le poste de l'utilisateur, parce que la grille juge ce que la page dessine
et jamais ce que le navigateur dessine à sa place. D2 Système s'instruit désormais avec
`oracle-surcouche` (SC1–SC4) dès que la page porte un `<dialog>`, un `[popover]` ou un
`role="dialog"` — dans son DOM statique **ou** dans ses gabarits ; sans cet oracle, la
dimension est `non_juge` sur une telle page. Le volet complet, avec le fait qui le fonde :
`critique-implementation.md`, contrôle 7.

RF11 est le prix de deux tours de retour sur une même fonctionnalité, en deux jours
(TF-0797, 31/08 puis 01/09/2026) : « je ne vois pas de changement », puis « mets-le sous
forme de bouton, pas de lien — le lien a une signification particulière, tout comme le
bouton a la sienne ». Le **registre des déclencheurs** (une action se déclenche par un
bouton · une navigation se fait par un lien · un fantôme est une action secondaire, jamais
l'unique accès) est énoncé dans `patterns-interaction.md` et mesuré par
`oracle-declencheurs`. Le critère est la **liste des points d'entrée de la page, chacun
avec sa nature** : l'oracle la rend dans le champ `registre` de son JSON, en maquette comme
à l'implémentation. Une dimension D3 Hiérarchie notée sans cette liste, sur une page qui
porte des déclencheurs, est `non_juge` — l'accès à une fonctionnalité est de la hiérarchie,
pas du détail.

## Règle de verdict

Le verdict ne se choisit pas : il se lit dans le tableau ci-dessous, à partir de la
note pondérée et du relevé de red flags. Chaque ligne porte une condition
entièrement vérifiable — aucune ne dépend d'une impression.

| Verdict | Condition |
|---|---|
| **Livrer** | ≥ 4/5 pondéré · zéro red flag · zéro dimension à 1 ou 2 |
| **Renforcer** | ≥ 3/5 pondéré · zéro red flag |
| **Refondre** | < 3/5 pondéré **ou** au moins un red flag |

Le verdict est calculé, pas ressenti. Si le calcul donne Refondre et que
l'impression dit Livrer, c'est le calcul qui gagne — ou la grille est fausse, et
c'est elle qu'il faut corriger, pas le verdict.

## Points de revue de lecture — aucun oracle ne les tranche

Deux exigences importées du skill tiers `taste-skill` (MIT, consulté le 14/08/2026)
ne sont **pas** mécanisables : elles exigent une mesure de rendu et l'identification
d'une zone, que seule la lecture apporte. Elles se vérifient à l'œil, capture à
l'appui, au premier écran de bureau — et se **citent** au rapport comme constats,
au même titre qu'un verdict d'oracle :

| Point | À vérifier |
|---|---|
| **R1 — hero dans la fenêtre initiale** | titre ≤ 2 lignes · sous-texte ≤ 20 mots et ≤ 4 lignes · action principale visible sans défiler · pas de marge haute excessive |
| **R2 — navigation sur une ligne au bureau** | aucun retour à la ligne · hauteur ≤ 80 px · aucun libellé de bouton replié |

Détail, citations amont et règles écartées : `oracles/regles-importees-taste-skill.md`.
Les avertissements TA1 (familles d'accent) et TA2 (saturation) d'`oracle-taste` sont
des **mesures**, pas des verdicts : ils appellent une lecture, ils ne la remplacent pas.

## Ce que la grille ne juge pas

L'adéquation au goût du commanditaire. La justesse stratégique du produit. Le coût
de construction. La performance réelle sous charge. Ces quatre-là sont déclarés en
tête du rapport, jamais dissimulés dans une note.
