# Revue d'implémentation — gabarit de page « plan d'amélioration » — 20261012a

TF-1236, campagne du 12/10/2026 (mandat humain du 22/09/2026 sur les huit rangs, rang 1). Mode
aval de `critique-le-design` (`skills/critique-le-design/references/critique-implementation.md`)
et contrôle de généricité, joués sur la page que rend le skill `plan-d-amelioration` de
digit-ai-forge-agents (TF-1234, `scripts/rendre.mjs`, commit `b949e8d` de la branche
`camp1012b-fa5`).

## Verdict

**Livrer.** Le gabarit passe tous les oracles applicables de la forge, rendu réel compris, dans les
deux thèmes et dans les cinq états de la matrice. Les six défauts que la revue a trouvés ont été
corrigés dans le générateur avant son premier enregistrement. Il reste trois constats du socle,
hors de ce gabarit.

**Instance jugée** : `Forge Design - Page-Temoin Plan d amelioration - 20261012a.html`, à côté de ce
fichier, rendue depuis `fixtures/plan-vert.json` du skill (neuf fiches, treize domaines, un audit
d'essai). **Ce n'est pas l'instance réelle que l'item demandait** : la première mission n'a jamais
été jouée. La revue se rejoue sur l'instance de cette mission quand elle existera.

## Relevé d'oracles (exécutés le 12/10/2026, 21:10 à 21:14)

Le tableau donne le verdict de chaque contrôle sur la page témoin ; la dernière colonne dit ce que
portent ses avertissements.

| Contrôle | Commande | Verdict | Avertissements |
|---|---|---|---|
| Point d'entrée de la forge | `node oracles/run-oracles-design.mjs <page> --rendu` | PASS, exit 0 | voir lignes suivantes |
| Généricité (marqueurs de slop) | `oracle-slop` | PASS, 0 dur, 0 avertissement | — |
| Goût (préférences amont) | `oracle-taste` | PASS, 0 dur | 7, tous portés par les jetons du socle (saturation des accents, cinq familles de statuts) |
| Jetons | `oracle-tokens` | PASS, 0 dur | 6, paires présumées du socle (`--ink` sur `--muted`, `--line` sur `--bg`) |
| Mouvement | `oracle-motion` | PASS, 0 dur | 1 : durée de bascule du chevron en dur, faute de jeton de mouvement au socle |
| Bascule de thème, saisie, déclencheurs, accessibilité | `oracle-bascule`, `oracle-saisie`, `oracle-declencheurs`, `oracle-a11y` | PASS, 0 avertissement | — |
| Rendu réel, clair et sombre | `render_page` via le point d'entrée, 7 largeurs | PASS, 0 dur | 80 V7 (rythme des cartes de décision, qui suit la longueur des réponses) ; contraste des pastilles non mesurable par styles calculés |
| États ouverts | `render_page.py <page> --matrice-etats` | PASS, 5 états sur 5 | tout déplié (9 détails sur 9), filtre première et dernière colonne, filtre sans résultat, recherche sans correspondance |
| Socle | `check_html.py`, `oracle-filtres-tableau` | PASS | L6 : deux navigations, sommaire annoté et barre permanente, admis par TF-1145 |
| Composants du socle | passe d'imputation | sceau vérifié sur 4 composants, 0 constat | — |

Sans objet, et dit par le point d'entrée : `oracle-mobile` (document, pas d'application mobile),
`oracle-images`, `oracle-panneau-tache`, `oracle-surcouche`, `oracle-perceptibilite`.

## Écarts à la promesse, trouvés et corrigés avant enregistrement

Chaque écart est au format de retour du mode aval. Tous ont été corrigés dans `scripts/rendre.mjs`
de forge-agents, puis rejugés verts.

```yaml
- ecart: rendu
  ancrage: chapitre 2, colonne Couverture ; chapitre 3, statut des chiffres ; tous breakpoints, thème clair
  attendu: trois états de badge distinguables (render_page V16)
  constate: fonds --green-fill, --teal-fill, --amber-fill, Delta-E 2,9 à 9,5, écart de luminance ≤ 0,012
  gravite: bloquant
  correction: fond partagé --surface, état porté par le libellé et la puce pleine
- ecart: rendu
  ancrage: barre de navigation permanente, 390 px
  attendu: aucun débordement horizontal (V1)
  constate: huit titres longs sur une ligne défilante, bord droit à 1 698 px
  gravite: bloquant
  correction: libellés courts numérotés (« 1. Décisions »…), barre qui passe à la ligne
- ecart: rendu
  ancrage: légendes des chapitres 2 et 3, phrase des remédiations sans lien, 2 560 et 3 840 px
  attendu: au plus 135 caractères par ligne (V18)
  constate: 163 à 218 caractères par ligne, paragraphes à pleine largeur
  gravite: bloquant
  correction: paragraphes placés dans un conteneur de lecture .chap.lire
- ecart: rendu
  ancrage: badges de couverture et de statut, jonction (colonne « Note »)
  attendu: toute valeur porte une légende visible (L3)
  constate: badges sans légende ; colonne « Note » lue comme une colonne calculée sans formule
  gravite: bloquant
  correction: légendes visibles liées par aria-describedby ; colonne renommée « Commentaire »
- ecart: voix
  ancrage: colonne Effort, détail des fiches
  attendu: français correct
  constate: « durée court », « durée moyen » (accord avec la donnée brute)
  gravite: majeur
  correction: libellés accordés (courte, moyenne, longue) à l'affichage, la donnée garde court | moyen | long
- ecart: rendu
  ancrage: cartes de décision, 1 920 px
  attendu: étiquette lisible d'un tenant
  constate: grille à deux colonnes dans une carte de 320 px, « Ce qu'elle coûte » coupé sur deux lignes
  gravite: mineur
  correction: étiquette au-dessus de sa valeur dans les cartes ; espacement des options resserré
```

Les chapitres sans `.contenu` (L30) et les tableaux de plus de huit lignes sans exemple de lecture
(L10) ont été traités au même passage.

## Constats hors de ce gabarit, au compte du socle `digit-ai-page-html`

- **M3 sous `--mobile`** : `oracle-mobile` forcé rend un écart majeur sur toute page dérivée du
  gabarit du socle, par la règle `header.doc.colle { position: sticky; top: 0 }` de
  `boilerplate.html`, présente même quand la page n'emploie pas la classe. Rapproché de TF-1322.
- **Surlignage de recherche dans les panneaux de filtre** : avec une recherche active,
  `find-in-page.js` pose ses marques dans les libellés des panneaux de `table-filters.js` ; les mots
  se cassent en morceaux dans le panneau ouvert (capture à 1 920 px, colonne Domaine).
- **Commentaire d'usage lu comme chargement** : le bloc scellé de `find-in-page.js` cite
  `<script src="find-in-page.js">` dans son commentaire ; `oracle-filtres-tableau` le déclare
  « asset externe illisible » à son non-jugé.
- **Alignement** : le conteneur de lecture centré (1 080 px) décroche du titre de chapitre et des
  tableaux alignés à gauche. L'aligner à gauche est refusé par L2 de `render_page.py`. C'est un
  arbitrage du socle, pas de ce gabarit.

## Ce qui n'a pas été jugé

- Une instance **réelle** : la page témoin est rendue depuis une fixture fictive.
- La pertinence des chapitres pour un décideur : jugement humain, à la première remise.
- La trajectoire est rendue en trois colonnes de lots, pas en schéma de flux temporel
  (`digit-ai-schemas`) comme l'étude du 19/09 l'envisageait. L'écart est déclaré au rapport de
  campagne.
- Pas de baseline approuvée : `oracle-baseline` attend une capture validée par un humain.
